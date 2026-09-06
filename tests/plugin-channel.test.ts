/**
 * Plugin-channel contract tests.
 *
 * The plugin serves the same templates/skills/ but carries its own CLI copy
 * (cli/whydone.mjs, vendored from dist/cli.js by scripts/sync-plugin-cli.mjs)
 * and its own Stop hook (hooks/hooks.json). These tests pin the cross-file
 * agreement: every reference to the vendored CLI must use the exact same
 * ${CLAUDE_PLUGIN_ROOT}-relative path, and the hook must call the same
 * subcommand the settings-based launcher calls.
 */

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.join(__dirname, '..')

const VENDORED_CLI = '${CLAUDE_PLUGIN_ROOT}/cli/whydone.mjs'

const readJson = (p: string) => JSON.parse(readFileSync(path.join(ROOT, p), 'utf-8'))
const readText = (p: string) => readFileSync(path.join(ROOT, p), 'utf-8')

describe('plugin manifest wiring', () => {
  it('plugin.json points skills at templates/skills and does NOT redeclare the default hooks path', () => {
    const plugin = readJson('.claude-plugin/plugin.json')
    expect(plugin.skills).toBe('./templates/skills')
    // hooks/hooks.json is auto-loaded from its standard location; referencing
    // it from manifest.hooks too makes Claude Code fail the whole plugin with
    // "Duplicate hooks file detected" (field is for ADDITIONAL hook files only).
    expect(plugin.hooks).toBeUndefined()
  })

  it('plugin.json version matches package.json (same guard as check-versions.mjs)', () => {
    const plugin = readJson('.claude-plugin/plugin.json')
    const pkg = readJson('package.json')
    expect(plugin.version).toBe(pkg.version)
  })
})

describe('plugin Stop hook (hooks/hooks.json)', () => {
  const hooks = readJson('hooks/hooks.json')

  it('declares exactly one Stop command hook', () => {
    const stop = hooks.hooks.Stop
    expect(Array.isArray(stop)).toBe(true)
    expect(stop).toHaveLength(1)
    expect(stop[0].hooks).toHaveLength(1)
    expect(stop[0].hooks[0].type).toBe('command')
  })

  it('invokes the vendored CLI `hook stop` with a 10s timeout, quoting the path', () => {
    const cmd = hooks.hooks.Stop[0].hooks[0]
    expect(cmd.command).toBe(`node "${VENDORED_CLI}" hook stop`)
    expect(cmd.timeout).toBe(10)
  })
})

describe('vendored-CLI path consistency across the plugin surface', () => {
  it('both skills reference the exact hooks.json path spelling', () => {
    for (const skill of ['log', 'recall']) {
      const body = readText(`templates/skills/${skill}/SKILL.md`)
      expect(body, `${skill} SKILL.md must reference the vendored CLI`).toContain(VENDORED_CLI)
    }
  })

  it('sync-plugin-cli.mjs produces the path the hook and skills reference', () => {
    const script = readText('scripts/sync-plugin-cli.mjs')
    expect(script).toContain("'cli/whydone.mjs'")
    // hooks.json path minus the plugin-root placeholder
    expect(VENDORED_CLI.replace('${CLAUDE_PLUGIN_ROOT}/', '')).toBe('cli/whydone.mjs')
  })
})
