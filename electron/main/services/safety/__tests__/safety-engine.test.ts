import { mkdir, mkdtemp, symlink, writeFile } from 'fs/promises'
import { tmpdir } from 'os'
import { join } from 'path'
import { afterEach, describe, expect, it } from 'vitest'
import { SafetyEngine } from '../engine'

const IS_WIN = process.platform === 'win32'

function engineFor(
  homeDir: string,
  platform: NodeJS.Platform = process.platform,
  env: NodeJS.ProcessEnv = {},
  extras?: { appProtectedRoots?: string[]; appCacheRoots?: string[] }
): SafetyEngine {
  return new SafetyEngine({
    homeDir,
    platform,
    env: {
      HOME: homeDir,
      USERPROFILE: homeDir,
      SystemRoot: join(homeDir, 'Windows'),
      SystemDrive: homeDir.slice(0, 2) || 'C:',
      ProgramFiles: join(homeDir, 'Program Files'),
      'ProgramFiles(x86)': join(homeDir, 'Program Files (x86)'),
      ProgramData: join(homeDir, 'ProgramData'),
      LOCALAPPDATA: join(homeDir, 'AppData', 'Local'),
      APPDATA: join(homeDir, 'AppData', 'Roaming'),
      ...env
    },
    appProtectedRoots: extras?.appProtectedRoots,
    appCacheRoots: extras?.appCacheRoots
  })
}

describe('SafetyEngine', () => {
  const temps: string[] = []

  afterEach(async () => {
    // Isolation only — never touch real user trees
    temps.length = 0
  })

  async function fakeHome(): Promise<string> {
    const dir = await mkdtemp(join(tmpdir(), 'eda-safety-'))
    temps.push(dir)
    return dir
  }

  it('classifies a normal large user file as SAFE', async () => {
    const home = await fakeHome()
    const file = join(home, 'Downloads', 'vacation-video.mp4')
    await mkdir(join(home, 'Downloads'), { recursive: true })
    await writeFile(file, 'x')
    const safety = engineFor(home)
    const decision = safety.evaluateLexical(file)
    expect(decision.riskLevel).toBe('SAFE')
    expect(decision.deletionAllowed).toBe(true)
  })

  it('protects ~/.gradle wrapper distributions (8.x and 9.x)', () => {
    const home = IS_WIN ? 'C:\\Users\\TestUser' : '/home/testuser'
    const safety = engineFor(home, IS_WIN ? 'win32' : 'linux')

    for (const version of ['gradle-8.8-all', 'gradle-9.1-all']) {
      const jar = join(
        home,
        '.gradle',
        'wrapper',
        'dists',
        version,
        'abcdef',
        version.replace('-all', ''),
        'lib',
        'jackson-databind-2.16.1.jar'
      )
      const decision = safety.evaluateLexical(jar)
      expect(decision.riskLevel).toBe('PROTECTED')
      expect(decision.deletionAllowed).toBe(false)
      expect(decision.ruleId).toBe('gradle-wrapper-dists')
    }
  })

  it('marks ~/.gradle caches as CAUTION (regeneratable)', () => {
    const home = IS_WIN ? 'C:\\Users\\Dev' : '/home/dev'
    const safety = engineFor(home, IS_WIN ? 'win32' : 'linux')
    const cacheJar = join(home, '.gradle', 'caches', 'modules-2', 'files-2.1', 'foo.jar')
    const decision = safety.evaluateLexical(cacheJar)
    expect(decision.riskLevel).toBe('CAUTION')
    expect(decision.deletionAllowed).toBe(true)
    expect(decision.regeneratable).toBe(true)
    expect(decision.ruleId).toBe('gradle-caches')
  })

  it('lets specific gradle-wrapper-dists override generic ~/.gradle', () => {
    const home = '/Users/alex'
    const safety = engineFor(home, 'darwin')
    const generic = safety.evaluateLexical(join(home, '.gradle', 'readme.txt'))
    const specific = safety.evaluateLexical(
      join(home, '.gradle', 'wrapper', 'dists', 'gradle-8.8-all', 'x.jar')
    )
    expect(generic.ruleId).toBe('gradle-home')
    expect(generic.riskLevel).toBe('HIGH_RISK')
    expect(specific.ruleId).toBe('gradle-wrapper-dists')
    expect(specific.riskLevel).toBe('PROTECTED')
  })

  it('does not auto-protect a random .jar outside protected trees', () => {
    const home = '/home/sam'
    const safety = engineFor(home, 'linux')
    const jar = join(home, 'Downloads', 'tools', 'jackson-databind-2.16.1.jar')
    const decision = safety.evaluateLexical(jar)
    expect(decision.riskLevel).toBe('SAFE')
    expect(decision.deletionAllowed).toBe(true)
  })

  it('classifies Xcode DerivedData as CAUTION and Android library as HIGH_RISK', () => {
    const home = '/Users/dev'
    const safety = engineFor(home, 'darwin')
    const derived = safety.evaluateLexical(
      join(home, 'Library', 'Developer', 'Xcode', 'DerivedData', 'App-abc', 'Build')
    )
    const android = safety.evaluateLexical(join(home, 'Library', 'Android', 'sdk', 'platform-tools'))
    expect(derived.riskLevel).toBe('CAUTION')
    expect(derived.deletionAllowed).toBe(true)
    expect(android.riskLevel).toBe('HIGH_RISK')
    expect(android.deletionAllowed).toBe(false)
  })

  it('classifies node_modules as CAUTION', () => {
    const home = '/home/dev'
    const safety = engineFor(home, 'linux')
    const nm = join(home, 'projects', 'app', 'node_modules', 'lodash', 'index.js')
    const decision = safety.evaluateLexical(nm)
    expect(decision.riskLevel).toBe('CAUTION')
    expect(decision.ruleId).toBe('project-node-modules')
  })

  it('protects path traversal into system folders', () => {
    const home = IS_WIN ? 'C:\\Users\\Test' : '/home/test'
    const safety = engineFor(home, IS_WIN ? 'win32' : 'linux')
    if (IS_WIN) {
      // Lexical normalize collapses .. into Windows system path via SystemRoot env
      const sneaky = join(home, '..', '..', 'Windows', 'System32', 'drivers', 'etc', 'hosts')
      const decision = safety.evaluateLexical(sneaky)
      expect(decision.deletionAllowed).toBe(false)
      expect(decision.riskLevel).toBe('PROTECTED')
    } else {
      const sneaky = join(home, '..', '..', 'usr', 'bin', 'bash')
      const decision = safety.evaluateLexical(sneaky)
      expect(decision.deletionAllowed).toBe(false)
      expect(decision.riskLevel).toBe('PROTECTED')
    }
  })

  it('works with different home directories / usernames', () => {
    for (const home of ['/home/rahul', '/home/alice', 'C:\\Users\\Bob']) {
      const platform = home.includes(':') ? 'win32' : 'linux'
      const safety = engineFor(home, platform)
      const decision = safety.evaluateLexical(
        join(home, '.gradle', 'wrapper', 'dists', 'gradle-8.8-all', 'lib.jar')
      )
      expect(decision.riskLevel).toBe('PROTECTED')
    }
  })

  it('protects Windows Program Files and SystemRoot', () => {
    const home = 'C:\\Users\\Pat'
    const safety = engineFor(home, 'win32')
    const exe = join(home, 'Program Files', 'App', 'app.exe')
    const dll = join(home, 'Windows', 'System32', 'kernel32.dll')
    expect(safety.evaluateLexical(exe).riskLevel).toBe('PROTECTED')
    expect(safety.evaluateLexical(dll).riskLevel).toBe('PROTECTED')
  })

  it('protects Linux system paths', () => {
    const safety = engineFor('/home/lee', 'linux')
    expect(safety.evaluateLexical('/usr/lib/libfoo.so').riskLevel).toBe('PROTECTED')
    expect(safety.evaluateLexical('/etc/passwd').riskLevel).toBe('PROTECTED')
    expect(safety.evaluateLexical('/boot/vmlinuz').riskLevel).toBe('PROTECTED')
  })

  it('protects duplicate files that live in protected locations', () => {
    const home = '/home/dev'
    const safety = engineFor(home, 'linux')
    const protectedCopy = join(
      home,
      '.gradle',
      'wrapper',
      'dists',
      'gradle-8.8-all',
      'jackson.jar'
    )
    const decision = safety.evaluateLexical(protectedCopy)
    expect(decision.deletionAllowed).toBe(false)
  })

  it('re-checks at delete time (assertDeletable)', async () => {
    const home = await fakeHome()
    const safety = engineFor(home)
    const file = join(home, '.gradle', 'wrapper', 'dists', 'gradle-8.8-all', 'x.jar')
    await mkdir(join(home, '.gradle', 'wrapper', 'dists', 'gradle-8.8-all'), {
      recursive: true
    })
    await writeFile(file, 'jar')
    const decision = await safety.assertDeletable(file)
    expect(decision.deletionAllowed).toBe(false)
    expect(decision.ruleId).toBe('gradle-wrapper-dists')
  })

  it('blocks permanent delete for HIGH_RISK even if trash would be limited', async () => {
    const home = await fakeHome()
    const safety = engineFor(home)
    const rustc = join(home, '.rustup', 'toolchains', 'stable', 'bin', 'rustc')
    await mkdir(join(home, '.rustup', 'toolchains', 'stable', 'bin'), { recursive: true })
    await writeFile(rustc, 'x')
    const trash = await safety.assertDeletable(rustc, { permanent: false })
    const permanent = await safety.assertDeletable(rustc, { permanent: true })
    expect(trash.deletionAllowed).toBe(false)
    expect(permanent.deletionAllowed).toBe(false)
  })

  it('protects the application own files but allows app caches', () => {
    const home = '/home/app'
    const appRoot = join(home, 'EdaCleaner')
    const cache = join(appRoot, 'Cache', 'tmp.dat')
    const db = join(appRoot, 'state.db')
    const safety = engineFor(home, 'linux', {}, {
      appProtectedRoots: [appRoot],
      appCacheRoots: [join(appRoot, 'Cache')]
    })
    expect(safety.evaluateLexical(db).ruleId).toBe('app-self')
    expect(safety.evaluateLexical(db).deletionAllowed).toBe(false)
    expect(safety.evaluateLexical(cache).ruleId).toBe('app-self-cache')
    expect(safety.evaluateLexical(cache).deletionAllowed).toBe(true)
  })

  it('follows symlink targets into protected trees', async () => {
    if (IS_WIN) {
      // Creating symlinks on Windows often requires admin — skip FS symlink case
      const home = 'C:\\Users\\Link'
      const safety = engineFor(home, 'win32')
      const decision = safety.evaluateLexical(
        join(home, '.gradle', 'wrapper', 'dists', 'gradle-8.8-all', 'a.jar')
      )
      expect(decision.deletionAllowed).toBe(false)
      return
    }

    const home = await fakeHome()
    const targetDir = join(home, '.gradle', 'wrapper', 'dists', 'gradle-8.8-all')
    await mkdir(targetDir, { recursive: true })
    const target = join(targetDir, 'jackson.jar')
    await writeFile(target, 'jar')
    const linkDir = join(home, 'Downloads')
    await mkdir(linkDir, { recursive: true })
    const link = join(linkDir, 'not-suspicious.jar')
    await symlink(target, link)

    const safety = engineFor(home, 'linux')
    const decision = await safety.evaluate(link)
    expect(decision.deletionAllowed).toBe(false)
    expect(decision.viaSymlink).toBe(true)
    expect(decision.riskLevel).toBe('PROTECTED')
  })
})
