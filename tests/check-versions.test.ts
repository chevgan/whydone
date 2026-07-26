/**
 * Tests for scripts/check-versions.mjs (design §9.5, §10.1).
 *
 * The script is cwd-relative BY DESIGN (red-team resolution #12): prepack,
 * CI, and this test all guarantee cwd = the directory holding package.json.
 * Spawning it against fixture pairs in a temp dir is exactly what pins that
 * contract — a refactor to import.meta.url-relative resolution (the rejected
 * broken pattern) makes these tests fail with ENOENT.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { spawnSync } from 'node:child_process'
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const SCRIPT = path.resolve(__dirname, '..', 'scripts', 'check-versions.mjs')

async function writeFixtures(dir: string, pkgVersion: string, pluginVersion: string): Promise<void> {
  await mkdir(path.join(dir, '.claude-plugin'), { recursive: true })
  await writeFile(
    path.join(dir, 'package.json'),
    JSON.stringify({ name: 'fixture', version: pkgVersion }, null, 2),
    'utf-8',
  )
  await writeFile(
    path.join(dir, '.claude-plugin', 'plugin.json'),
    JSON.stringify({ name: 'fixture', version: pluginVersion }, null, 2),
    'utf-8',
  )
}

function runScript(cwd: string): { status: number | null; stderr: string } {
  const r = spawnSync(process.execPath, [SCRIPT], { cwd, encoding: 'utf8' })
  return { status: r.status, stderr: r.stderr ?? '' }
}

describe('scripts/check-versions.mjs (cwd-relative prepack guard)', () => {
  let dir: string

  beforeEach(async () => {
    dir = await mkdtemp(path.join(tmpdir(), 'whydone-checkver-test-'))
  })

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true })
  })

  it('matching versions ⇒ exit 0, silent', async () => {
    await writeFixtures(dir, '0.2.0', '0.2.0')
    const r = runScript(dir)
    expect(r.status).toBe(0)
    expect(r.stderr).toBe('')
  })

  it('mismatching versions ⇒ exit 1 + message naming both versions', async () => {
    await writeFixtures(dir, '0.2.0', '0.1.0')
    const r = runScript(dir)
    expect(r.status).toBe(1)
    expect(r.stderr).toContain('version mismatch')
    expect(r.stderr).toContain('package.json=0.2.0')
    expect(r.stderr).toContain('.claude-plugin/plugin.json=0.1.0')
  })

  it('resolves against cwd, not the script location (§9.5 contract)', async () => {
    // The temp dir has NO manifests at all: a cwd-relative script fails here,
    // while the rejected import.meta.url-relative variant would read the real
    // repo manifests and pass. Non-zero exit pins cwd-relative resolution.
    const r = runScript(dir)
    expect(r.status).not.toBe(0)
  })
})
