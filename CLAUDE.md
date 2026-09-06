# whydone

**Done. And why.** — AI session memory & decision log for Claude Code. A work journal in `.whydone/` that persists decisions, gotchas, and open follow-ups between sessions. Not a release changelog.

## What ships

- **Two skills** (single source in `templates/skills/`, copied by the CLI and served by the plugin):
  - `/log` (`/whydone:log` via plugin) — writes one journal entry after a task, per the journal mode (ask / auto / manual) in `.whydone/config.json`.
  - `/recall` (`/whydone:recall` via plugin) — ranks and loads relevant past entries; auto-invocable.
- **Eight CLI commands** (citty, entry point `src/cli.ts`): `init`, `index`, `validate`, `recall`, `update`, `uninstall`, `hide`, `publish`.
- **Plugin channel (primary)**: `.claude-plugin/` manifests serve `templates/skills/`, `hooks/hooks.json` ships the Stop hook, and `bin/whydone.mjs` is the vendored self-contained CLI (committed build artifact, synced from `dist/cli.js` by `scripts/sync-plugin-bin.mjs`; CI fails on drift). Per-project bootstrap for plugin users: `init --journal-only`.

## Layout

```
src/cli.ts            — citty entry, registers subcommands
src/commands/         — one file per subcommand
src/lib/              — copy-skills, marker-block (CLAUDE.md patching), lock-file,
                        git-exclude (.git/info/exclude for storage: local),
                        entry parsing/validation, rank-entries (recall scoring)
templates/skills/     — log/SKILL.md, recall/SKILL.md (single source of truth)
bin/whydone.mjs       — vendored plugin CLI (committed; regenerate via npm run build, never edit)
hooks/hooks.json      — plugin Stop hook (invokes the vendored CLI)
tests/                — vitest, memfs-backed
SCHEMA.md             — the entry format contract (single source of truth)
.whydone/           — this repo's own journal (dogfooding)
```

## Contracts to respect

- **SCHEMA.md is law** for entry format: flat `.whydone/<YYYYMMDD-slug>.md`, YAML frontmatter (`schema: 1`, quoted `date`, bracket-form arrays), five canonical body headings matched verbatim by tooling.
- Generated files `INDEX.md` and `manifest.json` live in `.whydone/` and are never hand-edited.
- Read paths (recall, index) are lenient and never crash on a malformed entry; only `whydone validate` is strict.
- Entries are immutable tombstones — revisions are new entries with `supersedes:`.
- **Storage axis, orthogonal to mode**: `storage: committed` (default) vs `local` in config.json. Local journals are hidden ONLY via `.git/info/exclude` (never a committed .gitignore — that would reveal them); `hide` refuses on a tracked `.whydone/`; a plain `uninstall` must never drop the exclude entries of a surviving local journal (only `--purge` cleans them).
- Recall ranking is deterministic (no embeddings, no model calls): see `src/lib/rank-entries.ts`.
- Skills resolve the CLI via a fixed chain: `node "${CLAUDE_PLUGIN_ROOT}/bin/whydone.mjs"` (plugin-vendored) → `npx --no-install whydone` → `node_modules/.bin/whydone`. Plain `npx` (network fetch) is forbidden inside skills. The vendored path spelling is pinned by tests/plugin-channel.test.ts.

## Constraints

- No backend, no database, no cloud — files in the repo only.
- Node >= 20.19, ESM only (`"type": "module"`), compiled with tsdown to `dist/`; never ship runtime TypeScript.
- Zero runtime dependencies: citty, js-yaml, picocolors, tinyglobby, and @clack/prompts (lazy-loaded TTY wizard) live in devDependencies and are bundled by tsdown into a single self-contained `dist/cli.js` (also vendored as `bin/whydone.mjs`).
- Target audience v1: solo developers using Claude Code; zero-config defaults.

## Commands

- `npm test` — vitest run
- `npm run build` — tsdown → `dist/cli.js`
- `node dist/cli.js validate` — strict-check this repo's own journal
- `claude plugin validate . --strict` — validate plugin manifests

<!-- whydone:start -->
## whydone — work journal

This project keeps a decision log in `.whydone/`. For an overview read `.whydone/INDEX.md`; do not bulk-read entry files.
Before starting work on a topic, load relevant past entries with `/recall` (or `/whydone:recall` if installed as a plugin).
Entries are written only through the `/log` skill, per the journal mode in `.whydone/config.json` (ask / auto / manual — the skill reads it itself). Never create or edit `.whydone/` entry files by any other means.
<!-- whydone:end -->
