/**
 * Tests for the init-written Stop-hook launcher (design §3.1, §10.1).
 *
 * buildLauncherSource() output is written to a temp .claude/whydone-hook.cjs
 * and spawned with plain node — pinning the fail-open contract: the launcher
 * CANNOT exit non-zero, and it never propagates a child failure.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtemp, rm, mkdir, writeFile } from 'node:fs/promises'
import { spawnSync } from 'node:child_process'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { buildLauncherSource } from '../src/lib/settings-hooks.js'

describe('whydone-hook.cjs launcher', () => {
  let dir: string
  let launcherPath: string

  beforeEach(async () => {
    dir = await mkdtemp(path.join(tmpdir(), 'whydone-launcher-test-'))
    await mkdir(path.join(dir, '.claude'), { recursive: true })
    launcherPath = path.join(dir, '.claude', 'whydone-hook.cjs')
    await writeFile(launcherPath, buildLauncherSource(), 'utf-8')
  })

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true })
  })

  function runLauncher(projectDir: string, input = '{}'): ReturnType<typeof spawnSync<string>> {
    return spawnSync(process.execPath, [launcherPath], {
      input,
      encoding: 'utf8',
      timeout: 20000,
      env: { ...process.env, CLAUDE_PROJECT_DIR: projectDir },
    })
  }

  /** Scaffold a stub whydone package under projectDir/node_modules. */
  async function writeStub(projectDir: string, cliBody: string): Promise<void> {
    const pkgDir = path.join(projectDir, 'node_modules', 'whydone')
    await mkdir(path.join(pkgDir, 'dist'), { recursive: true })
    await writeFile(
      path.join(pkgDir, 'package.json'),
      JSON.stringify({ name: 'whydone', version: '0.0.0-stub', bin: { whydone: './dist/cli.js' } }),
      'utf-8',
    )
    await writeFile(path.join(pkgDir, 'dist', 'cli.js'), cliBody, 'utf-8')
  }

  it('dir without .whydone/ ⇒ exit 0, empty stdout, fast (< 2 s)', () => {
    const started = Date.now()
    const r = runLauncher(dir)
    const elapsed = Date.now() - started
    expect(r.status).toBe(0)
    expect(r.stdout).toBe('')
    expect(elapsed).toBeLessThan(2000)
  })

  it('with .whydone/ but whydone unresolvable ⇒ exit 0, empty stdout', async () => {
    await mkdir(path.join(dir, '.whydone'))
    const r = runLauncher(dir)
    expect(r.status).toBe(0)
    expect(r.stdout).toBe('')
  })

  it('stub CLI that echoes ⇒ stdout forwarded, exit 0', async () => {
    await mkdir(path.join(dir, '.whydone'))
    await writeStub(dir, "process.stdout.write('{\"decision\":\"block\",\"reason\":\"stub\"}\\n')\n")
    const r = runLauncher(dir)
    expect(r.status).toBe(0)
    expect(r.stdout).toBe('{"decision":"block","reason":"stub"}\n')
  })

  it('stub receives the launcher stdin unchanged and the hook/stop argv', async () => {
    await mkdir(path.join(dir, '.whydone'))
    await writeStub(
      dir,
      "const data = require('node:fs').readFileSync(0, 'utf8');\n" +
        "process.stdout.write(JSON.stringify({ argv: process.argv.slice(2), stdin: data }))\n",
    )
    const r = runLauncher(dir, '{"session_id":"s1"}')
    expect(r.status).toBe(0)
    const parsed = JSON.parse(r.stdout)
    expect(parsed.argv).toEqual(['hook', 'stop'])
    expect(parsed.stdin).toBe('{"session_id":"s1"}')
  })

  it('stub that exits 1 ⇒ exit 0, empty stdout (launcher never propagates failure)', async () => {
    await mkdir(path.join(dir, '.whydone'))
    await writeStub(dir, "process.stdout.write('partial'); process.exit(1)\n")
    const r = runLauncher(dir)
    expect(r.status).toBe(0)
    expect(r.stdout).toBe('')
  })

  it('stub that throws ⇒ exit 0, empty stdout', async () => {
    await mkdir(path.join(dir, '.whydone'))
    await writeStub(dir, "throw new Error('boom')\n")
    const r = runLauncher(dir)
    expect(r.status).toBe(0)
    expect(r.stdout).toBe('')
  })

  it(
    'stub that sleeps past the 8 s spawn timeout ⇒ exit 0, empty stdout',
    { timeout: 20000 },
    async () => {
      await mkdir(path.join(dir, '.whydone'))
      await writeStub(dir, "setTimeout(() => { process.stdout.write('late') }, 10000)\n")
      const r = runLauncher(dir)
      expect(r.status).toBe(0)
      expect(r.stdout).toBe('')
    },
  )

  it('source is deterministic and contains no absolute paths', () => {
    const src = buildLauncherSource()
    expect(src).toBe(buildLauncherSource())
    expect(src).not.toMatch(/(^|[^:])\/(Users|home|private|var|tmp)\//)
    expect(src).not.toContain('\\\\') // no Windows path literals either
  })
})
