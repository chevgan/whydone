/**
 * Template lint tests for templates/skills/recall/SKILL.md
 *
 * Pins the load-bearing parts of the /recall skill per 04-DESIGN.md §2/§7:
 * frontmatter parses via splitFrontmatter, disable-model-invocation is false,
 * allowed-tools is the comma-separated Tool(prefix:*) form (the space-
 * separated form silently disables pre-approval), and the body contains
 * the offline-safe invocation, the verbatim follow-ups heading, the
 * 5-file cap, the stem-reconstruction rule, and the read-only rule.
 */

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { splitFrontmatter } from '../src/lib/frontmatter.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const TEMPLATE_PATH = path.join(__dirname, '..', 'templates', 'skills', 'recall', 'SKILL.md')

const raw = readFileSync(TEMPLATE_PATH, 'utf-8')
const parsed = splitFrontmatter(raw)

describe('recall SKILL.md — frontmatter', () => {
  it('parses via splitFrontmatter without error', () => {
    expect(() => splitFrontmatter(raw)).not.toThrow()
    expect(parsed.data).toBeTypeOf('object')
  })

  it('name is "recall"', () => {
    expect(parsed.data.name).toBe('recall')
  })

  it('disable-model-invocation === false (recall may auto-fire)', () => {
    expect(parsed.data['disable-model-invocation']).toBe(false)
  })

  it('has a non-empty description and argument-hint', () => {
    expect(parsed.data.description).toBeTypeOf('string')
    expect(parsed.data.description.length).toBeGreaterThan(0)
    expect(parsed.data['argument-hint']).toBeTypeOf('string')
  })

  it('allowed-tools is a comma-separated string', () => {
    const allowedTools = parsed.data['allowed-tools']
    expect(allowedTools).toBeTypeOf('string')
    expect(allowedTools).toContain(', ')
  })

  it('allowed-tools contains Bash(npx --no-install whydone recall:*) and Read', () => {
    const allowedTools = parsed.data['allowed-tools'] as string
    const tools = allowedTools.split(',').map((t) => t.trim())
    expect(tools).toContain('Bash(npx --no-install whydone recall:*)')
    expect(tools).toContain('Read')
  })

  it('allowed-tools pre-approves the plugin-vendored CLI invocation', () => {
    const allowedTools = parsed.data['allowed-tools'] as string
    const tools = allowedTools.split(',').map((t) => t.trim())
    expect(tools).toContain('Bash(node "${CLAUDE_PLUGIN_ROOT}/bin/whydone.mjs" recall:*)')
  })

  it('allowed-tools never pre-approves plain npx (network fetch the body forbids)', () => {
    const allowedTools = parsed.data['allowed-tools'] as string
    const tools = allowedTools.split(',').map((t) => t.trim())
    expect(tools).not.toContain('Bash(npx whydone recall:*)')
    expect(tools).not.toContain('Bash(npx whydone:*)')
  })

  it('allowed-tools uses the Tool(prefix:*) colon form, not the space form', () => {
    const allowedTools = parsed.data['allowed-tools'] as string
    expect(allowedTools).toContain('recall:*')
    expect(allowedTools).not.toContain('recall*)')
  })
})

describe('recall SKILL.md — body content', () => {
  const body = parsed.content

  it('contains the offline-safe invocation "npx --no-install whydone recall --json"', () => {
    expect(body).toContain('npx --no-install whydone recall --json')
  })

  it('resolution chain tries the plugin-vendored CLI first, with the placeholder-skip rule', () => {
    expect(body).toContain('node "${CLAUDE_PLUGIN_ROOT}/bin/whydone.mjs" recall --json')
    expect(body).toContain('unsubstituted `${CLAUDE_PLUGIN_ROOT}` placeholder')
  })

  it('contains the verbatim heading "## Verify-later / follow-ups"', () => {
    expect(body).toContain('## Verify-later / follow-ups')
  })

  it('contains the 5-file expansion cap', () => {
    expect(body).toContain('at most 5 files')
    expect(body).toContain('5-file cap')
  })

  it('contains the degraded-mode stem-reconstruction rule', () => {
    expect(body).toContain("stem = date with hyphens stripped + '-' + slug")
  })

  it('contains the read-only rule', () => {
    expect(body.toLowerCase()).toContain('read-only')
    expect(body).toContain('never create, edit, or delete anything in `.whydone/`')
  })

  it('forbids plain npx (network fetch mid-skill)', () => {
    expect(body).toContain('Plain `npx`')
    expect(body).toContain('forbidden')
  })

  it('documents the node_modules/.bin fallback', () => {
    expect(body).toContain('node_modules/.bin/whydone recall')
  })

  it('documents the superseder swap toward the lexicographically greatest id', () => {
    expect(body).toContain('lexicographically greatest')
    expect(body).toContain('counts against the 5-file cap')
  })

  it('caps the briefing at ~30 lines', () => {
    expect(body).toContain('under ~30 lines')
  })

  // ─── Query expansion + score cutoff (06-DESIGN §5, pinned by §10.2) ─────────

  it('expands queries bilingually with synonyms and morphological stems', () => {
    expect(body).toContain('Russian AND English variants')
    expect(body).toContain('morphological stem')
  })

  it('knows the CLI tokenizer cap of 20 tokens (expansion headroom)', () => {
    expect(body).toContain('caps at 20 tokens')
  })

  it('no longer forbids translation (replaced by the expansion rule)', () => {
    expect(body).not.toContain('do not translate')
  })

  it('applies the score-aware cutoff at 25% of the top score, never skipping the top result', () => {
    expect(body).toContain('0.25 × TOP')
    expect(body).toContain('never skipped')
  })
})
