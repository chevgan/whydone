/**
 * Fixture round-trip tests for the /log skill's embedded schema contract
 * (Phase 3 design §5).
 *
 * Builds two fixture entries exactly per the contract embedded in
 * templates/skills/log/SKILL.md — a normal entry and a collision-suffixed
 * one — writes them to a real temp dir, and runs them through
 * parseEntry() + strictCheck(). Zero errors and zero warnings guards the
 * embedded contract against drift from the real validator.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { mkdtemp, rm, writeFile, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { strictCheck } from '../src/commands/validate.js'
import { parseEntry, CANONICAL_HEADINGS } from '../src/lib/parse-entry.js'

const NORMAL_STEM = '20260716-implement-log-write-path'
const COLLISION_STEM = '20260716-fix-auth-2'

/** Normal entry — every frontmatter rule from the skill's Step 5 contract. */
const NORMAL_ENTRY = `---
schema: 1
id: 20260716-implement-log-write-path
date: "2026-07-16"
slug: implement-log-write-path
task: "Implement the /log write-path skill"
tags: [log-skill, write-path]
files: [templates/skills/log/SKILL.md, tests/log-template.test.ts]
---

## What changed

- Rewrote the log skill template with the full write-path body.
- Added template lint and fixture round-trip tests.

## Why / decisions

- Pure SKILL.md design: zero new CLI commands, validate is the mechanical backstop.

## Alternatives rejected

- \`whydone new\` scaffolder — minimal-ceremony violation; validate catches drift.

## Gotchas / risks

- Skill runtime behavior is not unit-testable; only the contract is pinned.

## Verify-later / follow-ups

- [ ] Dogfood /log on the whydone repo itself.
`

/**
 * Collision-suffixed entry — the -2 suffix is part of BOTH id and slug
 * (slug = id.slice(9)), exactly per the skill's Step 4 collision rule.
 */
const COLLISION_ENTRY = `---
schema: 1
id: 20260716-fix-auth-2
date: "2026-07-16"
slug: fix-auth-2
task: "Fix the auth token refresh race"
status: wip
tags: [auth, race-condition]
---

## What changed

- Serialized the refresh path behind a single in-flight promise.

## Gotchas / risks

- Retry backoff still untested under real network jitter.

## Verify-later / follow-ups

- [ ] Verify refresh behavior against the staging IdP.
`

describe('log skill embedded contract — fixture round-trip', () => {
  let dir: string
  let normalPath: string
  let collisionPath: string

  beforeAll(async () => {
    dir = await mkdtemp(path.join(tmpdir(), 'whydone-log-roundtrip-'))
    normalPath = path.join(dir, `${NORMAL_STEM}.md`)
    collisionPath = path.join(dir, `${COLLISION_STEM}.md`)
    await writeFile(normalPath, NORMAL_ENTRY, 'utf-8')
    await writeFile(collisionPath, COLLISION_ENTRY, 'utf-8')
  })

  afterAll(async () => {
    await rm(dir, { recursive: true, force: true })
  })

  it('normal entry passes strictCheck with zero errors and zero warnings', async () => {
    const raw = await readFile(normalPath, 'utf-8')
    const entry = parseEntry(normalPath, raw)
    const existingIds = new Set([NORMAL_STEM, COLLISION_STEM])

    const { errors, warnings } = strictCheck(entry, entry._stem, existingIds)

    expect(errors).toHaveLength(0)
    expect(warnings).toHaveLength(0)
  })

  it('normal entry contains all five canonical body sections', async () => {
    const raw = await readFile(normalPath, 'utf-8')
    const entry = parseEntry(normalPath, raw)

    expect(entry._sections).toEqual(CANONICAL_HEADINGS)
  })

  it('collision-suffixed entry passes strictCheck with zero errors and zero warnings', async () => {
    const raw = await readFile(collisionPath, 'utf-8')
    const entry = parseEntry(collisionPath, raw)
    const existingIds = new Set([NORMAL_STEM, COLLISION_STEM])

    const { errors, warnings } = strictCheck(entry, entry._stem, existingIds)

    expect(errors).toHaveLength(0)
    expect(warnings).toHaveLength(0)
  })

  it('collision-suffixed entry keeps the suffix in both id and slug (slug === id.slice(9))', async () => {
    const raw = await readFile(collisionPath, 'utf-8')
    const entry = parseEntry(collisionPath, raw)

    expect(entry.id).toBe(COLLISION_STEM)
    expect(entry.slug).toBe('fix-auth-2')
    expect(entry.slug).toBe((entry.id as string).slice(9))
  })
})
