/**
 * Unit tests for src/lib/settings-hooks.ts (design §3.1, §3.3, §10.1).
 *
 * Pins: shell-dialect-free command, marker-surgical install/remove,
 * formatting preservation, user-timeout preservation, optimistic-lock write.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtemp, rm, readFile, writeFile } from 'node:fs/promises'
import { readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import {
  HOOK_MARKER,
  buildHookCommand,
  buildLauncherSource,
  installStopHook,
  removeStopHook,
  hasStopHook,
  _testSeams,
} from '../src/lib/settings-hooks.js'

describe('settings-hooks', () => {
  let dir: string
  let settingsPath: string
  const launcherPath = '/abs/path/.claude/whydone-hook.cjs'

  beforeEach(async () => {
    dir = await mkdtemp(path.join(tmpdir(), 'whydone-settings-test-'))
    settingsPath = path.join(dir, 'settings.local.json')
    delete _testSeams.beforeWrite
  })

  afterEach(async () => {
    delete _testSeams.beforeWrite
    await rm(dir, { recursive: true, force: true })
  })

  describe('buildHookCommand', () => {
    it('is exactly node "<launcherPath>" and contains the marker', () => {
      const cmd = buildHookCommand(launcherPath)
      expect(cmd).toBe(`node "${launcherPath}"`)
      expect(cmd).toContain(HOOK_MARKER)
    })

    it('contains NO shell dialect: no ||, no cd , no ${', () => {
      const cmd = buildHookCommand(launcherPath)
      expect(cmd).not.toContain('||')
      expect(cmd).not.toContain('cd ')
      expect(cmd).not.toContain('${')
    })
  })

  describe('installStopHook', () => {
    it('install into missing file creates {hooks:{Stop:[…]}} with timeout 10', async () => {
      const result = await installStopHook(settingsPath, launcherPath)
      expect(result).toBe('installed')
      const raw = await readFile(settingsPath, 'utf-8')
      const parsed = JSON.parse(raw)
      expect(parsed.hooks.Stop).toHaveLength(1)
      expect(parsed.hooks.Stop[0].hooks).toHaveLength(1)
      const handler = parsed.hooks.Stop[0].hooks[0]
      expect(handler.type).toBe('command')
      expect(handler.command).toBe(`node "${launcherPath}"`)
      expect(handler.timeout).toBe(10)
      expect(raw).toContain('"timeout": 10')
      expect(raw).not.toContain('||')
      expect(raw).not.toContain('${')
    })

    it('preserves unrelated top-level keys, key order, and 4-space indentation', async () => {
      const original =
        JSON.stringify(
          {
            permissions: { allow: ['Bash(ls:*)'] },
            env: { FOO: 'bar' },
            hooks: { PostToolUse: [{ hooks: [{ type: 'command', command: 'echo hi' }] }] },
          },
          null,
          4,
        ) + '\n'
      await writeFile(settingsPath, original, 'utf-8')

      const result = await installStopHook(settingsPath, launcherPath)
      expect(result).toBe('installed')

      const raw = await readFile(settingsPath, 'utf-8')
      const parsed = JSON.parse(raw)
      expect(parsed.permissions).toEqual({ allow: ['Bash(ls:*)'] })
      expect(parsed.env).toEqual({ FOO: 'bar' })
      expect(parsed.hooks.PostToolUse).toEqual([{ hooks: [{ type: 'command', command: 'echo hi' }] }])
      // Key order preserved (in-place mutation)
      expect(Object.keys(parsed)).toEqual(['permissions', 'env', 'hooks'])
      // 4-space indent detected and reused; trailing newline preserved
      expect(raw).toContain('\n    "permissions"')
      expect(raw.endsWith('\n')).toBe(true)
      // Everything outside the hooks.Stop mutation is byte-comparable
      const reserialized = JSON.stringify(parsed, null, 4) + '\n'
      expect(raw).toBe(reserialized)
    })

    it('preserves pre-existing user Stop groups verbatim', async () => {
      const userGroup = { hooks: [{ type: 'command', command: 'my-own-stop-check.sh', timeout: 5 }] }
      await writeFile(settingsPath, JSON.stringify({ hooks: { Stop: [userGroup] } }, null, 2), 'utf-8')

      await installStopHook(settingsPath, launcherPath)
      const parsed = JSON.parse(await readFile(settingsPath, 'utf-8'))
      expect(parsed.hooks.Stop).toHaveLength(2)
      expect(parsed.hooks.Stop[0]).toEqual(userGroup)
    })

    it('double install is idempotent: returns updated, single marker handler', async () => {
      expect(await installStopHook(settingsPath, launcherPath)).toBe('installed')
      expect(await installStopHook(settingsPath, launcherPath)).toBe('updated')
      const parsed = JSON.parse(await readFile(settingsPath, 'utf-8'))
      const markerHandlers = parsed.hooks.Stop.flatMap((g: { hooks: Array<{ command?: string }> }) =>
        g.hooks.filter((h) => typeof h.command === 'string' && h.command.includes(HOOK_MARKER)),
      )
      expect(markerHandlers).toHaveLength(1)
    })

    it('refresh preserves a user-raised timeout (60 stays 60)', async () => {
      await installStopHook(settingsPath, launcherPath)
      const parsed = JSON.parse(await readFile(settingsPath, 'utf-8'))
      parsed.hooks.Stop[0].hooks[0].timeout = 60
      await writeFile(settingsPath, JSON.stringify(parsed, null, 2), 'utf-8')

      const newLauncher = '/new/abs/path/.claude/whydone-hook.cjs'
      expect(await installStopHook(settingsPath, newLauncher)).toBe('updated')
      const after = JSON.parse(await readFile(settingsPath, 'utf-8'))
      expect(after.hooks.Stop[0].hooks[0].timeout).toBe(60)
      expect(after.hooks.Stop[0].hooks[0].command).toBe(`node "${newLauncher}"`)
    })

    it('resets an invalid timeout to 10', async () => {
      await installStopHook(settingsPath, launcherPath)
      const parsed = JSON.parse(await readFile(settingsPath, 'utf-8'))
      parsed.hooks.Stop[0].hooks[0].timeout = 'forever'
      await writeFile(settingsPath, JSON.stringify(parsed, null, 2), 'utf-8')

      await installStopHook(settingsPath, launcherPath)
      const after = JSON.parse(await readFile(settingsPath, 'utf-8'))
      expect(after.hooks.Stop[0].hooks[0].timeout).toBe(10)
    })

    it('invalid JSON ⇒ invalid-json and file bytes untouched', async () => {
      const garbage = '{ "hooks": [broken,, }'
      await writeFile(settingsPath, garbage, 'utf-8')
      expect(await installStopHook(settingsPath, launcherPath)).toBe('invalid-json')
      expect(await readFile(settingsPath, 'utf-8')).toBe(garbage)
    })

    it('optimistic lock: one concurrent mutation ⇒ retry succeeds and preserves it', async () => {
      await writeFile(settingsPath, JSON.stringify({ env: { A: '1' } }, null, 2), 'utf-8')
      let mutations = 0
      _testSeams.beforeWrite = () => {
        if (mutations === 0) {
          mutations++
          // Simulate Claude Code granting a permission mid-write.
          const now = JSON.parse(readFileSync(settingsPath, 'utf-8'))
          now.permissions = { allow: ['Bash(git:*)'] }
          writeFileSync(settingsPath, JSON.stringify(now, null, 2), 'utf-8')
        }
      }
      const result = await installStopHook(settingsPath, launcherPath)
      expect(result).toBe('installed')
      const parsed = JSON.parse(await readFile(settingsPath, 'utf-8'))
      // Both the concurrent write AND our hook survived.
      expect(parsed.permissions).toEqual({ allow: ['Bash(git:*)'] })
      expect(parsed.hooks.Stop).toHaveLength(1)
    })

    it('optimistic lock: two concurrent mutations ⇒ conflict, file untouched', async () => {
      await writeFile(settingsPath, JSON.stringify({ env: { A: '1' } }, null, 2), 'utf-8')
      let mutations = 0
      _testSeams.beforeWrite = () => {
        mutations++
        const now = JSON.parse(readFileSync(settingsPath, 'utf-8'))
        now[`concurrent${mutations}`] = true
        writeFileSync(settingsPath, JSON.stringify(now, null, 2), 'utf-8')
      }
      const result = await installStopHook(settingsPath, launcherPath)
      expect(result).toBe('conflict')
      const parsed = JSON.parse(await readFile(settingsPath, 'utf-8'))
      // The last concurrent write is intact; no hook was written.
      expect(parsed.concurrent2).toBe(true)
      expect(parsed.hooks).toBeUndefined()
    })
  })

  describe('removeStopHook', () => {
    it('removes only marker handlers and prunes empty Stop/hooks', async () => {
      await installStopHook(settingsPath, launcherPath)
      expect(await removeStopHook(settingsPath)).toBe('removed')
      const parsed = JSON.parse(await readFile(settingsPath, 'utf-8'))
      expect(parsed.hooks).toBeUndefined()
    })

    it('leaves user groups and other hook events intact', async () => {
      const userStop = { hooks: [{ type: 'command', command: 'my-check.sh' }] }
      const post = [{ hooks: [{ type: 'command', command: 'fmt.sh' }] }]
      await writeFile(
        settingsPath,
        JSON.stringify({ hooks: { Stop: [userStop], PostToolUse: post } }, null, 2),
        'utf-8',
      )
      await installStopHook(settingsPath, launcherPath)
      expect(await removeStopHook(settingsPath)).toBe('removed')
      const parsed = JSON.parse(await readFile(settingsPath, 'utf-8'))
      expect(parsed.hooks.Stop).toEqual([userStop])
      expect(parsed.hooks.PostToolUse).toEqual(post)
    })

    it('missing file ⇒ absent', async () => {
      expect(await removeStopHook(settingsPath)).toBe('absent')
    })

    it('no marker present ⇒ absent, file untouched', async () => {
      const original = JSON.stringify({ hooks: { Stop: [{ hooks: [{ type: 'command', command: 'x' }] }] } }, null, 2)
      await writeFile(settingsPath, original, 'utf-8')
      expect(await removeStopHook(settingsPath)).toBe('absent')
      expect(await readFile(settingsPath, 'utf-8')).toBe(original)
    })

    it('invalid JSON ⇒ invalid-json, file untouched', async () => {
      await writeFile(settingsPath, 'nope{', 'utf-8')
      expect(await removeStopHook(settingsPath)).toBe('invalid-json')
      expect(await readFile(settingsPath, 'utf-8')).toBe('nope{')
    })
  })

  describe('hasStopHook', () => {
    it('false for missing file, true after install, false after remove', async () => {
      expect(await hasStopHook(settingsPath)).toBe(false)
      await installStopHook(settingsPath, launcherPath)
      expect(await hasStopHook(settingsPath)).toBe(true)
      await removeStopHook(settingsPath)
      expect(await hasStopHook(settingsPath)).toBe(false)
    })
  })

  describe('buildLauncherSource', () => {
    it('is deterministic and contains no absolute paths', () => {
      const src = buildLauncherSource()
      expect(src).toBe(buildLauncherSource())
      expect(src).not.toMatch(/\/(Users|home|tmp)\//)
      expect(src).toContain('CLAUDE_PROJECT_DIR')
      expect(src).toContain("'hook', 'stop'")
      expect(src).toContain('process.exit(0)')
    })
  })
})
