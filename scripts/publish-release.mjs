#!/usr/bin/env node
/**
 * After electron-builder finishes, scan release/ for installers and
 * optionally upload them to S3 + register a Version on the API.
 *
 * Usage:
 *   node scripts/publish-release.mjs
 *   node scripts/publish-release.mjs --yes
 *   npm run publish:release
 *
 * Env:
 *   SERVER_API_BASE_URL
 *   PUBLISH_RELEASE=1   (same as --yes when non-interactive)
 *   RELEASE_VERSION     (optional override of package.json version)
 *   RELEASE_TYPE        (stable | beta | alpha; default stable)
 *   RELEASE_NOTES       (comma-separated notes)
 *   RELEASE_PUBLISH     (true|false; mark isPublished; default true)
 */

import { createHash } from 'node:crypto'
import { createReadStream, existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { extname, join, resolve } from 'node:path'
import { createInterface } from 'node:readline'
import { fileURLToPath } from 'node:url'
import axios from 'axios'

const __dirname = fileURLToPath(new URL('.', import.meta.url))
const ROOT = resolve(__dirname, '..')
/** Single output folder — must match build/electron-builder.config.js directories.output */
const RELEASE_DIR = resolve(ROOT, 'release')
const PACKAGE_JSON = resolve(ROOT, 'package.json')
/** Skip tiny placeholders / broken outputs (real installers are tens of MB). */
const MIN_INSTALLER_BYTES = 1024 * 1024

const INSTALLER_EXTENSIONS = new Set([
  '.exe',
  '.msi',
  '.dmg',
  '.pkg',
  '.appimage',
  '.deb',
  '.rpm',
  '.zip'
])

const CONTENT_TYPES = {
  '.exe': 'application/vnd.microsoft.portable-executable',
  '.msi': 'application/x-msi',
  '.dmg': 'application/x-apple-diskimage',
  '.pkg': 'application/octet-stream',
  '.appimage': 'application/octet-stream',
  '.deb': 'application/vnd.debian.binary-package',
  '.rpm': 'application/x-rpm',
  '.zip': 'application/zip'
}

/** @typedef {'windows'|'macos'|'linux'} Platform */
/** @typedef {'x64'|'arm64'} Architecture */
/** @typedef {'exe'|'msi'|'dmg'|'pkg'|'appimage'|'deb'|'rpm'|'zip'} InstallerType */

/**
 * @typedef {object} LocalArtifact
 * @property {string} filePath
 * @property {string} fileName
 * @property {number} fileSize
 * @property {Platform} platform
 * @property {Architecture} architecture
 * @property {InstallerType} installerType
 * @property {string} contentType
 */

function loadDotEnv() {
  const envPath = resolve(ROOT, '.env')
  if (!existsSync(envPath)) return

  const text = readFileSync(envPath, 'utf8')
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq <= 0) continue
    const key = trimmed.slice(0, eq).trim()
    let value = trimmed.slice(eq + 1).trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    if (process.env[key] === undefined) {
      process.env[key] = value
    }
  }
}

function resolveApiBaseUrl() {
  const raw = process.env.SERVER_API_BASE_URL || 'http://localhost:5000/api/v1'
  return raw.replace(/\/$/, '')
}

function readPackageVersion() {
  const pkg = JSON.parse(readFileSync(PACKAGE_JSON, 'utf8'))
  return String(pkg.version || '1.0.0')
}

/**
 * @param {string} fileName
 * @returns {Omit<LocalArtifact, 'filePath'|'fileSize'|'contentType'> | null}
 */
function parseArtifactName(fileName) {
  const ext = extname(fileName).toLowerCase()
  if (!INSTALLER_EXTENSIONS.has(ext)) return null

  const lower = fileName.toLowerCase()

  // Ignore electron-builder helpers / side artifacts
  if (
    lower.startsWith('__uninstaller') ||
    lower.includes('blockmap') ||
    lower === 'latest.yml' ||
    lower.endsWith('.yml') ||
    lower.endsWith('.yaml')
  ) {
    return null
  }

  const installerType = /** @type {InstallerType} */ (ext.replace('.', '').toLowerCase())

  /** @type {Platform | null} */
  let platform = null
  if (lower.includes('-win-') || lower.includes('_win_') || lower.includes('-windows-')) {
    platform = 'windows'
  } else if (lower.includes('-mac-') || lower.includes('_mac_') || lower.includes('-darwin-')) {
    platform = 'macos'
  } else if (lower.includes('-linux-') || lower.includes('_linux_')) {
    platform = 'linux'
  } else if (ext === '.dmg' || ext === '.pkg') {
    platform = 'macos'
  } else if (ext === '.appimage' || ext === '.deb' || ext === '.rpm') {
    platform = 'linux'
  } else if (ext === '.msi') {
    platform = 'windows'
  }

  // Do not treat bare *.exe as a release (avoids elevate.exe / helpers)
  if (!platform) return null

  /** @type {Architecture} */
  let architecture = 'x64'
  if (lower.includes('arm64') || lower.includes('aarch64')) {
    architecture = 'arm64'
  } else if (lower.includes('x64') || lower.includes('amd64') || lower.includes('x86_64')) {
    architecture = 'x64'
  }

  return {
    fileName,
    platform,
    architecture,
    installerType
  }
}

/**
 * @returns {{ artifacts: LocalArtifact[], scannedDirs: string[], listedFiles: string[] }}
 */
function discoverArtifacts() {
  /** @type {LocalArtifact[]} */
  const artifacts = []
  /** @type {string[]} */
  const scannedDirs = []
  /** @type {string[]} */
  const listedFiles = []

  if (!existsSync(RELEASE_DIR)) {
    return { artifacts, scannedDirs, listedFiles }
  }

  let dirStat
  try {
    dirStat = statSync(RELEASE_DIR)
  } catch {
    return { artifacts, scannedDirs, listedFiles }
  }

  if (!dirStat.isDirectory()) {
    throw new Error(
      `Expected a directory at ${RELEASE_DIR}, but found a file. Delete it and rebuild so electron-builder can create release/.`,
    )
  }

  scannedDirs.push(RELEASE_DIR)

  for (const entry of readdirSync(RELEASE_DIR)) {
    const filePath = join(RELEASE_DIR, entry)
    let st
    try {
      st = statSync(filePath)
    } catch {
      continue
    }
    if (!st.isFile()) continue

    listedFiles.push(`${filePath} (${st.size} bytes)`)

    const parsed = parseArtifactName(entry)
    if (!parsed) continue
    if (st.size < MIN_INSTALLER_BYTES) continue

    artifacts.push({
      ...parsed,
      filePath,
      fileSize: st.size,
      contentType: CONTENT_TYPES[extname(entry).toLowerCase()] || 'application/octet-stream'
    })
  }

  return {
    artifacts: artifacts.sort((a, b) => a.fileName.localeCompare(b.fileName)),
    scannedDirs,
    listedFiles
  }
}

/**
 * @param {string} filePath
 */
async function sha256File(filePath) {
  const hash = createHash('sha256')
  const stream = createReadStream(filePath)
  for await (const chunk of stream) {
    hash.update(chunk)
  }
  return hash.digest('hex')
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function createPrompt() {
  const rl = createInterface({ input: process.stdin, output: process.stdout })
  const ask = (question) =>
    new Promise((resolveAsk) => {
      rl.question(question, (answer) => resolveAsk(answer.trim()))
    })
  return {
    ask,
    close: () => rl.close()
  }
}

/**
 * @param {boolean} autoYes
 * @param {boolean} canPrompt
 * @param {ReturnType<typeof createPrompt> | null} prompt
 * @param {string} question
 * @param {boolean} defaultYes
 */
async function confirm(autoYes, canPrompt, prompt, question, defaultYes = true) {
  if (autoYes) return true
  if (!canPrompt || !prompt) return false

  const hint = defaultYes ? 'Y/n' : 'y/N'
  const answer = (await prompt.ask(`${question} [${hint}] `)).toLowerCase()
  if (!answer) return defaultYes
  return answer === 'y' || answer === 'yes'
}

/**
 * @param {boolean} autoYes
 * @param {boolean} canPrompt
 * @param {ReturnType<typeof createPrompt> | null} prompt
 * @param {string} question
 * @param {string} defaultValue
 */
async function askValue(autoYes, canPrompt, prompt, question, defaultValue) {
  if (autoYes || !canPrompt || !prompt) return defaultValue
  const answer = await prompt.ask(`${question} [${defaultValue}] `)
  return answer || defaultValue
}

/**
 * @param {string} apiBase
 * @param {LocalArtifact} artifact
 * @param {string} version
 */
async function uploadArtifact(apiBase, artifact, version) {
  const prefix = `releases/${version}/${artifact.platform}`

  const presignRes = await axios.post(
    `${apiBase}/uploads/presign`,
    {
      fileName: artifact.fileName,
      contentType: artifact.contentType,
      prefix
    },
    { timeout: 30_000 }
  )

  const presign = presignRes.data?.data
  if (!presign?.uploadUrl || !presign?.storageUrl) {
    throw new Error(`Presign failed for ${artifact.fileName}`)
  }

  process.stdout.write(`  ↑ Uploading ${artifact.fileName} (${formatBytes(artifact.fileSize)})... `)

  await axios.put(presign.uploadUrl, createReadStream(artifact.filePath), {
    headers: {
      'Content-Type': presign.contentType || artifact.contentType,
      'Content-Length': artifact.fileSize
    },
    maxBodyLength: Infinity,
    maxContentLength: Infinity,
    timeout: 0
  })

  const checksum = await sha256File(artifact.filePath)
  console.log('done')

  return {
    platform: artifact.platform,
    architecture: artifact.architecture,
    installerType: artifact.installerType,
    fileName: artifact.fileName,
    fileSize: artifact.fileSize,
    checksum,
    storageUrl: presign.storageUrl
  }
}

async function fetchNextBuildNumber(apiBase) {
  try {
    const res = await axios.get(`${apiBase}/versions/next-build-number`, { timeout: 15_000 })
    return Number(res.data?.data?.buildNumber) || 1
  } catch {
    return 1
  }
}

async function versionExists(apiBase, version) {
  try {
    await axios.get(`${apiBase}/versions/${encodeURIComponent(version)}`, { timeout: 15_000 })
    return true
  } catch (err) {
    if (axios.isAxiosError(err) && err.response?.status === 404) return false
    throw err
  }
}

async function main() {
  loadDotEnv()

  const args = new Set(process.argv.slice(2))
  const autoYes =
    args.has('--yes') ||
    args.has('-y') ||
    process.env.PUBLISH_RELEASE === '1' ||
    process.env.PUBLISH_RELEASE === 'true'

  const canPrompt = Boolean(process.stdin.isTTY && process.stdout.isTTY)
  const apiBase = resolveApiBaseUrl()
  const packageVersion = readPackageVersion()

  console.log('')
  console.log('EDA Cleaner — release publisher')
  console.log(`  Release dir : ${RELEASE_DIR}`)
  console.log(`  API         : ${apiBase}`)
  console.log('')

  const { artifacts, scannedDirs, listedFiles } = discoverArtifacts()

  if (artifacts.length === 0) {
    console.log('No installer artifacts found.')
    if (scannedDirs.length === 0) {
      console.log('  (release/ does not exist yet)')
    } else {
      console.log(`  Scanned: ${scannedDirs.join(', ')}`)
      if (listedFiles.length === 0) {
        console.log('  Folder is empty (installer may have been removed by antivirus).')
      } else {
        console.log('  Files present but none matched as release installers:')
        for (const line of listedFiles) console.log(`    - ${line}`)
      }
    }
    console.log('')
    console.log('Build first with: npm run build:win | build:mac | build:linux')
    console.log('Then confirm the installer exists, e.g.:')
    console.log('  dir release')
    process.exit(0)
  }

  console.log(`Found ${artifacts.length} installer(s):`)
  for (const item of artifacts) {
    console.log(
      `  • ${item.fileName}  [${item.platform}/${item.architecture}/${item.installerType}]  ${formatBytes(item.fileSize)}`
    )
  }
  console.log('')

  const prompt = canPrompt && !autoYes ? createPrompt() : null

  try {
    const shouldUpload = await confirm(
      autoYes,
      canPrompt,
      prompt,
      'Upload to cloud and create/update version?',
      true
    )

    if (!shouldUpload) {
      console.log('Skipped cloud publish.')
      process.exit(0)
    }

    const envVersion = process.env.RELEASE_VERSION?.trim()
    const version = await askValue(
      autoYes,
      canPrompt,
      prompt,
      'Version',
      envVersion || packageVersion
    )

    const suggestedBuild = await fetchNextBuildNumber(apiBase)
    const envBuild = process.env.RELEASE_BUILD_NUMBER?.trim()
    const buildNumberRaw = await askValue(
      autoYes,
      canPrompt,
      prompt,
      'Build number',
      envBuild || String(suggestedBuild)
    )
    const buildNumber = Number(buildNumberRaw)
    if (!Number.isInteger(buildNumber) || buildNumber < 1) {
      throw new Error('Invalid build number')
    }

    const envReleaseType = process.env.RELEASE_TYPE?.trim().toLowerCase()
    const releaseType = (
      await askValue(
        autoYes,
        canPrompt,
        prompt,
        'Release type (stable|beta|alpha)',
        envReleaseType || 'stable'
      )
    ).toLowerCase()
    if (!['stable', 'beta', 'alpha'].includes(releaseType)) {
      throw new Error('Invalid release type')
    }

    const notesRaw = await askValue(
      autoYes,
      canPrompt,
      prompt,
      'Release notes (comma-separated, optional)',
      process.env.RELEASE_NOTES?.trim() || ''
    )
    const releaseNotes = notesRaw
      ? notesRaw
          .split(',')
          .map((n) => n.trim())
          .filter(Boolean)
      : []

    const envPublish = process.env.RELEASE_PUBLISH
    const defaultPublish =
      envPublish === undefined || envPublish === ''
        ? true
        : envPublish === '1' || envPublish === 'true'
    const publishYes = await confirm(
      autoYes,
      canPrompt,
      prompt,
      'Mark as published (isPublished=true)?',
      defaultPublish
    )

    console.log('')
    console.log('Uploading installers...')

    /** @type {object[]} */
    const files = []
    for (const artifact of artifacts) {
      const uploaded = await uploadArtifact(apiBase, artifact, version)
      files.push({
        ...uploaded,
        latest: publishYes
      })
    }

    // Parallel CI jobs (win/mac/linux) may race on first create — retry as append on conflict.
    const exists = await versionExists(apiBase, version)

    if (exists) {
      console.log(`Version ${version} already exists — appending/updating files...`)
      const res = await axios.post(
        `${apiBase}/versions/${encodeURIComponent(version)}/files`,
        {
          files,
          markLatest: publishYes
        },
        { timeout: 30_000 }
      )
      console.log('')
      console.log(`Updated version ${version}`)
      console.log(`  files : ${res.data?.data?.files?.length ?? files.length}`)
    } else {
      console.log(`Creating version ${version}...`)
      try {
        const res = await axios.post(
          `${apiBase}/versions`,
          {
            version,
            buildNumber,
            releaseType,
            isPublished: publishYes,
            releaseNotes,
            files
          },
          { timeout: 30_000 }
        )
        console.log('')
        console.log(`Created version ${res.data?.data?.version ?? version}`)
        console.log(`  build  : ${buildNumber}`)
        console.log(`  type   : ${releaseType}`)
        console.log(`  files  : ${files.length}`)
        console.log(`  published: ${publishYes}`)
      } catch (err) {
        const status = axios.isAxiosError(err) ? err.response?.status : undefined
        if (status !== 409 && status !== 400) throw err

        console.log(
          `Version ${version} was created by another job — appending files instead...`
        )
        const res = await axios.post(
          `${apiBase}/versions/${encodeURIComponent(version)}/files`,
          {
            files,
            markLatest: publishYes
          },
          { timeout: 30_000 }
        )
        console.log('')
        console.log(`Updated version ${version}`)
        console.log(`  files : ${res.data?.data?.files?.length ?? files.length}`)
      }
    }

    console.log('')
    console.log('Done.')
  } finally {
    prompt?.close()
  }
}

main().catch((err) => {
  console.error('')
  console.error('Publish failed:', err instanceof Error ? err.message : err)
  if (axios.isAxiosError(err) && err.response?.data) {
    console.error(JSON.stringify(err.response.data, null, 2))
  }
  process.exit(1)
})
