import { app, shell } from 'electron'
import { createHash } from 'crypto'
import { createReadStream } from 'fs'
import { access, lstat, readdir, stat } from 'fs/promises'
import { basename, join, normalize, resolve, sep } from 'path'
import { fdir } from 'fdir'
import checkDiskSpaceImport from 'check-disk-space'
import type {
  DeleteFilesResult,
  DriveInfo,
  DuplicateGroup,
  FindDuplicatesOptions,
  FindLargeFilesOptions,
  LargeFile,
  StorageSegment,
  StorageUsageResult
} from '@shared/interfaces'

type CheckDiskSpaceFn = (directoryPath: string) => Promise<{
  diskPath: string
  free: number
  size: number
}>

const checkDiskSpace: CheckDiskSpaceFn =
  typeof checkDiskSpaceImport === 'function'
    ? (checkDiskSpaceImport as CheckDiskSpaceFn)
    : (checkDiskSpaceImport as unknown as { default: CheckDiskSpaceFn }).default

const COMMON_SKIP_DIRS = [
  'node_modules',
  '.git',
  '.cache',
  'cache',
  'caches',
  'temp',
  'tmp',
  '.npm',
  '.pnpm-store',
  '.yarn'
] as const

const PLATFORM_SKIP_DIRS: Record<NodeJS.Platform, string[]> = {
  win32: [
    '$recycle.bin',
    'system volume information',
    'recovery',
    'perflogs',
    '$winreagent',
    'windows',
    'winsxs',
    'programdata'
  ],
  darwin: [
    '.trash',
    '.trashes',
    '.spotlight-v100',
    '.fseventsd',
    '.documentrevisions-v100',
    '.temporaryitems',
    '.vol',
    'library',
    'containers',
    'saved application state',
    'private',
    'dev',
    'cores'
  ],
  linux: [
    'proc',
    'sys',
    'dev',
    'run',
    'lost+found',
    'snap',
    '.trash-1000',
    '.local/share/trash'
  ],
  aix: [],
  android: [],
  freebsd: [],
  haiku: [],
  openbsd: [],
  sunos: [],
  cygwin: [],
  netbsd: []
}

const SKIP_DIR_NAMES = new Set(
  [...COMMON_SKIP_DIRS, ...(PLATFORM_SKIP_DIRS[process.platform] ?? [])].map((name) =>
    name.toLowerCase()
  )
)

const DEFAULT_LARGE_MIN_BYTES = 100 * 1024 * 1024
const DEFAULT_DUPLICATE_MIN_BYTES = 1024 * 1024
const DEFAULT_LARGE_LIMIT = 25
const DEFAULT_DUPLICATE_LIMIT = 20
const MAX_SCAN_FILES = 40_000
const HASH_SAMPLE_BYTES = 2 * 1024 * 1024

function shouldSkipDir(dirName: string): boolean {
  return SKIP_DIR_NAMES.has(dirName.toLowerCase())
}

function driveLabel(mountPath: string): string {
  const cleaned = mountPath.replace(/[/\\]+$/, '') || mountPath

  if (process.platform === 'win32') {
    const letter = cleaned.toUpperCase()
    return `Local Disk (${letter})`
  }

  if (process.platform === 'darwin') {
    if (cleaned === '/' || /macintosh hd/i.test(cleaned)) {
      return 'Macintosh HD'
    }
    return basename(cleaned) || 'Disk'
  }

  if (cleaned === '/') {
    return 'System'
  }

  return basename(cleaned) || cleaned
}

async function pathExists(targetPath: string): Promise<boolean> {
  try {
    await access(targetPath)
    return true
  } catch {
    return false
  }
}

/** True when targetPath lives on the given mount (drive letter / volume). */
function isPathOnMount(targetPath: string, mountPath: string): boolean {
  const absTarget = resolve(normalize(targetPath))
  const absMount = resolve(normalize(mountPath))

  if (process.platform === 'win32') {
    const targetRoot = absTarget.slice(0, 2).toLowerCase()
    const mountRoot = absMount.slice(0, 2).toLowerCase()
    return Boolean(targetRoot.match(/^[a-z]:$/)) && targetRoot === mountRoot
  }

  if (absMount === sep || absMount === '/') {
    return absTarget.startsWith('/')
  }

  return absTarget === absMount || absTarget.startsWith(absMount + sep)
}

async function listWindowsDriveRoots(): Promise<string[]> {
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  const roots: string[] = []

  await Promise.all(
    letters.split('').map(async (letter) => {
      const root = `${letter}:\\`
      if (await pathExists(root)) {
        roots.push(root)
      }
    })
  )

  return roots.sort()
}

async function listMountChildren(...parents: string[]): Promise<string[]> {
  const roots: string[] = []

  for (const parent of parents) {
    if (!(await pathExists(parent))) continue

    try {
      const entries = await readdir(parent, { withFileTypes: true })
      for (const entry of entries) {
        // Skip hidden system noise under mount parents
        if (entry.name.startsWith('.') && entry.name !== '.') continue
        if (entry.isDirectory() || entry.isSymbolicLink()) {
          const fullPath = join(parent, entry.name)
          try {
            const info = await lstat(fullPath)
            if (info.isDirectory() || info.isSymbolicLink()) {
              roots.push(fullPath)
            }
          } catch {
            // ignore unreadable entries
          }
        }
      }
    } catch {
      // ignore unreadable mount parents
    }
  }

  return roots
}

async function listDarwinRoots(): Promise<string[]> {
  const volumes = await listMountChildren('/Volumes')
  return volumes.length > 0 ? volumes : ['/']
}

async function listLinuxRoots(): Promise<string[]> {
  const user = process.env.USER ?? process.env.LOGNAME ?? ''
  const externalParents = [
    '/mnt',
    '/media',
    user ? join('/media', user) : '',
    user ? join('/run/media', user) : ''
  ].filter(Boolean)

  const externals = await listMountChildren(...externalParents)
  return ['/', ...externals]
}

async function listDriveRoots(): Promise<string[]> {
  switch (process.platform) {
    case 'win32':
      return listWindowsDriveRoots()
    case 'darwin':
      return listDarwinRoots()
    default:
      return listLinuxRoots()
  }
}

function getApplicationPaths(): string[] {
  const home = app.getPath('home')

  switch (process.platform) {
    case 'win32': {
      const paths = [
        process.env.ProgramFiles,
        process.env['ProgramFiles(x86)'],
        process.env.LOCALAPPDATA ? join(process.env.LOCALAPPDATA, 'Programs') : undefined
      ]
      return paths.filter((value): value is string => Boolean(value))
    }
    case 'darwin':
      return ['/Applications', join(home, 'Applications')]
    default:
      return ['/usr', '/opt', join(home, '.local')]
  }
}

function getSystemPaths(mountPath: string): string[] {
  switch (process.platform) {
    case 'win32':
      return [join(mountPath, 'Windows')]
    case 'darwin':
      return ['/System', '/Library'].filter((path) => isPathOnMount(path, mountPath))
    default:
      return ['/usr', '/var'].filter((path) => isPathOnMount(path, mountPath))
  }
}

async function crawlFiles(rootPath: string, maxDepth = 8): Promise<string[]> {
  try {
    const api = new fdir()
      .withFullPaths()
      .withMaxDepth(maxDepth)
      .withMaxFiles(MAX_SCAN_FILES)
      .exclude((dirName) => shouldSkipDir(dirName))
      .crawl(rootPath)

    return (await api.withPromise()) as string[]
  } catch {
    return []
  }
}

async function getDirectorySize(dirPath: string, maxDepth = 5): Promise<number> {
  if (!(await pathExists(dirPath))) return 0

  const files = await crawlFiles(dirPath, maxDepth)
  let total = 0

  for (const filePath of files) {
    try {
      const info = await stat(filePath)
      if (info.isFile()) {
        total += info.size
      }
    } catch {
      // skip unreadable files
    }
  }

  return total
}

async function hashFile(filePath: string, sizeBytes: number): Promise<string> {
  return new Promise((resolveHash, reject) => {
    const hash = createHash('sha256')
    hash.update(String(sizeBytes))

    if (sizeBytes <= 0) {
      resolveHash(hash.digest('hex'))
      return
    }

    const stream = createReadStream(filePath, {
      start: 0,
      end: Math.min(sizeBytes, HASH_SAMPLE_BYTES) - 1
    })

    stream.on('data', (chunk) => hash.update(chunk))
    stream.on('error', reject)
    stream.on('end', () => resolveHash(hash.digest('hex')))
  })
}

export class StorageService {
  async getDrives(): Promise<DriveInfo[]> {
    const roots = await listDriveRoots()
    const drives: DriveInfo[] = []
    const seenDisks = new Set<string>()

    for (const mountPath of roots) {
      try {
        const space = await checkDiskSpace(mountPath)
        const diskKey = `${space.diskPath}`.toLowerCase()

        // Same filesystem can appear as `/` and `/Volumes/Macintosh HD`, etc.
        if (seenDisks.has(diskKey)) {
          continue
        }
        seenDisks.add(diskKey)

        const totalBytes = space.size
        const freeBytes = space.free
        const usedBytes = Math.max(0, totalBytes - freeBytes)

        if (totalBytes <= 0) {
          continue
        }

        drives.push({
          label: driveLabel(mountPath),
          mountPath,
          usedBytes,
          totalBytes,
          freeBytes
        })
      } catch {
        // skip drives that cannot be queried
      }
    }

    return drives.sort((a, b) => a.label.localeCompare(b.label))
  }

  async analyzeUsage(mountPath?: string): Promise<StorageUsageResult> {
    const drives = await this.getDrives()
    const drive =
      drives.find(
        (item) => item.mountPath.toLowerCase() === (mountPath ?? '').toLowerCase()
      ) ?? drives[0]

    if (!drive) {
      return { mountPath: mountPath ?? '', segments: [], analyzedBytes: 0 }
    }

    const home = app.getPath('home')
    const documents = app.getPath('documents')
    const downloads = app.getPath('downloads')
    const pictures = app.getPath('pictures')
    const videos = app.getPath('videos')
    const desktop = app.getPath('desktop')
    const music = app.getPath('music')

    const categoryDefs: Array<{ label: string; paths: string[]; depth: number }> = [
      {
        label: 'Applications',
        paths: getApplicationPaths(),
        depth: process.platform === 'linux' ? 3 : 5
      },
      {
        label: 'Documents',
        paths: [documents, desktop],
        depth: 5
      },
      {
        label: 'Media',
        paths: [pictures, videos, music],
        depth: 5
      },
      {
        label: 'Downloads',
        paths: [downloads],
        depth: 5
      },
      {
        label: 'System',
        paths: getSystemPaths(drive.mountPath),
        depth: 2
      }
    ]

    const rawSegments: Array<{ label: string; bytes: number }> = []

    for (const category of categoryDefs) {
      let bytes = 0
      for (const categoryPath of category.paths) {
        if (!isPathOnMount(categoryPath, drive.mountPath)) continue
        bytes += await getDirectorySize(categoryPath, category.depth)
      }
      if (bytes > 0) {
        rawSegments.push({ label: category.label, bytes })
      }
    }

    if (isPathOnMount(home, drive.mountPath)) {
      const profileBytes = await getDirectorySize(home, 4)
      const accounted = rawSegments.reduce((sum, segment) => sum + segment.bytes, 0)
      const otherFromProfile = Math.max(0, profileBytes - accounted)
      if (otherFromProfile > 0) {
        rawSegments.push({ label: 'Other', bytes: otherFromProfile })
      }
    }

    const analyzedBytes = rawSegments.reduce((sum, segment) => sum + segment.bytes, 0)
    const denominator = Math.max(drive.usedBytes, analyzedBytes, 1)

    const merged = new Map<string, number>()
    for (const segment of rawSegments) {
      merged.set(segment.label, (merged.get(segment.label) ?? 0) + segment.bytes)
    }

    const segments: StorageSegment[] = [...merged.entries()]
      .map(([label, bytes]) => ({
        label,
        bytes,
        percent: Math.max(1, Math.round((bytes / denominator) * 100))
      }))
      .sort((a, b) => b.bytes - a.bytes)

    const percentSum = segments.reduce((sum, segment) => sum + segment.percent, 0)
    if (segments.length > 0 && percentSum !== 100) {
      segments[0].percent = Math.max(1, segments[0].percent + (100 - percentSum))
    }

    return {
      mountPath: drive.mountPath,
      segments,
      analyzedBytes
    }
  }

  async findLargeFiles(options: FindLargeFilesOptions = {}): Promise<LargeFile[]> {
    const rootPath = options.rootPath ?? app.getPath('home')
    const minBytes = options.minBytes ?? DEFAULT_LARGE_MIN_BYTES
    const limit = options.limit ?? DEFAULT_LARGE_LIMIT

    const files = await crawlFiles(rootPath, 10)
    const largeFiles: LargeFile[] = []

    for (const filePath of files) {
      try {
        const info = await stat(filePath)
        if (!info.isFile() || info.size < minBytes) continue

        largeFiles.push({
          name: basename(filePath),
          path: filePath,
          sizeBytes: info.size
        })
      } catch {
        // skip
      }
    }

    return largeFiles.sort((a, b) => b.sizeBytes - a.sizeBytes).slice(0, limit)
  }

  async findDuplicates(options: FindDuplicatesOptions = {}): Promise<DuplicateGroup[]> {
    const rootPath = options.rootPath ?? app.getPath('home')
    const minBytes = options.minBytes ?? DEFAULT_DUPLICATE_MIN_BYTES
    const limit = options.limit ?? DEFAULT_DUPLICATE_LIMIT

    const files = await crawlFiles(rootPath, 8)
    const bySize = new Map<number, string[]>()

    for (const filePath of files) {
      try {
        const info = await stat(filePath)
        if (!info.isFile() || info.size < minBytes) continue
        const list = bySize.get(info.size) ?? []
        list.push(filePath)
        bySize.set(info.size, list)
      } catch {
        // skip
      }
    }

    const byHash = new Map<string, { sizeBytes: number; paths: string[] }>()

    for (const [sizeBytes, paths] of bySize) {
      if (paths.length < 2) continue

      for (const filePath of paths) {
        try {
          const digest = await hashFile(filePath, sizeBytes)
          const key = `${sizeBytes}:${digest}`
          const group = byHash.get(key) ?? { sizeBytes, paths: [] }
          group.paths.push(filePath)
          byHash.set(key, group)
        } catch {
          // skip unreadable
        }
      }
    }

    const groups: DuplicateGroup[] = []

    for (const group of byHash.values()) {
      if (group.paths.length < 2) continue
      groups.push({
        name: basename(group.paths[0]),
        paths: group.paths,
        copies: group.paths.length,
        sizeBytes: group.sizeBytes
      })
    }

    return groups
      .sort((a, b) => b.sizeBytes * (b.copies - 1) - a.sizeBytes * (a.copies - 1))
      .slice(0, limit)
  }

  async revealInFolder(filePath: string): Promise<void> {
    shell.showItemInFolder(filePath)
  }

  async deleteFiles(filePaths: string[]): Promise<DeleteFilesResult> {
    const deleted: string[] = []
    const failed: Array<{ path: string; error: string }> = []

    for (const filePath of filePaths) {
      try {
        await shell.trashItem(filePath)
        deleted.push(filePath)
      } catch (err) {
        failed.push({
          path: filePath,
          error: err instanceof Error ? err.message : 'Failed to delete file'
        })
      }
    }

    return { deleted, failed }
  }

  getDefaultScanRoot(): string {
    return app.getPath('home')
  }
}

export const storageService = new StorageService()
