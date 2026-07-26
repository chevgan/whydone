/**
 * Lock-file v2 regression tests (design §7, §10.1).
 *
 * Pins the P0-1 data-loss fix: every lock path is relative to the lock file's
 * OWN directory (POSIX separators), so init --global from dirA followed by
 * uninstall --global from dirB removes exactly the fake-home install and
 * touches nothing in dirB. Uses a fake HOME/USERPROFILE (os.homedir() honors
 * them) so no real user files are involved.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtemp, mkdir, rm, readFile, writeFile, access } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import initCommand from '../src/commands/init.js'
import uninstallCommand from '../src/commands/uninstall.js'
import { installStopHook, hasStopHook, buildLauncherSource } from '../src/lib/settings-hooks.js'

async function runCommand(
  command: unknown,
  cwd: string,
  args: Record<string, unknown>,
): Promise<void> {
  const originalCwd = process.cwd()
  process.chdir(cwd)
  try {
    await (command as { run: (c: { args: Record<string, unknown> }) => Promise<void> }).run({ args })
  } finally {
    process.chdir(originalCwd)
  }
}

const initDefaults = {
  force: false,
  global: false,
  'dry-run': false,
  quiet: true,
  'no-color': true,
  yes: false,
  'no-hook': false,
}

const uninstallDefaults = {
  purge: false,
  global: false,
  'dry-run': false,
  quiet: true,
  'no-color': true,
}

/** Intercept process.exit so exit-1 paths are assertable. */
function trapExit(): { restore: () => void; code: () => number | undefined } {
  let exitCode: number | undefined
  const originalExit = process.exit
  process.exit = ((code?: number | string) => {
    exitCode = typeof code === 'string' ? parseInt(code, 10) : code
    throw new Error(`process.exit(${code})`)
  }) as typeof process.exit
  return {
    restore: () => {
      process.exit = originalExit
    },
    code: () => exitCode,
  }
}

function trapStderr(): { restore: () => void; output: () => string } {
  const chunks: string[] = []
  const original = process.stderr.write.bind(process.stderr)
  // @ts-expect-error test override
  process.stderr.write = (chunk: unknown) => {
    chunks.push(String(chunk))
    return true
  }
  return {
    restore: () => {
      // @ts-expect-error test override
      process.stderr.write = original
    },
    output: () => chunks.join(''),
  }
}

describe('lock file v2', () => {
  let root: string
  let fakeHome: string
  let dirA: string
  let dirB: string
  let savedHome: string | undefined
  let savedUserProfile: string | undefined

  beforeEach(async () => {
    root = await mkdtemp(path.join(tmpdir(), 'whydone-lockv2-test-'))
    fakeHome = path.join(root, 'home')
    dirA = path.join(root, 'projects', 'a')
    dirB = path.join(root, 'projects', 'b')
    await mkdir(fakeHome, { recursive: true })
    await mkdir(dirA, { recursive: true })
    await mkdir(dirB, { recursive: true })
    savedHome = process.env.HOME
    savedUserProfile = process.env.USERPROFILE
    process.env.HOME = fakeHome
    process.env.USERPROFILE = fakeHome
  })

  afterEach(async () => {
    if (savedHome === undefined) delete process.env.HOME
    else process.env.HOME = savedHome
    if (savedUserProfile === undefined) delete process.env.USERPROFILE
    else process.env.USERPROFILE = savedUserProfile
    await rm(root, { recursive: true, force: true })
  })

  it('lock snapshot: lockVersion 2, no installedAt, POSIX lock-dir-relative paths', async () => {
    await runCommand(initCommand, dirA, { ...initDefaults })
    const raw = await readFile(path.join(dirA, '.claude', 'whydone.lock.json'), 'utf-8')
    const lock = JSON.parse(raw)
    expect(lock.lockVersion).toBe(2)
    expect(lock.installedAt).toBeUndefined()
    expect(lock.skillsDir).toBe('skills')
    expect(lock.claudeMdPath).toBe('../CLAUDE.md')
    for (const p of lock.skills) {
      expect(p).toMatch(/^skills\//)
      expect(p).not.toContain('\\')
      expect(p).not.toContain('..')
    }
    expect(raw).not.toContain('\\\\')
  })

  it('two consecutive init runs produce byte-identical locks', async () => {
    await runCommand(initCommand, dirA, { ...initDefaults })
    const first = await readFile(path.join(dirA, '.claude', 'whydone.lock.json'), 'utf-8')
    await runCommand(initCommand, dirA, { ...initDefaults })
    const second = await readFile(path.join(dirA, '.claude', 'whydone.lock.json'), 'utf-8')
    expect(second).toBe(first)
  })

  it('global lock uses claudeMdPath "CLAUDE.md" (patches ~/.claude/CLAUDE.md)', async () => {
    await runCommand(initCommand, dirA, { ...initDefaults, global: true })
    const lock = JSON.parse(
      await readFile(path.join(fakeHome, '.claude', 'whydone.lock.json'), 'utf-8'),
    )
    expect(lock.scope).toBe('global')
    expect(lock.claudeMdPath).toBe('CLAUDE.md')
    const globalClaudeMd = await readFile(path.join(fakeHome, '.claude', 'CLAUDE.md'), 'utf-8')
    expect(globalClaudeMd).toContain('<!-- whydone:start -->')
    // §6.5 GLOBAL variant: ~/.claude/CLAUDE.md loads in every project, most
    // without a journal — the block must be conditional, not the project one.
    expect(globalClaudeMd).toContain('Projects may keep')
    expect(globalClaudeMd).not.toContain('This project keeps')
  })

  it('THE §7.4 regression: init --global from dirA, uninstall --global from dirB', async () => {
    // init --global with an explicit mode installs skills + hook into fake home.
    await runCommand(initCommand, dirA, { ...initDefaults, global: true, mode: 'ask' })

    const homeClaudeDir = path.join(fakeHome, '.claude')
    await access(path.join(homeClaudeDir, 'skills', 'log', 'SKILL.md'))
    await access(path.join(homeClaudeDir, 'skills', 'recall', 'SKILL.md'))
    await access(path.join(homeClaudeDir, 'whydone-hook.cjs'))
    expect(await hasStopHook(path.join(homeClaudeDir, 'settings.json'))).toBe(true)

    // dirB before: pristine (no .claude, no CLAUDE.md).
    await runCommand(uninstallCommand, dirB, { ...uninstallDefaults, global: true })

    // Fake-home install is fully gone…
    expect(existsSync(path.join(homeClaudeDir, 'skills', 'log', 'SKILL.md'))).toBe(false)
    expect(existsSync(path.join(homeClaudeDir, 'skills', 'recall', 'SKILL.md'))).toBe(false)
    expect(existsSync(path.join(homeClaudeDir, 'whydone.lock.json'))).toBe(false)
    expect(existsSync(path.join(homeClaudeDir, 'whydone-hook.cjs'))).toBe(false)
    expect(await hasStopHook(path.join(homeClaudeDir, 'settings.json'))).toBe(false)
    const globalClaudeMd = await readFile(path.join(homeClaudeDir, 'CLAUDE.md'), 'utf-8')
    expect(globalClaudeMd).not.toContain('<!-- whydone:start -->')

    // …and NOTHING in dirB was touched.
    expect(existsSync(path.join(dirB, '.claude'))).toBe(false)
    expect(existsSync(path.join(dirB, 'CLAUDE.md'))).toBe(false)
  })

  it('project scope: init in A, uninstall from sibling B fails cleanly with "not installed"', async () => {
    await runCommand(initCommand, dirA, { ...initDefaults })

    const exit = trapExit()
    const stderr = trapStderr()
    try {
      await expect(
        runCommand(uninstallCommand, dirB, { ...uninstallDefaults, quiet: false }),
      ).rejects.toThrow('process.exit(1)')
    } finally {
      exit.restore()
      stderr.restore()
    }
    expect(exit.code()).toBe(1)
    expect(stderr.output()).toContain('not installed')

    // A's install is intact — the non-destructive outcome is the pin.
    await access(path.join(dirA, '.claude', 'whydone.lock.json'))
    await access(path.join(dirA, '.claude', 'skills', 'log', 'SKILL.md'))
    // Nothing appeared in B.
    expect(existsSync(path.join(dirB, '.claude'))).toBe(false)
  })

  it('lockVersion !== 2 ⇒ abort lock-recorded removals, but hook + launcher removed anyway', async () => {
    await runCommand(initCommand, dirA, { ...initDefaults, mode: 'ask' })
    const claudeDir = path.join(dirA, '.claude')
    const lockPath = path.join(claudeDir, 'whydone.lock.json')
    const settingsPath = path.join(claudeDir, 'settings.local.json')
    expect(await hasStopHook(settingsPath)).toBe(true)

    // Stale v1-style lock (no lockVersion).
    const lock = JSON.parse(await readFile(lockPath, 'utf-8'))
    delete lock.lockVersion
    await writeFile(lockPath, JSON.stringify(lock, null, 2), 'utf-8')

    const exit = trapExit()
    const stderr = trapStderr()
    try {
      await expect(
        runCommand(uninstallCommand, dirA, { ...uninstallDefaults, quiet: false }),
      ).rejects.toThrow('process.exit(1)')
    } finally {
      exit.restore()
      stderr.restore()
    }
    expect(exit.code()).toBe(1)
    expect(stderr.output()).toContain('older whydone')

    // Cleanup-before-lock-validation ordering (§3.6): hook + launcher are gone…
    expect(await hasStopHook(settingsPath)).toBe(false)
    expect(existsSync(path.join(claudeDir, 'whydone-hook.cjs'))).toBe(false)
    // …while lock-recorded removals were aborted (skills + lock survive).
    await access(path.join(claudeDir, 'skills', 'log', 'SKILL.md'))
    await access(lockPath)
  })

  it('no lock at all but marker hook present ⇒ hook still removed, then "not installed"', async () => {
    const claudeDir = path.join(dirA, '.claude')
    await mkdir(claudeDir, { recursive: true })
    const launcherPath = path.join(claudeDir, 'whydone-hook.cjs')
    await writeFile(launcherPath, buildLauncherSource(), 'utf-8')
    const settingsPath = path.join(claudeDir, 'settings.local.json')
    await installStopHook(settingsPath, launcherPath)
    expect(await hasStopHook(settingsPath)).toBe(true)

    const exit = trapExit()
    const stderr = trapStderr()
    try {
      await expect(
        runCommand(uninstallCommand, dirA, { ...uninstallDefaults, quiet: false }),
      ).rejects.toThrow('process.exit(1)')
    } finally {
      exit.restore()
      stderr.restore()
    }
    expect(exit.code()).toBe(1)
    expect(stderr.output()).toContain('not installed')
    expect(await hasStopHook(settingsPath)).toBe(false)
    expect(existsSync(launcherPath)).toBe(false)
  })
})
