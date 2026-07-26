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
import { readConfig, readConfigIfValid, writeConfigMode } from '../src/lib/config.js'

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
