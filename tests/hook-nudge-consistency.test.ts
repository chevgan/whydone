/**
 * Single-source handshake between the Stop hook and the /log skill (§10.2).
 *
 * The hook's block reason starts with NUDGE_PREFIX; the skill's description
 * names that literal as its trigger (b). If either side drifts, the hook
 * nudge stops matching the skill's own invocation rule — this test pins them
 * to the one exported constant.
 */

import { describe, it, expect } from 'vitest'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { NUDGE_PREFIX, buildReasonAsk, buildReasonAuto, buildSummary } from '../src/commands/hook-stop.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const LOG_SKILL = path.resolve(__dirname, '..', 'templates', 'skills', 'log', 'SKILL.md')

describe('hook ↔ /log nudge handshake', () => {
  it('the log skill description contains the exported NUDGE_PREFIX literal', async () => {
    const skill = await readFile(LOG_SKILL, 'utf-8')
    expect(skill).toContain(NUDGE_PREFIX)
  })

  it('both reason texts start with NUDGE_PREFIX', () => {
    const summary = buildSummary(1, 2)
    expect(buildReasonAsk(summary).startsWith(NUDGE_PREFIX)).toBe(true)
    expect(buildReasonAuto(summary).startsWith(NUDGE_PREFIX)).toBe(true)
  })
})
