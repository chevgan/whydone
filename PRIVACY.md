# Privacy policy

whydone is a Claude Code plugin (and an npm CLI) that keeps a work journal inside your own git repository. This page describes what it does with data. It is short because whydone does very little.

## Summary

- whydone collects nothing and sends nothing: no telemetry, no analytics, no crash reports, no account, no network access.
- Everything it writes stays in the repository it runs in, under `.whydone/`, as plain files you own.
- Nothing is ever transmitted by whydone to the plugin author, to Anthropic, or to anyone else.

## What whydone writes, and when

- **Journal entries** (`.whydone/<date>-<slug>.md`). Each entry is a short prose summary, written by Claude, of what a piece of work changed and why: decisions, rejected alternatives, gotchas, open follow-ups. It is not a transcript of the conversation. The `/whydone:log` skill (`/log` on the npm channel) is instructed to keep an entry under about fifty lines and never to transcribe command output, environment values, credentials, or other secret-shaped strings; it is not a scanner, so review entries the way you review code. Entries are written only when you run the skill, or per the journal mode you chose in `.whydone/config.json`:
  - `manual`: entries are written only when you invoke the skill yourself.
  - `ask` (the default): after substantive work, Claude drafts the entry, shows you its full text, and writes it only after you confirm.
  - `auto`: an opt-in mode you select explicitly. Claude writes the entry without the confirmation question and you review it in `git diff`.
- **Generated index files** (`.whydone/INDEX.md`, `.whydone/manifest.json`), rebuilt from the entries by the CLI. They hold entry metadata only: dates, slugs, task lines, tags, file names.
- **Hook state** (`.whydone/.cache/`). The Stop hook checks git for unlogged work (commits or changed files since the last entry) and keeps one small JSON file recording the session id, a fingerprint of the repository state it last nudged for, and a timestamp, so it never nudges twice for the same state. The directory is git-ignored by the scaffold. The hook never reads the conversation, and the message it hands to Claude contains nothing from your repository except two counts.
- **Configuration and scaffolding**: `.whydone/config.json` (mode, storage, language), a marker block in your `CLAUDE.md`, and on the npm channel the skills copied into `.claude/skills/`, a lock file, and, with your consent, a Stop hook entry in `.claude/settings.local.json`.

## Where the data lives

- With the default `storage: committed`, the journal is an ordinary part of your repository and goes wherever the repository goes: remotes, teammates, CI. If the repository is public, the journal is public.
- With `storage: local`, the journal stays out of git through `.git/info/exclude` and exists only in that folder on that machine.

Either way the data is yours: Markdown and JSON files you can read, edit, and delete at any time. Deleting `.whydone/` removes everything whydone wrote except the marker block in `CLAUDE.md`, which `whydone uninstall` (or any editor) removes.

## What whydone reads

- Files under `.whydone/` of the current repository.
- git metadata of the current repository (`git status`, `git log`, `git diff --name-only`): commit subjects and file names, to list what an entry covers and to detect unlogged work.
- Its own installation files (`package.json`, `templates/`), to copy skills and report its version.

It does not read your source code contents, your conversation, or files outside the repository, and it makes no network requests.

## The skills run inside your Claude Code session

The two skills, `/whydone:log` and `/whydone:recall`, are instructions executed by Claude in your own session. What they read (the ranked journal entries, git file lists) and what they write (the entry Claude drafts) pass through the model the same way as any file you open or any command output you see in a session, under your existing Claude Code and Anthropic terms. whydone adds no channel of its own.

## Third parties

None. whydone has no accounts, servers, external services, or third-party SDKs. The open-source libraries bundled into the CLI are listed in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md); none of them performs network access in whydone.

## Changes and contact

This policy lives in the repository, so every change to it is visible in git history. Questions: open an issue at <https://github.com/chevgan/whydone/issues>. Security problems: see [SECURITY.md](SECURITY.md).
