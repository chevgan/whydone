/**
 * Pure ranking core for `whydone recall` — zero IO, no clock, no network.
 *
 * Everything in this module is a deterministic function of its inputs
 * (RECALL-03): closed-form fixed-weight scoring, rank-based recency
 * (0-based rank over the corpus, not wall-clock), lowercase-normalized
 * tag matching, and a total tie-break order (score desc → date desc →
 * id desc) so results are stable under input permutation.
 *
 * RECALL_WEIGHTS is the single tuning point for the scoring formula.
 */

import type { ManifestEntry } from '../types.js'

// ─── Constants ────────────────────────────────────────────────────────────────

/**
 * Fixed scoring weights — the single tuning point (04-DESIGN.md §1.2).
 */
export const RECALL_WEIGHTS = {
  files: 3,
  tags: 2,
  keywords: 2,
  recency: 1,
  supersededMultiplier: 0.25,
} as const

/**
 * Frozen stopword list — enumerated in code (04-DESIGN.md §1.2).
 * English + Russian noise words dropped by tokenizeQuery().
 */
export const STOPWORDS: readonly string[] = [
  // English
  'the', 'a', 'an', 'and', 'or', 'of', 'to', 'in', 'on', 'for', 'with',
  'this', 'that', 'from', 'into', 'is', 'are', 'was', 'be', 'as', 'at',
  'by', 'it', 'not', 'fix', 'add', 'use', 'new', 'make',
  // Russian
  'и', 'в', 'на', 'с', 'для', 'что', 'это', 'как', 'по', 'из', 'не',
  'у', 'о', 'же', 'бы', 'был', 'была',
]

const STOPWORD_SET = new Set(STOPWORDS)

/** Tokens shorter than this are dropped (keeps `db`, `ci`, `ui`). */
const MIN_TOKEN_LENGTH = 2

/**
 * Query token cap after dedupe. 20, not 12: the /recall skill's RU+EN query
 * expansion (06-DESIGN §5.1) legitimately doubles token count — 12 truncated
 * the English half of a bilingual query.
 */
const MAX_QUERY_TOKENS = 20

/** Verbatim heading matched for open follow-up counting (SCHEMA.md). */
export const VERIFY_LATER_HEADING = '## Verify-later / follow-ups'

/** --limit bounds and default (04-DESIGN.md §1.4). */
export const DEFAULT_LIMIT = 5
export const MIN_LIMIT = 1
export const MAX_LIMIT = 20

// ─── Types ────────────────────────────────────────────────────────────────────

/**
 * A ranking candidate: a manifest entry enriched with its body text
 * (read by the CLI, never by the skill) and the open follow-up count.
 */
export type RecallCandidate = ManifestEntry & { body?: string; openFollowUps: number }

/**
 * Normalized query inputs. terms come from tokenizeQuery(), files are
 * normalizePath()-ed, tags are lowercased — all done by the caller.
 */
export interface RecallQuery {
  terms: string[]
  files: string[]
  tags: string[]
}

/** Per-component score breakdown (pre-weight, each in [0, 1]). */
export interface ScoreComponents {
  files: number
  tags: number
  keywords: number
  recency: number
}

/**
 * A scored candidate. signal is the pre-recency, pre-multiplier sum.
 * score is rounded to 4 decimals for output; rawScore is the unrounded
 * value used for ordering (rounding is output-only, never rank-bearing).
 */
export interface ScoredEntry {
  entry: RecallCandidate
  score: number
  rawScore: number
  signal: number
  components: ScoreComponents
}

/** Result of rankEntries(): eligible candidates, sorted and capped. */
export interface RankResult {
  total: number
  eligible: number
  results: ScoredEntry[]
}

// ─── Tokenization and normalization ──────────────────────────────────────────

/**
 * Tokenize a free-text query: lowercase, split on non-(letter/digit/hyphen)
 * (Unicode-aware — Cyrillic survives), drop tokens shorter than 2 chars,
 * drop stopwords, dedupe, cap at 20 tokens.
 */
export function tokenizeQuery(q: string): string[] {
  const rawTokens = q.toLowerCase().split(/[^\p{L}\p{N}-]+/u)
  const seen = new Set<string>()
  const tokens: string[] = []

  for (const token of rawTokens) {
    if (token.length < MIN_TOKEN_LENGTH) continue
    if (STOPWORD_SET.has(token)) continue
    if (seen.has(token)) continue
    seen.add(token)
    tokens.push(token)
    if (tokens.length >= MAX_QUERY_TOKENS) break
  }

  return tokens
}

/**
 * Normalize a file path for matching: `\` → `/` (Windows-pasted paths),
 * collapse duplicate slashes, strip leading `./`.
 * Applied to BOTH query files and entry files.
 */
export function normalizePath(p: string): string {
  let normalized = p.replace(/\\/g, '/').replace(/\/{2,}/g, '/')
  while (normalized.startsWith('./')) {
    normalized = normalized.slice(2)
  }
  return normalized
}

/**
 * Posix dirname of an already-normalized path. Root-level files → ".".
 */
function posixDirname(p: string): string {
  const idx = p.lastIndexOf('/')
  return idx === -1 ? '.' : p.slice(0, idx)
}

// ─── Follow-up counting ───────────────────────────────────────────────────────

/** Fence delimiter line (``` or ~~~, optionally indented / info-stringed). */
const FENCE_RE = /^\s*(```|~~~)/

/**
 * Count unchecked `- [ ]` lines between the verbatim heading
 * `## Verify-later / follow-ups` and the next `## ` heading (or EOF).
 * A section whose items are all checked counts 0.
 *
 * Code-fence aware: lines inside ``` / ~~~ fences are literal example text —
 * a fenced copy of the heading never opens the section, a fenced `## ` line
 * never terminates it, and fenced `- [ ]` items are never counted. (Entries
 * documenting markdown tooling legitimately quote the entry format itself.)
 */
export function countOpenFollowUps(body: string): number {
  const lines = body.split('\n')
  let inSection = false
  let inFence = false
  let count = 0

  for (const line of lines) {
    const trimmed = line.trimEnd()
    if (FENCE_RE.test(trimmed)) {
      inFence = !inFence
      continue
    }
    if (inFence) continue
    if (!inSection) {
      if (trimmed === VERIFY_LATER_HEADING) inSection = true
      continue
    }
    if (trimmed.startsWith('## ')) break
    if (/^\s*-\s\[ \]/.test(line)) count++
  }

  return count
}

// ─── Limit resolution ─────────────────────────────────────────────────────────

/**
 * Resolve the effective result limit: --all → unbounded; otherwise
 * clamp the numeric value into [1, 20]; non-numeric → default 5.
 */
export function resolveLimit(value: unknown, all: boolean): number {
  if (all) return Number.POSITIVE_INFINITY
  const n = typeof value === 'number' ? value : Number.parseInt(String(value ?? ''), 10)
  if (Number.isNaN(n)) return DEFAULT_LIMIT
  return Math.min(MAX_LIMIT, Math.max(MIN_LIMIT, n))
}

// ─── Scoring ──────────────────────────────────────────────────────────────────

/** Round to 4 decimals for output. */
function round4(x: number): number {
  return Math.round(x * 10000) / 10000
}

/**
 * fileOverlap = (Σ over qf of match(qf)) / |Q.files|:
 *   1.0 exact normalized-path match; else 0.5 shared dirname (repo root
 *   "." excluded from partial credit); else 0. Component is 0 with no files.
 */
function fileOverlap(entry: RecallCandidate, queryFiles: string[]): number {
  if (queryFiles.length === 0) return 0

  const entryFiles = entry.files.map(normalizePath)
  let sum = 0

  for (const qf of queryFiles) {
    const nqf = normalizePath(qf)
    if (entryFiles.some((f) => f === nqf)) {
      sum += 1
      continue
    }
    const qfDir = posixDirname(nqf)
    if (qfDir !== '.' && entryFiles.some((f) => posixDirname(f) === qfDir)) {
      sum += 0.5
    }
  }

  return sum / queryFiles.length
}

/**
 * tagMatch = |lowercase(Q.tags) ∩ lowercase(e.tags)| / |Q.tags|.
 * Both sides lowercased so `#Auth` matches an `auth` tag. 0 with no tags.
 */
function tagMatch(entry: RecallCandidate, queryTags: string[]): number {
  if (queryTags.length === 0) return 0

  const entryTags = new Set(entry.tags.map((t) => t.toLowerCase()))
  const matched = queryTags.filter((t) => entryTags.has(t.toLowerCase())).length

  return matched / queryTags.length
}

/**
 * keywordScore = (Σ over term of hit(term)) / |Q.terms|, where hit(term)
 * takes the MAXIMUM matching tier: 1.0 substring of task/slug/any tag;
 * else 0.5 substring of any files path; else 0.5 substring of the body;
 * else 0. All comparisons case-insensitive. 0 with no terms.
 */
function keywordScore(entry: RecallCandidate, terms: string[]): number {
  if (terms.length === 0) return 0

  const strongHaystacks = [entry.task, entry.slug, ...entry.tags].map((s) => s.toLowerCase())
  const fileHaystacks = entry.files.map((f) => normalizePath(f).toLowerCase())
  const bodyHaystack = (entry.body ?? '').toLowerCase()

  let sum = 0
  for (const term of terms) {
    if (strongHaystacks.some((h) => h.includes(term))) {
      sum += 1
    } else if (fileHaystacks.some((h) => h.includes(term))) {
      sum += 0.5
    } else if (bodyHaystack.includes(term)) {
      sum += 0.5
    }
  }

  return sum / terms.length
}

/**
 * Total-order comparator for recency ranking and tie-breaking:
 * date desc (string compare; empty date sorts last) → id desc.
 */
function compareDateIdDesc(a: ManifestEntry, b: ManifestEntry): number {
  if (a.date !== b.date) return a.date > b.date ? -1 : 1
  if (a.id !== b.id) return a.id > b.id ? -1 : 1
  return 0
}

/**
 * Score a single candidate against the query.
 *
 * recency is corpus-dependent (rank-based), so it is computed by
 * rankEntries() and injected here:
 *   signal = 3*fileOverlap + 2*tagMatch + 2*keywordScore
 *   score  = (signal + 1*recency) * (superseded ? 0.25 : 1)
 */
export function scoreEntry(e: RecallCandidate, q: RecallQuery, recency = 0): ScoredEntry {
  const files = fileOverlap(e, q.files)
  const tags = tagMatch(e, q.tags)
  const keywords = keywordScore(e, q.terms)

  const signal =
    RECALL_WEIGHTS.files * files + RECALL_WEIGHTS.tags * tags + RECALL_WEIGHTS.keywords * keywords

  const superseded = e._supersededBy.length > 0
  const multiplier = superseded ? RECALL_WEIGHTS.supersededMultiplier : 1
  const score = (signal + RECALL_WEIGHTS.recency * recency) * multiplier

  return {
    entry: e,
    score: round4(score),
    rawScore: score,
    signal,
    components: {
      files: round4(files),
      tags: round4(tags),
      keywords: round4(keywords),
      recency: round4(recency),
    },
  }
}

/**
 * Rank candidates against the query.
 *
 * Recency: candidates ranked by (date desc, id desc); rank is 0-based
 * (newest = 0); recency = (N - rank) / N — newest scores exactly 1.0,
 * oldest 1/N, N=1 ⇒ 1.0.
 *
 * Eligibility gate: when ANY filter was given, only entries with
 * signal > 0 qualify — recency alone never does. With no filters, every
 * candidate is eligible (pure-recency "last N things done"). Pass
 * hasFilters explicitly when the caller knows a filter FLAG was given
 * even though processing emptied it (e.g. --query of pure stopwords →
 * terms=[]): the gate must still apply so eligible drops to 0 and the
 * consumer can disclose its fallback, instead of silently presenting
 * recency-only results as ranked matches.
 *
 * Sort: raw (unrounded) score desc → date desc (empty last) → id desc.
 * No padding below limit — counts are reported instead.
 */
export function rankEntries(
  candidates: RecallCandidate[],
  q: RecallQuery,
  limit: number,
  hasFilters?: boolean,
): RankResult {
  const total = candidates.length

  // 0-based recency rank over the whole corpus
  const byRecency = [...candidates].sort(compareDateIdDesc)
  const rankOf = new Map<RecallCandidate, number>()
  byRecency.forEach((c, i) => rankOf.set(c, i))

  const scored = candidates.map((c) => scoreEntry(c, q, (total - rankOf.get(c)!) / total))

  const filtersGiven =
    hasFilters ?? (q.terms.length > 0 || q.files.length > 0 || q.tags.length > 0)
  const eligible = filtersGiven ? scored.filter((s) => s.signal > 0) : scored

  const sorted = [...eligible].sort(
    (a, b) => b.rawScore - a.rawScore || compareDateIdDesc(a.entry, b.entry),
  )

  const results = Number.isFinite(limit) ? sorted.slice(0, limit) : sorted

  return { total, eligible: eligible.length, results }
}
