# Contributing to whydone

## Dev setup

```bash
npm ci
npm test          # vitest run
npm run build     # tsdown -> dist/cli.js, then synced to bin/whydone.mjs
```

Node >= 20.19. ESM only.

`bin/whydone.mjs` is a **committed build artifact** — the plugin channel's vendored CLI, copied from `dist/cli.js` by `scripts/sync-plugin-bin.mjs`. Never edit it by hand; run `npm run build` and commit the regenerated file together with your `src/` change (CI fails on drift via `git diff --exit-code -- bin`).

## Ground rules

- **SCHEMA.md is law** for the entry format. Tooling matches its headings and frontmatter verbatim.
- **Entries are immutable tombstones.** Never edit an existing `.whydone/*.md` entry; revisions are new entries with `supersedes:`.
- **Skills live only in `templates/skills/`.** The CLI copies them and the plugin serves them from there — never edit an installed copy.
- **Read paths are lenient, `validate` alone is strict.** `recall` and `index` must never crash on a malformed entry.
- **The CLI is deterministic.** No LLM calls, no network, no embeddings. Ranking is pure code (`src/lib/rank-entries.ts`).

## Dogfooding

Finish a change, then `/log` it. PRs that change behavior should carry a journal entry in `.whydone/`.

## Tests

- vitest; integration tests use real temp dirs (`mkdtemp`), not fs mocks.
- Template lint tests pin every load-bearing SKILL.md string — when you change a skill template, update the lint test in the same commit.

## Commit format

`<type>: <description>` where type is one of `feat`, `fix`, `refactor`, `docs`, `test`, `chore`, `ci`.

## Releasing

Bump `package.json` and `.claude-plugin/plugin.json` **together** — `scripts/check-versions.mjs` runs in prepack and CI and fails the build on a mismatch.
