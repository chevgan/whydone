/**
 * Integration tests for src/commands/update.ts
 *
 * Real temp directories: init first, then exercise update. Covers the force
 * re-copy of skills, the lock rewrite (version + skills list), the launcher
 * refresh that happens ONLY where a marker hook already exists, dry-run, and
 * the abort paths: no lock anywhere, an old lockVersion, a skillsDir escaping
 * the lock dir, and a structurally broken v2 lock (clean exit 1, no TypeError).
 * HOME is faked so the global-lock fallback never sees a real ~/.claude/.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mkdtemp, mkdir, rm, readFile, writeFile, access } from 'node:fs/promises'
import { existsSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import initCommand from '../src/commands/init.js'
import updateCommand from '../src/commands/update.js'
import { hasStopHook } from '../src/lib/settings-hooks.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const TEMPLATE_LOG = path.join(__dirname, '..', 'templates', 'skills', 'log', 'SKILL.md')
const PKG_VERSION: string = JSON.parse(
  readFileSync(path.join(__dirname, '..', 'package.json'), 'utf-8'),
).version

async function runInit(projectDir: string, args: Record<string, unknown> = {}): Promise<void> {
  const originalCwd = process.cwd()
  process.chdir(projectDir)
  try {
    await (initCommand as any).run({
      args: { force: false, global: false, 'dry-run': false, quiet: true, 'no-color': true, yes: false, hook: true, ...args },
    })
  } finally {
    process.chdir(originalCwd)
  }
}

/** Run update in projectDir, capturing stdout/stderr. */
async function runUpdate(
  projectDir: string,
  args: Record<string, unknown> = {},
): Promise<{ stdout: string; stderr: string }> {
  const originalCwd = process.cwd()
  process.chdir(projectDir)
  let stdout = ''
  let stderr = ''
  const outSpy = vi.spyOn(process.stdout, 'write').mockImplementation((chunk) => {
    stdout += String(chunk)
    return true
  })
  const errSpy = vi.spyOn(process.stderr, 'write').mockImplementation((chunk) => {
    stderr += String(chunk)
    return true
  })
  try {
    await (updateCommand as any).run({
      args: { 'dry-run': false, quiet: true, 'no-color': true, ...args },
    })
  } finally {
    outSpy.mockRestore()
    errSpy.mockRestore()
    process.chdir(originalCwd)
  }
  return { stdout, stderr }
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

describe('update command', () => {
  let root: string
  let projectDir: string
  let savedHome: string | undefined
  let savedUserProfile: string | undefined

  beforeEach(async () => {
    root = await mkdtemp(path.join(tmpdir(), 'whydone-update-test-'))
    projectDir = path.join(root, 'project')
    const fakeHome = path.join(root, 'home')
    await mkdir(projectDir, { recursive: true })
    await mkdir(fakeHome, { recursive: true })
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

  const lockPath = () => path.join(projectDir, '.claude', 'whydone.lock.json')
  const installedLog = () => path.join(projectDir, '.claude', 'skills', 'log', 'SKILL.md')

  describe('after a hook-less init (bare non-TTY run: manual mode, no hook)', () => {
    beforeEach(async () => {
      await runInit(projectDir)
    })

    it('force-overwrites an edited SKILL.md with the packaged template', async () => {
      await writeFile(installedLog(), '# customized by the user\n', 'utf-8')
      await runUpdate(projectDir)
      expect(await readFile(installedLog(), 'utf-8')).toBe(await readFile(TEMPLATE_LOG, 'utf-8'))
    })

    it('rewrites the lock as v2 with the current package version and both skill files', async () => {
      const before = JSON.parse(await readFile(lockPath(), 'utf-8'))
      await writeFile(lockPath(), JSON.stringify({ ...before, version: '0.0.1' }, null, 2), 'utf-8')

      await runUpdate(projectDir)

      const after = JSON.parse(await readFile(lockPath(), 'utf-8'))
      expect(after.lockVersion).toBe(2)
      expect(after.version).toBe(PKG_VERSION)
      expect(after.scope).toBe('project')
      expect(after.skillsDir).toBe('skills')
      expect(after.skills).toEqual(['skills/log/SKILL.md', 'skills/recall/SKILL.md'])
      expect(after.claudeMdPath).toBe(before.claudeMdPath)
      expect(after.claudeMdPatched).toBe(before.claudeMdPatched)
    })

    it('never adds a Stop hook that init did not install', async () => {
      await runUpdate(projectDir)
      expect(existsSync(path.join(projectDir, '.claude', 'settings.local.json'))).toBe(false)
      expect(existsSync(path.join(projectDir, '.claude', 'whydone-hook.cjs'))).toBe(false)
    })

    it('reports the number of updated files and the version (non-quiet)', async () => {
      const { stdout } = await runUpdate(projectDir, { quiet: false })
      expect(stdout).toContain('whydone update complete')
      expect(stdout).toContain('Updated 2 skill file(s)')
      expect(stdout).toContain(PKG_VERSION)
      expect(stdout).not.toContain('Stop hook launcher refreshed')
    })

    it('--dry-run prints the plan and writes nothing', async () => {
      await writeFile(installedLog(), '# customized\n', 'utf-8')
      const lockBefore = await readFile(lockPath(), 'utf-8')

      const { stdout } = await runUpdate(projectDir, { 'dry-run': true, quiet: false })

      expect(stdout).toContain('whydone update dry-run plan')
      expect(stdout).toContain('skills/log/SKILL.md')
      expect(await readFile(installedLog(), 'utf-8')).toBe('# customized\n')
      expect(await readFile(lockPath(), 'utf-8')).toBe(lockBefore)
    })
  })

  describe('after init --mode ask (hook + launcher installed)', () => {
    beforeEach(async () => {
      await runInit(projectDir, { mode: 'ask' })
    })

    it('rewrites a missing launcher and keeps exactly one marker handler in settings.local.json', async () => {
      const launcher = path.join(projectDir, '.claude', 'whydone-hook.cjs')
      const settingsPath = path.join(projectDir, '.claude', 'settings.local.json')
      await rm(launcher)

      const { stdout } = await runUpdate(projectDir, { quiet: false })

      expect(existsSync(launcher)).toBe(true)
      expect(await hasStopHook(settingsPath)).toBe(true)
      const settings = JSON.parse(await readFile(settingsPath, 'utf-8'))
      const handlers = settings.hooks.Stop.flatMap((g: { hooks: Array<{ command?: string }> }) =>
        g.hooks,
      ).filter((h: { command?: string }) => String(h.command).includes('whydone-hook.cjs'))
      expect(handlers).toHaveLength(1)
      expect(stdout).toContain('Stop hook launcher refreshed')
    })
  })

  describe('abort paths (exit 1, nothing written)', () => {
    it('no lock anywhere ⇒ "not initialized"', async () => {
      const exit = trapExit()
      try {
        await expect(runUpdate(projectDir)).rejects.toThrow('process.exit(1)')
      } finally {
        exit.restore()
      }
      expect(exit.code()).toBe(1)
      await expect(access(path.join(projectDir, '.claude'))).rejects.toThrow()
    })

    it('lockVersion 1 ⇒ "older whydone" message, skills untouched', async () => {
      await runInit(projectDir)
      await writeFile(installedLog(), '# customized\n', 'utf-8')
      await writeFile(lockPath(), JSON.stringify({ lockVersion: 1, skills: [] }), 'utf-8')
      const exit = trapExit()
      let stderr = ''
      try {
        await expect(
          runUpdate(projectDir).then((r) => {
            stderr = r.stderr
          }),
        ).rejects.toThrow('process.exit(1)')
      } finally {
        exit.restore()
      }
      expect(await readFile(installedLog(), 'utf-8')).toBe('# customized\n')
    })

    it('skillsDir escaping the lock dir ⇒ "outside expected scope", nothing copied', async () => {
      await runInit(projectDir)
      const lock = JSON.parse(await readFile(lockPath(), 'utf-8'))
      await writeFile(lockPath(), JSON.stringify({ ...lock, skillsDir: '../../elsewhere' }), 'utf-8')
      const exit = trapExit()
      try {
        await expect(runUpdate(projectDir)).rejects.toThrow('process.exit(1)')
      } finally {
        exit.restore()
      }
      expect(exit.code()).toBe(1)
      expect(existsSync(path.join(root, 'elsewhere'))).toBe(false)
    })

    it('a structurally broken v2 lock ({"lockVersion": 2}) ⇒ clean exit 1, never a TypeError', async () => {
      await runInit(projectDir)
      await writeFile(lockPath(), JSON.stringify({ lockVersion: 2 }), 'utf-8')
      const exit = trapExit()
      try {
        await expect(runUpdate(projectDir)).rejects.toThrow('process.exit(1)')
      } finally {
        exit.restore()
      }
      expect(exit.code()).toBe(1)
    })
  })
})
