import { readFile, writeFile } from 'node:fs/promises'

/**
 * Marker comments that delimit the whydone block in CLAUDE.md.
 * These exact strings are used for idempotent insert/update/remove.
 */
export const MARKER_START = '<!-- whydone:start -->'
export const MARKER_END = '<!-- whydone:end -->'

/**
 * Which CLAUDE.md the block is written into: a repo's own CLAUDE.md
 * ('project') or the user-global ~/.claude/CLAUDE.md ('global').
 */
export type MarkerScope = 'project' | 'global'

/**
 * Build the whydone marker block as lines, markers included.
 *
 * The block is mode-neutral by design (06-DESIGN §6.5): the journal mode
 * lives in `.whydone/config.json` and can change on a mere git pull, so the
 * block routes writes through /log and lets the skill read the mode itself.
 */
function buildBlockLines(indexPath: string, scope: MarkerScope): string[] {
  const firstSentence =
    scope === 'global'
      ? `Projects may keep a work journal in a repo-level \`.whydone/\` directory. If present, read \`${indexPath}\` for an overview; do not bulk-read entry files.`
      : `This project keeps a decision log in \`.whydone/\`. For an overview read \`${indexPath}\`; do not bulk-read entry files.`
  return [
    MARKER_START,
    '## whydone — work journal',
    '',
    firstSentence,
    'Before starting work on a topic, load relevant past entries with `/recall` (or `/whydone:recall` if installed as a plugin).',
    'Entries are written only through the `/log` skill, per the journal mode in `.whydone/config.json` (ask / auto / manual — the skill reads it itself). Never create or edit `.whydone/` entry files by any other means.',
    MARKER_END,
  ]
}

/**
 * A marker counts only as a whole line (trailing spaces / \r tolerated).
 * The block is always written with both markers on their own lines, so a
 * prose mention of `<!-- whydone:start -->` inside a sentence is not one.
 */
function isMarkerLine(line: string, marker: string): boolean {
  return line.trim() === marker
}

function isAnyMarkerLine(line: string): boolean {
  return isMarkerLine(line, MARKER_START) || isMarkerLine(line, MARKER_END)
}

/**
 * Locate the managed block: the LAST start-marker line with the first
 * end-marker line after it — the same rule as locateBlock in git-exclude.ts,
 * for the same reason (v1.3 audit, reproduced): a naive first-indexOf pair
 * let a stray lone start marker above user content "open" a block that
 * ended at the real one, so uninstall deleted everything in between — the
 * user's own CLAUDE.md rules included — and an end marker sitting above the
 * start duplicated the text between them on every init.
 */
function locateBlock(lines: string[]): { start: number; end: number } | null {
  let start = -1
  for (let i = lines.length - 1; i >= 0; i--) {
    if (isMarkerLine(lines[i], MARKER_START)) {
      start = i
      break
    }
  }
  if (start === -1) return null
  for (let i = start + 1; i < lines.length; i++) {
    if (isMarkerLine(lines[i], MARKER_END)) return { start, end: i }
  }
  return null
}

/** Line terminator for the lines whydone writes: CRLF only when the file already uses it. */
function detectEol(text: string): '\n' | '\r\n' {
  return text.includes('\r\n') ? '\r\n' : '\n'
}

/** File content, or null on ENOENT. Other errors propagate. */
async function readIfExists(filePath: string): Promise<string | null> {
  try {
    return await readFile(filePath, 'utf-8')
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return null
    throw err
  }
}

/**
 * Insert or update the whydone marker block in CLAUDE.md.
 *
 * - Reads the file (treats ENOENT as an empty file)
 * - If a block is located: replaces it in place (idempotent update)
 * - If not: appends the block after the trimmed content, two-newline separated
 * - Either way, stray lone marker lines outside the block are dropped so they
 *   can never pair up with a future block. User text is never touched.
 *
 * T-02-05 mitigation: idempotent — locate before deciding insert vs. replace.
 */
export async function patchClaudeMd(
  claudeMdPath: string,
  indexPath: string,
  scope: MarkerScope = 'project',
): Promise<void> {
  const existing = (await readIfExists(claudeMdPath)) ?? ''
  const eol = detectEol(existing)
  const cr = eol === '\r\n' ? '\r' : ''
  // split('\n') keeps each line's own '\r' — existing lines round-trip byte-exact.
  const lines = existing.split('\n')
  const blockLines = buildBlockLines(indexPath, scope)
  const block = locateBlock(lines)

  let result: string
  if (block !== null) {
    const before = lines.slice(0, block.start).filter((l) => !isAnyMarkerLine(l))
    const after = lines.slice(block.end + 1).filter((l) => !isAnyMarkerLine(l))
    result = [...before, ...blockLines.map((l) => l + cr), ...after].join('\n')
  } else {
    // A fresh/empty file must not start with blank lines.
    const head = lines.filter((l) => !isAnyMarkerLine(l)).join('\n').trimEnd()
    result = (head ? head + eol + eol : '') + blockLines.join(eol) + eol
  }

  await writeFile(claudeMdPath, result, 'utf-8')
}

/**
 * Remove the whydone marker block from CLAUDE.md.
 *
 * - No-ops if no block is located or the file does not exist
 * - Preserves all content before and after the block (stray lone markers
 *   outside it are dropped along with the block)
 */
export async function removeMarkerBlock(claudeMdPath: string): Promise<void> {
  const existing = await readIfExists(claudeMdPath)
  if (existing === null) return // File doesn't exist — nothing to remove

  const lines = existing.split('\n')
  const block = locateBlock(lines)
  if (block === null) return // No marker block — no-op

  const eol = detectEol(existing)
  const before = lines
    .slice(0, block.start)
    .filter((l) => !isAnyMarkerLine(l))
    .join('\n')
    .trimEnd()
  const after = lines
    .slice(block.end + 1)
    .filter((l) => !isAnyMarkerLine(l))
    .join('\n')
    .replace(/^(\r?\n)+/, '')

  let result: string
  if (!after) {
    result = before + eol
  } else if (!before) {
    result = after
  } else {
    result = before + eol + eol + after
  }

  await writeFile(claudeMdPath, result, 'utf-8')
}
