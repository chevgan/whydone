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
 * Build the whydone marker block content, with markers around it.
 *
 * The block is mode-neutral by design (06-DESIGN §6.5): the journal mode
 * lives in `.whydone/config.json` and can change on a mere git pull, so the
 * block routes writes through /log and lets the skill read the mode itself.
 */
function buildBlock(indexPath: string, scope: MarkerScope): string {
  const firstSentence =
    scope === 'global'
      ? `Projects may keep a work journal in a repo-level \`.whydone/\` directory. If present, read \`${indexPath}\` for an overview; do not bulk-read entry files.\n`
      : `This project keeps a decision log in \`.whydone/\`. For an overview read \`${indexPath}\`; do not bulk-read entry files.\n`
  return (
    `${MARKER_START}\n` +
    `## whydone — work journal\n\n` +
    firstSentence +
    `Before starting work on a topic, load relevant past entries with \`/recall\` (or \`/whydone:recall\` if installed as a plugin).\n` +
    `Entries are written only through the \`/log\` skill, per the journal mode in \`.whydone/config.json\` (ask / auto / manual — the skill reads it itself). Never create or edit \`.whydone/\` entry files by any other means.\n` +
    `${MARKER_END}`
  )
}

/**
 * Insert or update the whydone marker block in CLAUDE.md.
 *
 * - Reads the file (creates empty string if ENOENT)
 * - If markers found: replaces the block between them (idempotent update)
 * - If not found: appends block with two-newline separator
 *
 * T-02-05 mitigation: idempotent — indexOf check before deciding insert vs. replace path.
 */
export async function patchClaudeMd(
  claudeMdPath: string,
  indexPath: string,
  scope: MarkerScope = 'project',
): Promise<void> {
  let existing: string
  try {
    existing = await readFile(claudeMdPath, 'utf-8')
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      existing = ''
    } else {
      throw err
    }
  }

  const newBlock = buildBlock(indexPath, scope)
  const startIdx = existing.indexOf(MARKER_START)
  const endIdx = existing.indexOf(MARKER_END)

  let result: string
  if (startIdx !== -1 && endIdx !== -1) {
    // Both markers found — replace the block between them (inclusive)
    result =
      existing.slice(0, startIdx) +
      newBlock +
      existing.slice(endIdx + MARKER_END.length)
  } else {
    // No markers — append after trimming trailing whitespace. A fresh/empty
    // file must not start with blank lines.
    const head = existing.trimEnd()
    result = (head ? head + '\n\n' : '') + newBlock + '\n'
  }

  await writeFile(claudeMdPath, result, 'utf-8')
}

/**
 * Remove the whydone marker block from CLAUDE.md.
 *
 * - No-ops if block not found or file does not exist
 * - Preserves all content before and after the block
 */
export async function removeMarkerBlock(claudeMdPath: string): Promise<void> {
  let existing: string
  try {
    existing = await readFile(claudeMdPath, 'utf-8')
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      return // File doesn't exist — nothing to remove
    }
    throw err
  }

  const startIdx = existing.indexOf(MARKER_START)
  const endIdx = existing.indexOf(MARKER_END)

  if (startIdx === -1 || endIdx === -1) {
    // No marker block — no-op
    return
  }

  const before = existing.slice(0, startIdx).trimEnd()
  const after = existing.slice(endIdx + MARKER_END.length).replace(/^\n+/, '')

  let result: string
  if (after) {
    result = before + '\n\n' + after
  } else {
    result = before + '\n'
  }

  await writeFile(claudeMdPath, result, 'utf-8')
}
