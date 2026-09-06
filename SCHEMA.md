# whydone Entry Schema

This is the single source of truth for the whydone entry format.

Every writer (the `/log` skill, a human authoring by hand) and every reader (the CLI validator, the `/recall` skill, the index rebuilder) must conform to this contract. A wrong schema propagates silently into every downstream consumer — when in doubt, consult this document and not the code.

---

## Storage Location

Entries live at a **flat path**:

```
.whydone/<YYYYMMDD-slug>.md
```

- **No `entries/` subfolder.** The `.whydone/` directory is the entry root.
- `YYYYMMDD` is the date digits (e.g. `20260601`).
- `slug` is ASCII kebab-case (see §Filename and Slug Rules).
- The `.whydone/` directory also contains two **generated index files**: `INDEX.md` and `manifest.json`. These are produced by the CLI (`npx whydone index`) and are **never hand-edited**.
- The glob pattern for entries is `.whydone/*.md` **excluding** `INDEX.md` and `manifest.json` by filename — both are excluded by comparing `path.basename(file)` against these two exact names before treating a file as an entry.

---

## Frontmatter Fields

Every entry begins with a YAML frontmatter block delimited by `---`. The fields are:

| Field | Type | Required | Default | Rule |
|-------|------|----------|---------|------|
| `schema` | integer | yes | — | Must equal `1` for v1. Bare integer, no quotes, no leading zeros. `schema: "1"` (string form) is wrong. Enables future schema evolution. |
| `id` | string | yes | — | Must equal the filename stem — `<YYYYMMDD-slug>` without `.md`. The filename is canonical identity. If the file is renamed or collision-suffixed, `id` MUST be updated to match. |
| `date` | string (YYYY-MM-DD) | yes | — | Date only, no time or timezone. MUST be quoted in YAML: `date: "2026-06-01"`. Unquoted, gray-matter/js-yaml parses it as a JavaScript `Date` object, not a string (see §Parser Notes). |
| `slug` | string | yes | — | ASCII `[a-z0-9-]` kebab-case only. Max ~50 chars, truncated on a word boundary. Must equal the portion of `id` after the `YYYYMMDD-` prefix. Cyrillic and other non-ASCII characters are transliterated to Latin ASCII (the transliteration table is a writer implementation detail; this contract only mandates ASCII output). |
| `task` | string | yes | — | One-line imperative description of what was done. |
| `status` | string | no | `done` | Closed enum: `done \| wip \| blocked`. No other values permitted. |
| `tags` | array of strings | no | — | Each tag is kebab-case. MUST be written in bracket array form `[tag1, tag2]` even for a single tag — a bare scalar (`tags: recall`) parses as a string, not an array (see §Parser Notes). Empty array `[]` is valid. |
| `files` | array of strings | no | — | Repo-relative paths as produced by `git diff`. Same bracket-form rule as `tags`. |
| `links` | array of strings | no | — | Free-form strings: PR/issue URLs, other entry ids, doc references. Not typed objects. Same bracket-form rule. |
| `supersedes` | string or array of strings | no | — | References the `id` (filename stem) of entries this entry replaces. Both `supersedes: id-a` (single string) and `supersedes: [id-a, id-b]` (array) are valid. See §Supersedes Lifecycle. |

**Required fields summary:** `schema`, `id`, `date`, `slug`, `task` — these five must be present for an entry to be considered valid.

**Optional fields** (`status`, `tags`, `files`, `links`, `supersedes`) should be **omitted entirely** when not applicable, rather than set to `null` or `~` (both parse as JS `null`, not empty array).

---

## Canonical Body Headings

The five body sections are canonical, verbatim English strings. Copy these exactly — **case-sensitive, no trailing colon, no parenthetical additions**:

```
## What changed
## Why / decisions
## Alternatives rejected
## Gotchas / risks
## Verify-later / follow-ups
```

Rules for body sections:

- **(a) Empty sections are omitted entirely** — never padded with placeholder text. An entry that has nothing to say in "Alternatives rejected" simply does not include that heading. This keeps entries token-economical.
- **(b) Sections may appear in any order**, but the above order is recommended.
- **(c) Exact wording matters.** Recall extracts "Verify-later / follow-ups" items by matching the exact heading string. The validator matches on these headings. Writing `## Verify Later` or `## Gotchas / Risks` (capital R) will be silently ignored by tooling.

---

## Filename and Slug Rules

Pattern: `<YYYYMMDD><-slug>.md`

- `YYYYMMDD` — the date digits from the `date` field (e.g. `20260601`).
- `slug` — ASCII `[a-z0-9-]` kebab-case, max ~50 chars truncated on a word boundary.
- The `slug` frontmatter field value must equal the portion of `id` after the `YYYYMMDD-` prefix.

**Collision handling:** If `.whydone/20260601-fix-auth.md` already exists and a new entry has the same date and slug, the next file becomes `20260601-fix-auth-2.md`, then `20260601-fix-auth-3.md`, and so on. When a collision suffix is applied, the `id` field in the frontmatter MUST be updated to match the new filename stem (e.g. `id: 20260601-fix-auth-2`).

**YAML key ordering is NOT part of the contract.** Any ordering of frontmatter keys is valid. Tools generate keys in their own order. The recommended order in this document and the template is a stylistic suggestion, not a contract rule.

---

## Schema Versioning and Fail-Soft Read Contract

### Schema versioning

Every entry carries `schema: 1` (bare integer). This field enables future schema evolution — when a v2 schema is introduced, entries with `schema: 1` remain parseable by the lenient read path without modification. The integer increments for each new schema version. No leading zeros. No quoted string form.

### The lenient read contract

**Read path** (used by recall and the index rebuilder):

- **Never crashes** on a malformed or partially-valid entry.
- Unknown or extra frontmatter keys are **preserved** (forward-compatible with future schema versions).
- A partial or incomplete entry is read as far as possible — the read path uses whatever fields it can parse.

**Implementation requirement:** gray-matter 4.0.3 throws `YAMLException` on malformed YAML frontmatter. The read path MUST wrap every `matter()` call in `try/catch` and return a degraded result (e.g. `{ _id: filename, _parseError: true }`) on error — never halt. A single malformed entry must not crash index rebuild or recall.

```
// Pseudocode — lenient read
try {
  const { data, content } = matter(rawFileContent);
  return { ...data, _body: content };
} catch (e) {
  // YAMLException — degrade gracefully, report filename
  return { _id: filenameWithoutExt, _parseError: true };
}
```

### The strict validate contract

Strict conformance checking — required fields present, types correct, enum values valid, `id` matches filename stem — is **only** enforced by `npx whydone validate`. This command exits non-zero on failure and is suitable for CI. Recall and index rebuild use the lenient path above.

---

## Supersedes Lifecycle

When entry B supersedes entry A (B revises or replaces the decision recorded in A):

- **B's frontmatter** contains `supersedes: <id-of-A>` or `supersedes: [id-of-A, ...]`. The value is the `id` string (filename stem), not the full filename.
- **Entry A stays on disk unchanged (tombstone).** It is NEVER deleted, NEVER modified, NEVER given a new status field. The "why it changed" history is the core value of the journal — nothing is destroyed on supersession.
- The supersession relationship is **one-directional**: read from the newer entry only. Old entries have no knowledge that they have been superseded.
- **The validator** checks as a **WARNING** (not a hard error) that the ids listed in `supersedes` exist on disk.
- **Recall** de-prioritizes entries referenced in a newer entry's `supersedes` field.

Both forms are valid:

```yaml
# Single supersession:
supersedes: 20260515-old-recall-design

# Multi supersession:
supersedes: [20260515-old-recall-design, 20260510-recall-spike]
```

---

## Parser Notes (for implementers)

Verified behavior of gray-matter 4.0.3 + js-yaml 3.14.2 (live-tested 2026-06-01):

| Field | Input YAML | Parsed JS type | Note |
|-------|-----------|----------------|------|
| `schema` | `schema: 1` | `number(1)` | Integer coercion. Compare `=== 1`, not `=== "1"`. |
| `date` (unquoted) | `date: 2026-06-01` | `Date` object | **COERCE:** normalize via `.toISOString().slice(0,10)` or use the js-yaml `JSON_SCHEMA` engine option. |
| `date` (quoted) | `date: "2026-06-01"` | `string` | Safe. This is the required convention. |
| `slug` | `slug: fix-auth` | `string` | Safe. |
| `task` | `task: "Implement X"` | `string` | Safe. |
| `status` | `status: done` | `string` | Safe. (`done`/`wip`/`blocked` have no boolean-coercion risk in js-yaml 3.x.) |
| `tags` (array) | `tags: [a, b]` | `string[]` | Correct. |
| `tags` (scalar) | `tags: recall` | `string` | **COERCE** to `[string]` in the reader: `Array.isArray(v) ? v : v ? [v] : []`. |
| `files` (array) | `files: [src/a.ts]` | `string[]` | Correct. |
| `files` (scalar) | `files: src/a.ts` | `string` | **COERCE** to `[string]` same as tags. |
| `links` | `links: [url]` | `string[]` | Correct. |
| `supersedes` (scalar) | `supersedes: id-a` | `string` | Correct (single ref). |
| `supersedes` (array) | `supersedes: [id-a, id-b]` | `string[]` | Correct (multi ref). |
| unknown field | `future_field: x` | `string` (in `data`) | Forward-compatible. **Preserve, do not strip.** |
| no frontmatter | *(no `---` block)* | `data: {}` (no throw) | Lenient. `isEmpty` is `false`. |
| empty frontmatter | `---\n---` | `data: {}` (no throw) | `isEmpty` is `true`. |
| malformed YAML | `tags: {unclosed` | `YAMLException` THROW | **Wrap every `matter()` call in `try/catch`.** |
| null value | `tags: null` | `null` | Omit optional fields instead of setting to null. |
| tilde | `tags: ~` | `null` | Omit optional fields instead. |
| `yes`/`no`/`on`/`off` | `field: yes` | `string "yes"` | NOT boolean in js-yaml 3.x (unlike YAML 1.1 reputation). |
| leading-zero integer | `schema: 01` | `number(1)` | Parsed correctly but do not use leading zeros (future: `08` would fail). |

**Frontmatter is YAML only — never executed.** gray-matter honors a language written after the opening delimiter (`---js`, `---json`) and parses JavaScript frontmatter with a direct `eval`. Every reader MUST disable the non-YAML engines (`safeMatter()` in `src/lib/parse-entry.ts` is the single sanctioned call site); a file whose frontmatter opens with `---js` or `---json` is a parse error (`_parseError: true`), never code that runs.

---

## Security Note

`.whydone/` is committed to git. In open-source projects this means entry content is public.

**Entries should summarize decisions and gotchas in prose — never transcribe:**
- Raw command output
- Environment variable values
- API keys, tokens, or credentials
- Secrets of any kind

The `/log` write skill and any human author must follow this principle. Claude summarizes the session's decisions and risks; it does not dump session history verbatim. If a secret appears in a session, it should be omitted from the journal entry.

---

## Annotated Template

See `tests/fixtures/20260601-design-entry-schema.md` for the canonical annotated example entry (the test suite validates it on every run). It shows every frontmatter field with inline YAML comments explaining each field's purpose and rules, and all five canonical body sections with real prose.

A minimal valid entry needs only the five required fields and whichever body sections are non-empty:

```markdown
---
schema: 1
id: 20260601-fix-auth
date: "2026-06-01"
slug: fix-auth
task: "Fix auth token refresh race"
---

## What changed
- Serialized token refresh behind a mutex.

## Why / decisions
- Two tabs refreshing simultaneously invalidated each other's tokens.
```
