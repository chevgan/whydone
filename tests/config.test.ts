/**
 * Unit tests for src/lib/config.ts (design §1, §10.1).
 *
 * readConfig is lenient: every failure mode degrades to { mode: 'manual' } —
 * the v0.1-compatible safety floor. writeConfigMode preserves unknown keys.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtemp, rm, readFile, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { isLanguageTag, readConfig, readConfigIfValid, writeConfigMode } from '../src/lib/config.js'

describe('readConfig', () => {
  let journalDir: string

  beforeEach(async () => {
    journalDir = await mkdtemp(path.join(tmpdir(), 'whydone-config-test-'))
  })

  afterEach(async () => {
    await rm(journalDir, { recursive: true, force: true })
  })

  const configPath = () => path.join(journalDir, 'config.json')

  it('missing file ⇒ manual', async () => {
    expect(await readConfig(journalDir)).toEqual({ mode: 'manual', storage: 'committed' })
  })

  it('invalid JSON ⇒ manual', async () => {
    await writeFile(configPath(), '{ not json !!', 'utf-8')
    expect(await readConfig(journalDir)).toEqual({ mode: 'manual', storage: 'committed' })
  })

  it('configVersion: 2 ⇒ manual (readers accept only 1)', async () => {
    await writeFile(configPath(), JSON.stringify({ configVersion: 2, mode: 'ask' }), 'utf-8')
    expect(await readConfig(journalDir)).toEqual({ mode: 'manual', storage: 'committed' })
  })

  it('unknown mode "suggest" ⇒ manual', async () => {
    await writeFile(configPath(), JSON.stringify({ configVersion: 1, mode: 'suggest' }), 'utf-8')
    expect(await readConfig(journalDir)).toEqual({ mode: 'manual', storage: 'committed' })
  })

  it('missing configVersion ⇒ manual', async () => {
    await writeFile(configPath(), JSON.stringify({ mode: 'ask' }), 'utf-8')
    expect(await readConfig(journalDir)).toEqual({ mode: 'manual', storage: 'committed' })
  })

  it('non-object JSON (array) ⇒ manual', async () => {
    await writeFile(configPath(), '["ask"]', 'utf-8')
    expect(await readConfig(journalDir)).toEqual({ mode: 'manual', storage: 'committed' })
  })

  it('ask round-trip via writeConfigMode', async () => {
    await writeConfigMode(journalDir, 'ask')
    expect(await readConfig(journalDir)).toEqual({ mode: 'ask', storage: 'committed' })
  })

  it('auto round-trip via writeConfigMode', async () => {
    await writeConfigMode(journalDir, 'auto')
    expect(await readConfig(journalDir)).toEqual({ mode: 'auto', storage: 'committed' })
  })

  it('written file has the exact §1.1 shape', async () => {
    await writeConfigMode(journalDir, 'ask')
    const raw = await readFile(configPath(), 'utf-8')
    expect(raw).toBe(JSON.stringify({ configVersion: 1, mode: 'ask' }, null, 2))
  })

  it('unknown keys are preserved by the read-modify-write', async () => {
    await writeFile(
      configPath(),
      JSON.stringify({ configVersion: 1, mode: 'ask', futureKnob: { x: 1 } }, null, 2),
      'utf-8',
    )
    await writeConfigMode(journalDir, 'auto')
    const parsed = JSON.parse(await readFile(configPath(), 'utf-8'))
    expect(parsed.mode).toBe('auto')
    expect(parsed.configVersion).toBe(1)
    expect(parsed.futureKnob).toEqual({ x: 1 })
  })

  it('readConfigIfValid distinguishes valid config from absence', async () => {
    expect(await readConfigIfValid(journalDir)).toBeNull()
    await writeConfigMode(journalDir, 'manual')
    expect(await readConfigIfValid(journalDir)).toEqual({ mode: 'manual', storage: 'committed' })
  })
})

describe('language (config key honored by /log)', () => {
  let journalDir: string

  beforeEach(async () => {
    journalDir = await mkdtemp(path.join(tmpdir(), 'whydone-config-lang-'))
  })

  afterEach(async () => {
    await rm(journalDir, { recursive: true, force: true })
  })

  const configPath = () => path.join(journalDir, 'config.json')

  it('round-trips through writeConfigMode and readConfig', async () => {
    await writeConfigMode(journalDir, 'ask', undefined, 'en')
    expect(await readConfig(journalDir)).toEqual({ mode: 'ask', storage: 'committed', language: 'en' })
    const raw = await readFile(configPath(), 'utf-8')
    expect(raw).toBe(JSON.stringify({ configVersion: 1, mode: 'ask', language: 'en' }, null, 2))
  })

  it('absent language ⇒ no key at all (never null, never a default)', async () => {
    await writeConfigMode(journalDir, 'ask')
    const cfg = await readConfig(journalDir)
    expect('language' in cfg).toBe(false)
  })

  it('a malformed language reads as absent — the skill falls back to the working language', async () => {
    for (const bad of ['English (US)', 42, null, '']) {
      await writeFile(configPath(), JSON.stringify({ configVersion: 1, mode: 'ask', language: bad }), 'utf-8')
      const cfg = await readConfig(journalDir)
      expect(cfg.mode, String(bad)).toBe('ask')
      expect('language' in cfg, String(bad)).toBe(false)
    }
  })

  it('survives mode-only and storage-only rewrites (init --mode, hide, publish)', async () => {
    await writeConfigMode(journalDir, 'ask', undefined, 'ru')
    await writeConfigMode(journalDir, 'auto')
    await writeConfigMode(journalDir, 'auto', 'local')
    const parsed = JSON.parse(await readFile(configPath(), 'utf-8'))
    expect(parsed).toEqual({ configVersion: 1, mode: 'auto', language: 'ru', storage: 'local' })
  })

  it('isLanguageTag accepts BCP-47-shaped tags only', () => {
    for (const ok of ['en', 'ru', 'pt-BR', 'zh-Hant', 'sr-Latn-RS']) {
      expect(isLanguageTag(ok), ok).toBe(true)
    }
    for (const bad of ['', 'e', 'english', 'en_US', 'en-', 'en US', 42, null, undefined]) {
      expect(isLanguageTag(bad), String(bad)).toBe(false)
    }
  })
})
