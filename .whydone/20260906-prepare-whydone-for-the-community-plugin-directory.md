---
schema: 1
id: 20260906-prepare-whydone-for-the-community-plugin-directory
date: "2026-09-06"
slug: prepare-whydone-for-the-community-plugin-directory
task: "Prepare whydone for the community plugin directory"
tags: [plugin-directory, privacy, release, security]
files: [cli/whydone.mjs, hooks/hooks.json, scripts/sync-plugin-cli.mjs, src/commands/init.ts, src/commands/update.ts, templates/skills/log/SKILL.md, templates/skills/recall/SKILL.md, .github/workflows/ci.yml, .gitattributes, PRIVACY.md, THIRD_PARTY_NOTICES.md, README.md, tsdown.config.mjs, tests/third-party-notices.test.ts, src/lib/frontmatter.ts, src/lib/parse-entry.ts, SCHEMA.md, vitest.config.ts, package.json, .claude-plugin/plugin.json]
links: [https://github.com/chevgan/whydone/pull/1, https://github.com/chevgan/whydone/pull/2]
---

## What changed
- Vendored CLI moved from `bin/whydone.mjs` to `cli/whydone.mjs`: `scripts/sync-plugin-cli.mjs` (renamed), the Stop hook, both skills' allowed-tools and CLI chain, the CI drift check, `.gitattributes`, docs and the pinning tests follow; `init.ts` and `update.ts` recognize a `cli` basename as the plugin root, so `init --journal-only` still finds `templates/`.
- New PRIVACY.md and THIRD_PARTY_NOTICES.md (13 packages inlined into the bundle, verbatim license texts); README got a "Privacy and data" section and a notices link; `tests/third-party-notices.test.ts` pins the notices to the bundle's `//#region` markers and `tsdown.config.mjs` points at it.
- Unlogged since the audit entry: 1.4.0 released (`package.json`, `.claude-plugin/plugin.json`); PR #1 replaced gray-matter with `src/lib/frontmatter.ts` plus js-yaml 4 (no eval left in the bundle, 636 KB to 409 KB, SCHEMA.md parser notes updated); PR #2 raised the vitest timeout in `vitest.config.ts` for the real-git subprocess suites after the windows/node 24 runner timed out.
- Branch `chore/plugin-directory-prep` pushed and PR #3 handed over with title and body; a submission kit for the Console form and a security advisory draft were prepared outside git.

## Why / decisions
- `cli/` instead of `bin/`: Claude Code puts a plugin's top-level `bin/` on the Bash PATH while the plugin is enabled and claude.ai org distribution rejects a top-level `bin/`; whydone reaches the file by explicit path only, so nothing needed PATH.
- The directory policy requires a privacy policy link and forbids collecting conversation data. PRIVACY.md says it plainly: whydone collects and sends nothing, entries are Claude's prose summaries written into the user's own repo (previewed in ask, opt-in in auto), and the skills pass through the model like any file opened in a session.
- Notices are derived from the bundle's `//#region node_modules/...` markers, not from package.json, so only what is actually inlined is listed (js-yaml's argparse is not); scule is listed by hand because citty inlines it inside its own dist.
- The notices test went beyond the task on purpose: a hand-maintained notices file rots on the first dependency bump, and the test also fails on a version mismatch.
- 1.4.1 is a separate tiny PR after the merge: a bump is a release intent, and the directory pipeline pins main's SHA at submission.

## Alternatives rejected
- Keep `bin/` because git marketplaces tolerate it: still lands on PATH and closes the door on org distribution.
- A license banner injected by tsdown into the bundle: touches the npm artifact and shebang handling for no reviewer gain; a notices file plus test does the job.
- Editing the audit entry and `manifest.json`, which still say `bin/whydone.mjs`: entries are immutable tombstones; the grep acceptance check is a heuristic, not a contract.

## Gotchas / risks
- `claude plugin validate . --strict` (Claude Code 2.1.251) only reports the marketplace manifest; it is not a full plugin check.
- The Stop hook's nudge anchor is the journal commit time at second granularity: a commit landing in the same second as the journal commit is invisible to it (bit the simulation, not real use).
- The installed plugin cache is still 1.3.0 with `bin/`, so the hook in this repo keeps the old path until the plugin updates after 1.4.1.
- Two follow-ups of the audit entry are done now (1.4.0 released, gray-matter replaced) but stay unchecked there by immutability.
- `gh` and GNU `timeout` are absent on this machine; `claude --plugin-dir . -p` only proves the plugin loads, the hook path was verified by running the hooks.json command with `CLAUDE_PLUGIN_ROOT` set.

## Verify-later / follow-ups
- [ ] Merge PR #3, then PR #4 `chore: bump version to 1.4.1` (package.json, plugin.json, package-lock root version), tag v1.4.1, npm publish.
- [ ] Submit through the Console form (kit in `.planning/plugin-directory-submission.md`); after acceptance add the `whydone@claude-community` install lines to README.
- [ ] Publish the GitHub security advisory (draft in `.planning/advisory-draft.md`) once 1.4.1 is on npm.
