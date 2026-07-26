---
# schema: integer version of the entry schema. Always 1 for v1 entries. No quotes, no leading zeros.
# Increment for future schema versions. Phase 2 validator compares === 1, not === "1".
schema: 1

# id: must equal the filename stem (YYYYMMDD-slug without .md).
# If the file is renamed or a collision suffix is added, id MUST be updated to match.
id: 20260601-design-entry-schema

# date: YYYY-MM-DD only. MUST be quoted to prevent gray-matter/js-yaml from coercing it
# to a JavaScript Date object. Unquoted "date: 2026-06-01" parses as Date, not string.
date: "2026-06-01"

# slug: ASCII [a-z0-9-] kebab-case only, max ~50 chars truncated on a word boundary.
# Must equal the portion of id after the YYYYMMDD- prefix.
slug: design-entry-schema

# task: one-line imperative description of what was done. Required field.
task: "Define the whydone entry schema and storage contract"

# status: closed enum — done | wip | blocked. Defaults to done if omitted.
# Including it explicitly here to show the enum and demonstrate it is always a safe string value.
status: done

# tags: array of kebab-case strings. Bracket form is required even for a single tag.
# Writing "tags: schema" (bare scalar) parses as a string, not an array — tooling breaks.
tags: [schema, storage-contract, documentation]

# files: repo-relative paths touched in this task (as produced by git diff).
# Same bracket-form rule as tags — always use [path1, path2] even for a single file.
files: [SCHEMA.md, .whydone/20260601-design-entry-schema.md]
---

## What changed

- Created `SCHEMA.md` at the repository root — the prose contract defining all 10 frontmatter fields (schema, id, date, slug, task, status, tags, files, links, supersedes), the five canonical body headings, the flat `.whydone/<YYYYMMDD-slug>.md` storage rule, the fail-soft lenient-read contract, the supersedes tombstone lifecycle, the gray-matter parser notes table, and a security note about committed entries.
- Created `.whydone/20260601-design-entry-schema.md` (this file) — the canonical annotated template entry showing every documented rule via inline YAML comments and all five body sections with real prose.
- Established the flat `.whydone/` directory layout with no `entries/` subfolder; `INDEX.md` and `manifest.json` are generated files excluded from the entry glob by filename.

## Why / decisions

- Chose **prose + annotated template** over a formal JSON Schema because the project's "thin CLI / minimal deps" constraint means Phase 2 enforces rules in TypeScript code using gray-matter — adding ajv/JSON-Schema would add a dependency for no real gain (the contract is too small for a schema language to pay off).
- Used **YAML frontmatter for machine-parseable fields** and a **Markdown body for AI-readable narrative** — the dual format serves both consumers: the CLI reads frontmatter deterministically, and the recall skill reads the body prose directly. One file format, two consumption modes.
- Chose **flat `.whydone/` directory** (no `entries/` subfolder) because the two generated files (`INDEX.md` and `manifest.json`) can be excluded by exact filename in the glob — keeping the layout simpler and the glob pattern `.whydone/*.md` readable without regex.

## Alternatives rejected

- **JSON Schema + ajv** — rejected because it adds a runtime dependency to the Phase 2 CLI for a 10-field schema that can be validated with 20 lines of TypeScript. Prose contract + rules-in-code matches the "minimal deps" constraint and is more context-aware for the recall use case.
- **`entries/` subfolder** (`.whydone/entries/*.md`) — rejected because flat layout is simpler and the `INDEX.md`/`manifest.json` exclusion by exact filename is straightforward. Flat matches the locked decision in CONTEXT.md D-05 and REQUIREMENTS.md SCHEMA-02.

## Gotchas / risks

- **Unquoted date coercion (Pitfall 1):** `date: 2026-06-01` (unquoted) is parsed by gray-matter 4.0.3 + js-yaml 3.14.2 as a JavaScript `Date` object, not the string `"2026-06-01"`. Phase 2 must normalize any received Date via `.toISOString().slice(0,10)` or use the js-yaml `JSON_SCHEMA` engine option. Convention: always quote the date field as shown in this entry.
- **Scalar-to-array coercion (Pitfall 2):** Writing `tags: schema` (bare scalar) parses as the string `"schema"`, not the array `["schema"]`. Any code doing `entry.tags.includes(query)` will throw or return wrong results on string input. Phase 2 must coerce: `Array.isArray(v) ? v : v ? [v] : []`. Same risk applies to `files`, `links`, and `supersedes`.
- **YAMLException on malformed frontmatter (Pitfall 3):** A YAML syntax error (e.g. `tags: {unclosed`) causes gray-matter to throw `YAMLException`. Phase 2 read path must wrap every `matter()` call in `try/catch` — a single malformed entry must not crash index rebuild or recall.

## Verify-later / follow-ups

- [ ] Validate this entry against the Phase 2 validator once implemented — confirm all assertions pass: `schema === 1`, `typeof date === 'string'`, `Array.isArray(tags)`, `Array.isArray(files)`, `id === '20260601-design-entry-schema'`.
- [ ] Confirm slug transliteration behavior after Phase 2 config mechanism is defined — Phase 1 only mandates ASCII output; the actual transliteration table/library is a Phase 2/3 implementation detail.
