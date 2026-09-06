/**
 * THIRD_PARTY_NOTICES.md must name every package the bundler inlined into the
 * vendored CLI. rolldown leaves one `//#region node_modules/<pkg>/…` marker per
 * inlined source file, so the package list is read off the artifact itself,
 * never off package.json: a transitive dependency that newly lands in the
 * bundle fails this suite until its notice is added, a notice whose package
 * left the bundle fails it as stale, and a dependency bump fails it until the
 * notice's version (and, if it changed, its license text) is refreshed.
 */

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const bundle = readFileSync(path.join(ROOT, 'cli', 'whydone.mjs'), 'utf-8')
const notices = readFileSync(path.join(ROOT, 'THIRD_PARTY_NOTICES.md'), 'utf-8')

// `//#region node_modules/@scope/name/...` or `//#region node_modules/name/...`
const REGION = /^\/\/#region node_modules\/((?:@[^/\s]+\/)?[^/\s]+)\//gm
const bundled = [...new Set([...bundle.matchAll(REGION)].map((m) => m[1]))].sort()

// One `## <package> <version>` heading per notice.
const HEADING = /^## (\S+) (\S+)$/gm
const listed = [...notices.matchAll(HEADING)].map((m) => ({ pkg: m[1], version: m[2] }))

// Inlined by another bundled package's own dist: no region marker, not in node_modules.
const NESTED = ['scule']

describe('THIRD_PARTY_NOTICES.md vs the packages inlined into cli/whydone.mjs', () => {
  it('reads a non-empty package list off the bundle region markers', () => {
    expect(bundled.length).toBeGreaterThan(0)
    expect(bundled).toContain('citty')
  })

  it('has a `## <package> <version>` notice for every bundled package', () => {
    const names = listed.map((n) => n.pkg)
    for (const pkg of bundled) expect(names, `missing notice for ${pkg}`).toContain(pkg)
  })

  it('lists no package that is not in the bundle', () => {
    for (const { pkg } of listed) {
      if (NESTED.includes(pkg)) continue
      expect(bundled, `${pkg} is listed but no longer bundled`).toContain(pkg)
    }
  })

  it('pins each notice to the version installed in node_modules', () => {
    for (const { pkg, version } of listed) {
      if (NESTED.includes(pkg)) continue
      const installed = JSON.parse(
        readFileSync(path.join(ROOT, 'node_modules', pkg, 'package.json'), 'utf-8'),
      ).version
      expect(version, `${pkg} notice version`).toBe(installed)
    }
  })
})
