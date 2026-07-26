/**
 * Integration tests for src/commands/uninstall.ts
 *
 * Uses real temp directories and runs init first to set up state,
 * then exercises uninstall scenarios.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mkdtemp, rm, readFile, access, writeFile, mkdir } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import initCommand from '../src/commands/init.js'
import uninstallCommand from '../src/commands/uninstall.js'
import { installStopHook, hasStopHook, buildLauncherSource } from '../src/lib/settings-hooks.js'

/** Run init in a temp project directory */
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

/** Run uninstall in a temp project directory */
async function runUninstall(
  projectDir: string,
  args: Record<string, unknown> = {},
): Promise<void> {
  const originalCwd = process.cwd()
  process.chdir(projectDir)
  try {
    await (uninstallCommand as any).run({
      args: { purge: false, global: false, 'dry-run': false, quiet: true, 'no-color': true, ...args },
    })
  } finally {
    process.chdir(originalCwd)
  }
}

/** Check that a path does NOT exist (access throws) */
async function notExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath)
    return false // path exists
  } catch {
    return true // path does not exist
  }
}

describe('uninstall command', () => {
  let projectDir: string

  beforeEach(async () => {
    projectDir = await mkdtemp(path.join(tmpdir(), 'whydone-uninstall-test-'))
  })

  afterEach(async () => {
    await rm(projectDir, { recursive: true, force: true })
  })

  describe('after init', () => {
    beforeEach(async () => {
      await runInit(projectDir)
    })

    it('removes .claude/skills/log/SKILL.md', async () => {
      await runUninstall(projectDir)
      expect(await notExists(path.join(projectDir, '.claude', 'skills', 'log', 'SKILL.md'))).toBe(true)
    })

    it('removes .claude/skills/recall/SKILL.md', async () => {
      await runUninstall(projectDir)
      expect(await notExists(path.join(projectDir, '.claude', 'skills', 'recall', 'SKILL.md'))).toBe(true)
    })

    it('removes CLAUDE.md marker block', async () => {
      await runUninstall(projectDir)
      const content = await readFile(path.join(projectDir, 'CLAUDE.md'), 'utf-8')
      expect(content).not.toContain('<!-- whydone:start -->')
      expect(content).not.toContain('<!-- whydone:end -->')
    })

    it('removes the lock-file', async () => {
      await runUninstall(projectDir)
      expect(await notExists(path.join(projectDir, '.claude', 'whydone.lock.json'))).toBe(true)
    })

    it('preserves .whydone/ by default (user memory — D-06)', async () => {
      // Create an entry in .whydone/ to ensure it is not deleted
      await writeFile(path.join(projectDir, '.whydone', 'my-entry.md'), 'test entry', 'utf-8')
      await runUninstall(projectDir)
      // .whydone/ must still exist
      await expect(access(path.join(projectDir, '.whydone'))).resolves.toBeUndefined()
      // entry must still exist
      await expect(access(path.join(projectDir, '.whydone', 'my-entry.md'))).resolves.toBeUndefined()
    })

    it('--purge also removes .whydone/', async () => {
      await runUninstall(projectDir, { purge: true })
      expect(await notExists(path.join(projectDir, '.whydone'))).toBe(true)
    })
  })

  describe('when lock-file is missing', () => {
    it('exits with non-zero code and prints a human-readable error', async () => {
      // projectDir has no init — no lock-file
      const originalCwd = process.cwd()
      process.chdir(projectDir)

      const stdoutCapture: string[] = []
      const stderrCapture: string[] = []
      const originalStdoutWrite = process.stdout.write.bind(process.stdout)
      const originalStderrWrite = process.stderr.write.bind(process.stderr)
      // @ts-ignore
      process.stdout.write = (chunk: unknown) => { stdoutCapture.push(String(chunk)); return true }
      // @ts-ignore
      process.stderr.write = (chunk: unknown) => { stderrCapture.push(String(chunk)); return true }

      // Intercept process.exit to avoid actually exiting the test process
      let exitCode: number | undefined
      const originalExit = process.exit
      process.exit = ((code?: number | string) => {
        exitCode = typeof code === 'string' ? parseInt(code, 10) : code
        throw new Error(`process.exit(${code})`)
      }) as typeof process.exit

      let caughtError: Error | undefined
      try {
        await (uninstallCommand as any).run({
          args: { purge: false, 'dry-run': false, quiet: false, 'no-color': true },
        })
      } catch (err) {
        caughtError = err as Error
      } finally {
        // @ts-ignore
        process.stdout.write = originalStdoutWrite
        // @ts-ignore
        process.stderr.write = originalStderrWrite
        process.exit = originalExit
        process.chdir(originalCwd)
      }

      // Either process.exit(1) was called or an error was thrown
      const output = [...stdoutCapture, ...stderrCapture].join('')
      expect(exitCode).toBe(1)
      expect(output.toLowerCase()).toMatch(/not installed|lock.file|whydone/)
    })

    it('does not crash with an unhandled exception when lock-file is missing', async () => {
      // Calling uninstall when not installed should throw our controlled exit, not an uncaught exception
      const originalCwd = process.cwd()
      process.chdir(projectDir)

      let exitCode: number | undefined
      const originalExit = process.exit
      process.exit = ((code?: number | string) => {
        exitCode = typeof code === 'string' ? parseInt(code, 10) : code
        throw new Error(`process.exit(${code})`)
      }) as typeof process.exit

      // Suppress output
      const noop = () => true
      // @ts-ignore
      process.stdout.write = noop
      // @ts-ignore
      process.stderr.write = noop
      const originalStdoutWrite = process.stdout.write
      const originalStderrWrite = process.stderr.write

      let caughtError: unknown
      try {
        await (uninstallCommand as any).run({
          args: { purge: false, 'dry-run': false, quiet: true, 'no-color': true },
        })
      } catch (err) {
        caughtError = err
      } finally {
        process.exit = originalExit
        // @ts-ignore
        process.stdout.write = originalStdoutWrite
        // @ts-ignore
        process.stderr.write = originalStderrWrite
        process.chdir(originalCwd)
      }

      // Should have called process.exit(1) — not thrown an unexpected Error
      expect(exitCode).toBe(1)
    })
  })

  describe('--dry-run', () => {
    beforeEach(async () => {
      await runInit(projectDir)
    })

    it('does not delete any files during dry-run', async () => {
      const originalCwd = process.cwd()
      process.chdir(projectDir)

      const stdoutCapture: string[] = []
      const originalWrite = process.stdout.write.bind(process.stdout)
      // @ts-ignore
      process.stdout.write = (chunk: unknown) => { stdoutCapture.push(String(chunk)); return true }

      try {
        await (uninstallCommand as any).run({
          args: { purge: false, 'dry-run': true, quiet: false, 'no-color': true },
        })
      } finally {
        // @ts-ignore
        process.stdout.write = originalWrite
        process.chdir(originalCwd)
      }

      // All files should still exist after dry-run
      await expect(access(path.join(projectDir, '.claude', 'skills', 'log', 'SKILL.md'))).resolves.toBeUndefined()
      await expect(access(path.join(projectDir, '.claude', 'skills', 'recall', 'SKILL.md'))).resolves.toBeUndefined()
      await expect(access(path.join(projectDir, '.claude', 'whydone.lock.json'))).resolves.toBeUndefined()

      // Stdout should include [remove] lines
      const output = stdoutCapture.join('')
      expect(output).toContain('[remove]')
    })
  })

  // ---- v0.2: Stop hook cleanup, scoping, --purge coverage (design §3.6, §10.2) ----

  describe('Stop hook cleanup (scoped)', () => {
    let fakeHome: string
    let savedHome: string | undefined
    let savedUserProfile: string | undefined

    beforeEach(async () => {
      fakeHome = await mkdtemp(path.join(tmpdir(), 'whydone-uninstall-home-'))
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
      await rm(fakeHome, { recursive: true, force: true })
    })

    it('project uninstall removes the project hook + launcher and leaves the global hook untouched', async () => {
      // Populated fake-home global Stop hook (as if another project installed it).
      const globalSettings = path.join(fakeHome, '.claude', 'settings.json')
      const globalLauncher = path.join(fakeHome, '.claude', 'whydone-hook.cjs')
      await mkdir(path.dirname(globalSettings), { recursive: true })
      await writeFile(globalLauncher, buildLauncherSource(), 'utf-8')
      await installStopHook(globalSettings, globalLauncher)

      await runInit(projectDir, { mode: 'ask' })
      const projectSettings = path.join(projectDir, '.claude', 'settings.local.json')
      expect(await hasStopHook(projectSettings)).toBe(true)

      await runUninstall(projectDir)

      expect(await hasStopHook(projectSettings)).toBe(false)
      expect(existsSync(path.join(projectDir, '.claude', 'whydone-hook.cjs'))).toBe(false)
      // The cross-project collateral pin: global hook + launcher survive.
      expect(await hasStopHook(globalSettings)).toBe(true)
      expect(existsSync(globalLauncher)).toBe(true)
    })

    it('--global removes only the global hook', async () => {
      await runInit(projectDir, { mode: 'ask' }) // project install with hook
      await runInit(projectDir, { mode: 'ask', global: true }) // global install with hook

      await runUninstall(projectDir, { global: true })

      expect(await hasStopHook(path.join(fakeHome, '.claude', 'settings.json'))).toBe(false)
      expect(existsSync(path.join(fakeHome, '.claude', 'whydone-hook.cjs'))).toBe(false)
      // Project hook untouched by the global uninstall.
      expect(await hasStopHook(path.join(projectDir, '.claude', 'settings.local.json'))).toBe(true)
    })

    it("the user's other Stop hooks survive", async () => {
      const projectSettings = path.join(projectDir, '.claude', 'settings.local.json')
      await mkdir(path.dirname(projectSettings), { recursive: true })
      const userGroup = { hooks: [{ type: 'command', command: 'my-own-check.sh' }] }
      await writeFile(projectSettings, JSON.stringify({ hooks: { Stop: [userGroup] } }, null, 2), 'utf-8')

      await runInit(projectDir, { mode: 'ask' })
      await runUninstall(projectDir)

      const parsed = JSON.parse(await readFile(projectSettings, 'utf-8'))
      expect(parsed.hooks.Stop).toEqual([userGroup])
    })

    it('launcher present but no marker handler ⇒ warn message', async () => {
      await runInit(projectDir) // manual mode — no hook installed
      // Simulate a hand-edited setup: launcher exists, settings has no marker.
      await writeFile(
        path.join(projectDir, '.claude', 'whydone-hook.cjs'),
        buildLauncherSource(),
        'utf-8',
      )

      const stderrChunks: string[] = []
      const originalStderr = process.stderr.write.bind(process.stderr)
      // @ts-ignore
      process.stderr.write = (chunk: unknown) => { stderrChunks.push(String(chunk)); return true }
      try {
        await runUninstall(projectDir)
      } finally {
        // @ts-ignore
        process.stderr.write = originalStderr
      }
      expect(stderrChunks.join('')).toContain('no whydone Stop hook found')
      expect(stderrChunks.join('')).toContain('remove it manually')
    })

    it('--purge removes config.json and .cache along with the journal dir', async () => {
      await runInit(projectDir, { mode: 'ask', hook: false })
      await expect(access(path.join(projectDir, '.whydone', 'config.json'))).resolves.toBeUndefined()
      await expect(access(path.join(projectDir, '.whydone', '.cache', '.gitignore'))).resolves.toBeUndefined()

      await runUninstall(projectDir, { purge: true })

      expect(existsSync(path.join(projectDir, '.whydone'))).toBe(false)
    })
  })
})
