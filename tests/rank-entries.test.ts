/**
 * Unit tests for src/lib/rank-entries.ts — the pure ranking core.
 *
 * All tests are pure (no FS access). Coverage per 04-DESIGN.md §7:
 *   tokenization, fileOverlap (exact/dirname/miss/root-exclusion/normalization),
 *   tagMatch lowercasing, keyword tiers with per-term max, 0-based rank recency
 *   boundaries, superseded ×0.25 ordering, eligibility gate, total tie-breaker
 *   chain + permutation stability, limit clamp + --all, openFollowUps counting.
 */

import { describe, it, expect } from 'vitest'
import {
  RECALL_WEIGHTS,
  STOPWORDS,
  VERIFY_LATER_HEADING,
  countOpenFollowUps,
  normalizePath,
  rankEntries,
  resolveLimit,
  scoreEntry,
  tokenizeQuery,
  type RecallCandidate,
  type RecallQuery,
} from '../src/lib/rank-entries.js'

/** Build a RecallCandidate with sane defaults. */
function makeCandidate(overrides: Partial<RecallCandidate> & { id: string }): RecallCandidate {
  return {
    date: '2026-07-01',
    slug: 'default-slug',
    task: 'default task',
    status: 'done',
    tags: [],
    files: [],
    links: [],
    supersedes: [],
    _sections: [],
    _parseError: false,
    _supersededBy: [],
    openFollowUps: 0,
    ...overrides,
  }
}

function makeQuery(overrides: Partial<RecallQuery> = {}): RecallQuery {
  return { terms: [], files: [], tags: [], ...overrides }
}

// ─── tokenizeQuery ────────────────────────────────────────────────────────────

describe('tokenizeQuery', () => {
  it('lowercases tokens', () => {
    expect(tokenizeQuery('AUTH LoginFlow')).toEqual(['auth', 'loginflow'])
  })

  it('splits on non-letter/digit/hyphen (Unicode-aware)', () => {
    expect(tokenizeQuery('auth/login+token_refresh')).toEqual([
      'auth',
      'login',
      'token',
      'refresh',
    ])
  })

  it('keeps hyphens inside tokens', () => {
    expect(tokenizeQuery('rate-limit logic')).toEqual(['rate-limit', 'logic'])
  })

  it('Cyrillic tokens survive', () => {
    expect(tokenizeQuery('авторизация токен')).toEqual(['авторизация', 'токен'])
  })

  it('drops English and Russian stopwords', () => {
    expect(tokenizeQuery('fix the auth для сессии')).toEqual(['auth', 'сессии'])
  })

  it('keeps 2-char tokens (db, ci)', () => {
    expect(tokenizeQuery('db ci migration')).toEqual(['db', 'ci', 'migration'])
  })

  it('drops 1-char tokens', () => {
    expect(tokenizeQuery('x auth')).toEqual(['auth'])
  })

  it('dedupes tokens', () => {
    expect(tokenizeQuery('auth auth login auth')).toEqual(['auth', 'login'])
  })

  it('caps at 20 tokens (RU+EN expansion doubles token count — 06-DESIGN §5.3)', () => {
    // 25 unique tokens plus a leading duplicate: dedupe first, then cap.
    const unique = Array.from({ length: 25 }, (_, i) => `token${i}`)
    const query = ['token0', ...unique].join(' ')
    const tokens = tokenizeQuery(query)
    expect(tokens).toHaveLength(20)
    // The first 20 (in input order, post-dedupe) survive the cap.
    expect(tokens).toEqual(unique.slice(0, 20))
  })

  it('STOPWORDS is a frozen enumerated list containing known noise words', () => {
    expect(STOPWORDS).toContain('the')
    expect(STOPWORDS).toContain('fix')
    expect(STOPWORDS).toContain('это')
  })
})

// ─── normalizePath ────────────────────────────────────────────────────────────

describe('normalizePath', () => {
  it('strips leading ./', () => {
    expect(normalizePath('./src/auth.ts')).toBe('src/auth.ts')
  })

  it('converts backslashes to forward slashes', () => {
    expect(normalizePath('src\\lib\\auth.ts')).toBe('src/lib/auth.ts')
  })

  it('collapses duplicate slashes', () => {
    expect(normalizePath('src//lib///auth.ts')).toBe('src/lib/auth.ts')
  })

  it('handles Windows-pasted path with leading .\\', () => {
    expect(normalizePath('.\\src\\auth.ts')).toBe('src/auth.ts')
  })
})

// ─── fileOverlap (via scoreEntry components) ─────────────────────────────────

describe('fileOverlap — via scoreEntry components.files', () => {
  it('exact normalized match scores 1.0', () => {
    const e = makeCandidate({ id: '20260701-a', files: ['src/auth.ts'] })
    const s = scoreEntry(e, makeQuery({ files: ['src/auth.ts'] }))
    expect(s.components.files).toBe(1)
  })

  it('shared dirname scores 0.5', () => {
    const e = makeCandidate({ id: '20260701-a', files: ['src/other.ts'] })
    const s = scoreEntry(e, makeQuery({ files: ['src/auth.ts'] }))
    expect(s.components.files).toBe(0.5)
  })

  it('different dirname scores 0', () => {
    const e = makeCandidate({ id: '20260701-a', files: ['lib/other.ts'] })
    const s = scoreEntry(e, makeQuery({ files: ['src/auth.ts'] }))
    expect(s.components.files).toBe(0)
  })

  it('root-dirname exclusion: two repo-root files score 0 partial', () => {
    const e = makeCandidate({ id: '20260701-a', files: ['README.md'] })
    const s = scoreEntry(e, makeQuery({ files: ['package.json'] }))
    expect(s.components.files).toBe(0)
  })

  it('root-level exact match still scores 1.0', () => {
    const e = makeCandidate({ id: '20260701-a', files: ['package.json'] })
    const s = scoreEntry(e, makeQuery({ files: ['package.json'] }))
    expect(s.components.files).toBe(1)
  })

  it('normalizes both sides: backslash query matches posix entry file', () => {
    const e = makeCandidate({ id: '20260701-a', files: ['src/auth.ts'] })
    const s = scoreEntry(e, makeQuery({ files: ['src\\auth.ts'] }))
    expect(s.components.files).toBe(1)
  })

  it('normalizes both sides: ./ prefixed entry file matches clean query path', () => {
    const e = makeCandidate({ id: '20260701-a', files: ['./src/auth.ts'] })
    const s = scoreEntry(e, makeQuery({ files: ['src/auth.ts'] }))
    expect(s.components.files).toBe(1)
  })

  it('averages over query files', () => {
    const e = makeCandidate({ id: '20260701-a', files: ['src/auth.ts'] })
    const s = scoreEntry(e, makeQuery({ files: ['src/auth.ts', 'lib/miss.ts'] }))
    expect(s.components.files).toBe(0.5)
  })

  it('component is 0 when no query files given', () => {
    const e = makeCandidate({ id: '20260701-a', files: ['src/auth.ts'] })
    const s = scoreEntry(e, makeQuery())
    expect(s.components.files).toBe(0)
  })
})

// ─── tagMatch ─────────────────────────────────────────────────────────────────

describe('tagMatch — via scoreEntry components.tags', () => {
  it('exact match after lowercasing both sides (#Auth query vs auth tag)', () => {
    const e = makeCandidate({ id: '20260701-a', tags: ['auth'] })
    const s = scoreEntry(e, makeQuery({ tags: ['Auth'] }))
    expect(s.components.tags).toBe(1)
  })

  it('uppercase entry tag matches lowercase query tag', () => {
    const e = makeCandidate({ id: '20260701-a', tags: ['AUTH'] })
    const s = scoreEntry(e, makeQuery({ tags: ['auth'] }))
    expect(s.components.tags).toBe(1)
  })

  it('is a fraction of query tags matched', () => {
    const e = makeCandidate({ id: '20260701-a', tags: ['auth'] })
    const s = scoreEntry(e, makeQuery({ tags: ['auth', 'db'] }))
    expect(s.components.tags).toBe(0.5)
  })

  it('component is 0 when no query tags given', () => {
    const e = makeCandidate({ id: '20260701-a', tags: ['auth'] })
    const s = scoreEntry(e, makeQuery())
    expect(s.components.tags).toBe(0)
  })
})

// ─── keyword tiers ────────────────────────────────────────────────────────────

describe('keywordScore — tiers via scoreEntry components.keywords', () => {
  it('term in task scores 1.0', () => {
    const e = makeCandidate({ id: '20260701-a', task: 'Rework auth flow' })
    const s = scoreEntry(e, makeQuery({ terms: ['auth'] }))
    expect(s.components.keywords).toBe(1)
  })

  it('term in slug scores 1.0', () => {
    const e = makeCandidate({ id: '20260701-a', slug: 'auth-rework', task: 'x', tags: [] })
    const s = scoreEntry(e, makeQuery({ terms: ['auth'] }))
    expect(s.components.keywords).toBe(1)
  })

  it('term in a tag scores 1.0', () => {
    const e = makeCandidate({ id: '20260701-a', slug: 'x', task: 'x', tags: ['auth'] })
    const s = scoreEntry(e, makeQuery({ terms: ['auth'] }))
    expect(s.components.keywords).toBe(1)
  })

  it('term only in files scores 0.5', () => {
    const e = makeCandidate({ id: '20260701-a', slug: 'x', task: 'x', files: ['src/auth.ts'] })
    const s = scoreEntry(e, makeQuery({ terms: ['auth'] }))
    expect(s.components.keywords).toBe(0.5)
  })

  it('term only in body scores 0.5', () => {
    const e = makeCandidate({ id: '20260701-a', slug: 'x', task: 'x', body: 'touched auth here' })
    const s = scoreEntry(e, makeQuery({ terms: ['auth'] }))
    expect(s.components.keywords).toBe(0.5)
  })

  it('per-term hit is the MAX tier, not the sum (task + body still 1.0)', () => {
    const e = makeCandidate({
      id: '20260701-a',
      task: 'auth rework',
      body: 'auth auth auth',
      files: ['src/auth.ts'],
    })
    const s = scoreEntry(e, makeQuery({ terms: ['auth'] }))
    expect(s.components.keywords).toBe(1)
  })

  it('averages over terms', () => {
    const e = makeCandidate({ id: '20260701-a', task: 'auth rework' })
    const s = scoreEntry(e, makeQuery({ terms: ['auth', 'missing'] }))
    expect(s.components.keywords).toBe(0.5)
  })

  it('matching is case-insensitive against entry fields', () => {
    const e = makeCandidate({ id: '20260701-a', task: 'Rework AUTH flow' })
    const s = scoreEntry(e, makeQuery({ terms: ['auth'] }))
    expect(s.components.keywords).toBe(1)
  })
})

// ─── recency boundaries ───────────────────────────────────────────────────────

describe('recency — 0-based rank boundaries', () => {
  it('newest = 1.0 exactly, oldest = 1/N (N=3)', () => {
    const candidates = [
      makeCandidate({ id: '20260701-old', date: '2026-07-01' }),
      makeCandidate({ id: '20260703-new', date: '2026-07-03' }),
      makeCandidate({ id: '20260702-mid', date: '2026-07-02' }),
    ]
    const { results } = rankEntries(candidates, makeQuery(), 20)
    const newest = results.find((r) => r.entry.id === '20260703-new')!
    const oldest = results.find((r) => r.entry.id === '20260701-old')!
    expect(newest.components.recency).toBe(1)
    expect(oldest.components.recency).toBe(0.3333) // round4(1/3)
  })

  it('N=1 ⇒ recency 1.0', () => {
    const { results } = rankEntries([makeCandidate({ id: '20260701-solo' })], makeQuery(), 20)
    expect(results[0].components.recency).toBe(1)
  })

  it('same-date tie ranks by id desc (higher id is newer)', () => {
    const candidates = [
      makeCandidate({ id: '20260701-aaa', date: '2026-07-01' }),
      makeCandidate({ id: '20260701-zzz', date: '2026-07-01' }),
    ]
    const { results } = rankEntries(candidates, makeQuery(), 20)
    const zzz = results.find((r) => r.entry.id === '20260701-zzz')!
    const aaa = results.find((r) => r.entry.id === '20260701-aaa')!
    expect(zzz.components.recency).toBe(1)
    expect(aaa.components.recency).toBe(0.5)
  })
})

// ─── superseded multiplier ────────────────────────────────────────────────────

describe('superseded ×0.25 multiplier', () => {
  it('RECALL_WEIGHTS pins the multiplier at 0.25', () => {
    expect(RECALL_WEIGHTS.supersededMultiplier).toBe(0.25)
  })

  it('superseded entry orders below an otherwise-identical fresh sibling', () => {
    const query = makeQuery({ tags: ['auth'] })
    const candidates = [
      makeCandidate({
        id: '20260701-stale',
        date: '2026-07-01',
        tags: ['auth'],
        _supersededBy: ['20260702-fresh'],
      }),
      makeCandidate({ id: '20260701-fresh-sibling', date: '2026-07-01', tags: ['auth'] }),
    ]
    const { results } = rankEntries(candidates, query, 20)
    expect(results[0].entry.id).toBe('20260701-fresh-sibling')
    expect(results[1].entry.id).toBe('20260701-stale')
    // multiplier applied to (signal + recency)
    expect(results[1].score).toBeLessThan(results[0].score * 0.5)
  })
})

// ─── eligibility gate ─────────────────────────────────────────────────────────

describe('eligibility gate', () => {
  it('recency-only entry excluded when any filter is given', () => {
    const candidates = [
      makeCandidate({ id: '20260702-nomatch', date: '2026-07-02', slug: 'x', task: 'x' }),
      makeCandidate({ id: '20260701-match', date: '2026-07-01', tags: ['auth'] }),
    ]
    const { total, eligible, results } = rankEntries(candidates, makeQuery({ tags: ['auth'] }), 20)
    expect(total).toBe(2)
    expect(eligible).toBe(1)
    expect(results.map((r) => r.entry.id)).toEqual(['20260701-match'])
  })

  it('all entries eligible when no filters given (pure recency)', () => {
    const candidates = [
      makeCandidate({ id: '20260701-a', date: '2026-07-01' }),
      makeCandidate({ id: '20260702-b', date: '2026-07-02' }),
    ]
    const { eligible, results } = rankEntries(candidates, makeQuery(), 20)
    expect(eligible).toBe(2)
    expect(results.map((r) => r.entry.id)).toEqual(['20260702-b', '20260701-a'])
  })

  it('hasFilters=true gates even when processing emptied the terms (stopword-only query)', () => {
    // --query "fix the" tokenizes to [] — the gate must still apply so the
    // consumer sees eligible 0 and discloses its fallback.
    const candidates = [
      makeCandidate({ id: '20260701-a', date: '2026-07-01' }),
      makeCandidate({ id: '20260702-b', date: '2026-07-02' }),
    ]
    const { total, eligible, results } = rankEntries(candidates, makeQuery(), 20, true)
    expect(total).toBe(2)
    expect(eligible).toBe(0)
    expect(results).toEqual([])
  })
})

// ─── raw vs rounded score ─────────────────────────────────────────────────────

describe('rawScore — rounding is output-only, never rank-bearing', () => {
  it('scoreEntry exposes the unrounded rawScore next to the 4-decimal score', () => {
    const e = makeCandidate({ id: '20260701-a' })
    const s = scoreEntry(e, makeQuery(), 1 / 3)
    expect(s.score).toBe(0.3333)
    expect(s.rawScore).toBeCloseTo(1 / 3, 12)
    expect(s.rawScore).not.toBe(s.score)
  })
})

// ─── tie-breaker chain + permutation stability ───────────────────────────────

describe('tie-breakers — total order (score → date → id)', () => {
  it('equal score falls back to date desc', () => {
    // B: exact file (signal 3.0) + recency 1.0 = 4.0
    // A: dirname 0.5×3 + full tag 2 (signal 3.5) + recency 0.5 = 4.0
    const query = makeQuery({ files: ['src/a.ts'], tags: ['auth'] })
    const candidates = [
      makeCandidate({ id: '20260701-a-old', date: '2026-07-01', files: ['src/b.ts'], tags: ['auth'] }),
      makeCandidate({ id: '20260702-b-new', date: '2026-07-02', files: ['src/a.ts'] }),
    ]
    const { results } = rankEntries(candidates, query, 20)
    expect(results[0].score).toBe(results[1].score)
    expect(results[0].entry.id).toBe('20260702-b-new')
  })

  it('equal score and date falls back to id desc', () => {
    // Same date: zzz gets recency 1.0 (id desc rank), aaa gets 0.5.
    // zzz: exact file signal 3.0 + 1.0 = 4.0; aaa: dirname 1.5 + tag 2 = 3.5 + 0.5 = 4.0.
    const query = makeQuery({ files: ['src/a.ts'], tags: ['auth'] })
    const candidates = [
      makeCandidate({ id: '20260701-aaa', date: '2026-07-01', files: ['src/b.ts'], tags: ['auth'] }),
      makeCandidate({ id: '20260701-zzz', date: '2026-07-01', files: ['src/a.ts'] }),
    ]
    const { results } = rankEntries(candidates, query, 20)
    expect(results[0].score).toBe(results[1].score)
    expect(results[0].entry.id).toBe('20260701-zzz')
  })

  it('empty date sorts last', () => {
    const candidates = [
      makeCandidate({ id: '20260701-nodate', date: '' }),
      makeCandidate({ id: '20260701-dated', date: '2026-07-01' }),
    ]
    const { results } = rankEntries(candidates, makeQuery(), 20)
    expect(results[results.length - 1].entry.id).toBe('20260701-nodate')
  })

  it('stable under input permutation (shuffle, rank twice, identical)', () => {
    const query = makeQuery({ terms: ['auth'], tags: ['auth'] })
    const candidates = [
      makeCandidate({ id: '20260701-a', date: '2026-07-01', tags: ['auth'] }),
      makeCandidate({ id: '20260702-b', date: '2026-07-02', task: 'auth rework' }),
      makeCandidate({ id: '20260703-c', date: '2026-07-03', files: ['src/auth.ts'] }),
      makeCandidate({ id: '20260701-d', date: '2026-07-01', tags: ['auth'], _supersededBy: ['20260702-b'] }),
      makeCandidate({ id: '20260702-e', date: '2026-07-02', body: 'auth mentioned' }),
      makeCandidate({ id: '20260704-f', date: '2026-07-04', slug: 'auth-cleanup' }),
    ]
    const permuted = [candidates[3], candidates[5], candidates[0], candidates[4], candidates[2], candidates[1]]

    const ids1 = rankEntries(candidates, query, 20).results.map((r) => r.entry.id)
    const ids2 = rankEntries(permuted, query, 20).results.map((r) => r.entry.id)
    expect(ids2).toEqual(ids1)
  })
})

// ─── limit clamp and --all ────────────────────────────────────────────────────

describe('resolveLimit — clamp 1..20 and --all', () => {
  it('clamps below 1 to 1', () => {
    expect(resolveLimit(0, false)).toBe(1)
    expect(resolveLimit(-3, false)).toBe(1)
  })

  it('clamps above 20 to 20', () => {
    expect(resolveLimit(25, false)).toBe(20)
  })

  it('parses string values', () => {
    expect(resolveLimit('7', false)).toBe(7)
  })

  it('defaults to 5 for non-numeric input', () => {
    expect(resolveLimit(undefined, false)).toBe(5)
    expect(resolveLimit('abc', false)).toBe(5)
  })

  it('--all returns unbounded', () => {
    expect(resolveLimit(5, true)).toBe(Number.POSITIVE_INFINITY)
  })

  it('rankEntries with unbounded limit returns all eligible', () => {
    const candidates = Array.from({ length: 30 }, (_, i) =>
      makeCandidate({ id: `202607${String(i + 1).padStart(2, '0')}-e${i}`, date: '2026-07-01' }),
    )
    const { results } = rankEntries(candidates, makeQuery(), Number.POSITIVE_INFINITY)
    expect(results).toHaveLength(30)
  })

  it('rankEntries slices to the limit', () => {
    const candidates = Array.from({ length: 10 }, (_, i) =>
      makeCandidate({ id: `202607${String(i + 1).padStart(2, '0')}-e${i}`, date: '2026-07-01' }),
    )
    const { results, eligible } = rankEntries(candidates, makeQuery(), 5)
    expect(results).toHaveLength(5)
    expect(eligible).toBe(10)
  })
})

// ─── openFollowUps counting ───────────────────────────────────────────────────

describe('countOpenFollowUps', () => {
  it('counts only unchecked - [ ] items under the verbatim heading', () => {
    const body = [
      '## What changed',
      '- [ ] not a follow-up (wrong section)',
      '',
      VERIFY_LATER_HEADING,
      '- [ ] check expiry',
      '- [x] already done',
      '- [ ] verify CI',
    ].join('\n')
    expect(countOpenFollowUps(body)).toBe(2)
  })

  it('stops at the next ## heading', () => {
    const body = [
      VERIFY_LATER_HEADING,
      '- [ ] inside section',
      '## Gotchas / risks',
      '- [ ] after next heading — not counted',
    ].join('\n')
    expect(countOpenFollowUps(body)).toBe(1)
  })

  it('counts to EOF when no next heading', () => {
    const body = [VERIFY_LATER_HEADING, '- [ ] one', '- [ ] two'].join('\n')
    expect(countOpenFollowUps(body)).toBe(2)
  })

  it('checked-only section counts 0', () => {
    const body = [VERIFY_LATER_HEADING, '- [x] done', '- [x] also done'].join('\n')
    expect(countOpenFollowUps(body)).toBe(0)
  })

  it('returns 0 when the heading is absent', () => {
    expect(countOpenFollowUps('## What changed\n- [ ] item')).toBe(0)
  })

  it('does not match a near-miss heading (case matters)', () => {
    const body = ['## Verify Later / Follow-ups', '- [ ] item'].join('\n')
    expect(countOpenFollowUps(body)).toBe(0)
  })

  it('ignores a fenced example of the heading + items before a fully-checked real section', () => {
    const body = [
      '## What changed',
      '- documented the entry format',
      '',
      '```markdown',
      VERIFY_LATER_HEADING,
      '- [ ] example item one',
      '- [ ] example item two',
      '```',
      '',
      VERIFY_LATER_HEADING,
      '- [x] everything verified',
    ].join('\n')
    expect(countOpenFollowUps(body)).toBe(0)
  })

  it('a fenced ## line inside the real section does not terminate counting', () => {
    const body = [
      VERIFY_LATER_HEADING,
      '- [ ] first real item',
      '```bash',
      '## run this in CI',
      'echo hi',
      '```',
      '- [ ] second real item',
    ].join('\n')
    expect(countOpenFollowUps(body)).toBe(2)
  })

  it('fenced - [ ] items inside the real section are not counted', () => {
    const body = [
      VERIFY_LATER_HEADING,
      '- [ ] real item',
      '~~~',
      '- [ ] fenced example item',
      '~~~',
    ].join('\n')
    expect(countOpenFollowUps(body)).toBe(1)
  })

  it('heading appearing only inside a fence counts 0', () => {
    const body = ['```', VERIFY_LATER_HEADING, '- [ ] item', '```'].join('\n')
    expect(countOpenFollowUps(body)).toBe(0)
  })
})
