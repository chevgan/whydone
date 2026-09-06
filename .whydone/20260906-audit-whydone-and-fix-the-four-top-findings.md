---
schema: 1
id: 20260906-audit-whydone-and-fix-the-four-top-findings
date: "2026-09-06"
slug: audit-whydone-and-fix-the-four-top-findings
task: "Audit whydone, fix its findings, and add a journal language setting"
tags: [audit, security, journal-language, release]
files: [src/lib/parse-entry.ts, src/commands/recall.ts, src/lib/marker-block.ts, src/commands/validate.ts, src/lib/config.ts, src/commands/init.ts, src/lib/lock-file.ts, src/lib/rank-entries.ts, templates/skills/log/SKILL.md, bin/whydone.mjs, README.md, SCHEMA.md, SECURITY.md, package.json, .claude-plugin/plugin.json, package-lock.json, .github/workflows/ci.yml, tests/update.test.ts, tests/parse-entry.test.ts, tests/validate.test.ts]
---

## What changed
- Full audit (code, tests, build, plugin channel, README): the base was healthy (421 tests, clean tsc, no bin drift) but hid an RCE through frontmatter, CLAUDE.md corruption, a broken README and gaps in validate. Thirteen commits followed, bin/whydone.mjs rebuilt inside each one that touches src.
- `src/lib/parse-entry.ts`: `safeMatter()` disables gray-matter's js/javascript/json engines, so a `---js` entry is `_parseError` instead of executed code; reserved keys (`_parseError`, `_sections`, `_scalarFields`) no longer leak in from frontmatter; `src/commands/recall.ts` reads bodies through the same helper; SCHEMA.md states the YAML-only rule.
- `src/lib/marker-block.ts`: line-based block search (last start marker, first end after it), stray lone markers dropped on rewrite, CRLF preserved. `src/commands/validate.ts`: blocking `ID_DATE_MISMATCH`, `BAD_TYPE` for files and links, readable `WRONG_SCHEMA` message. README: example entry body and closing fence restored (lost in 878b0d1).
- New `language` key in `.whydone/config.json` (`src/lib/config.ts`), `init --language <tag>`, honored by the log skill's STEP 0/3/5 (task line and body prose only); this repo's journal set to `en`.
- `src/lib/lock-file.ts`: structural guard on v2 locks (no more TypeError in uninstall/update); `src/lib/rank-entries.ts`: edge hyphens stripped from query tokens; `tests/update.test.ts`: first coverage of `update` (12 tests).
- Version 1.3.1 in package.json and plugin.json; `npm audit fix` (dev deps only, js-yaml 3.15.2 lands in the bundle); Node 24 in CI; SECURITY.md and the SCHEMA.md example pointer fixed. Tests: 472 (+51).

## Why / decisions
- gray-matter picks its parser from the language after `---`, and for js that is a direct eval: validate reported "0 errors" while the entry's code ran in validate, index and recall. Closed via the engines option, not a library swap: a twenty-line patch with a test beats a parser refactor right before a patch release. json is blocked with js because the schema says YAML.
- `ID_DATE_MISMATCH` is blocking, not a warning: SCHEMA.md already requires the match, and the degraded /recall mode rebuilds paths from date plus slug.
- marker-block heals itself by dropping stray markers on rewrite; remove without a located block leaves the file untouched.
- Language is config, not conversation: a public repo with English docs wants `en` no matter who runs /log, and one language per repo keeps substring recall exact. Not added to the wizard: three questions is the limit.
- Separate commits with bin rebuilt per commit via stash --keep-index, package-lock committed first, so the CI drift check holds on every commit.

## Alternatives rejected
- Replace gray-matter with a splitter plus js-yaml 4: cleaner, removes eval from the bundle, but a refactor touching SCHEMA.md Parser Notes; deferred.
- First-line check for a bare `---` instead of overriding engines: breaks the legal `---yaml` form and misses the second matter call in recall.

## Gotchas / risks
- eval is still in the bundle, only unreachable; scanners will keep flagging it until gray-matter is replaced.
- `ID_DATE_MISMATCH` can break someone's CI on hand-edited entries.
- The version says 1.3.1 but a feat landed after the bump: SemVer wants 1.4.0 for the release that carries it. Undecided at write time.
- 1.3.0 is already on origin and the plugin updates only on a version change: nothing reaches users until this is pushed and published.

## Verify-later / follow-ups
- [ ] Decide 1.3.1 vs 1.4.0, push, tag, npm publish.
- [ ] Replace gray-matter with a splitter plus js-yaml 4 and update the Parser Notes in SCHEMA.md.
- [ ] Check the plugin Stop hook in the desktop app: is node on PATH there.
- [ ] Teach the recall skill to weight query expansion toward the configured language.
