import { load } from 'js-yaml'

/**
 * whydone's own frontmatter splitter — the v1.4 replacement for gray-matter.
 *
 * Why not gray-matter: it selected a parser from a "language" written after
 * the opening delimiter (`---js`, `---json`), and its JavaScript engine was a
 * direct eval(). v1.3.1 neutralized that through an engines override, but the
 * eval stayed in the bundle for every scanner to flag, on top of a js-yaml 3
 * line that only gray-matter still pinned. The contract only ever needed YAML
 * between two `---` lines (SCHEMA.md §Frontmatter Fields) — forty lines of
 * code over js-yaml 4's safe-by-default load().
 *
 * Semantics kept from gray-matter so SCHEMA.md §Parser Notes and every
 * downstream consumer still hold:
 *  - a leading BOM is ignored;
 *  - no `---` opener on the first line ⇒ { data: {}, content: text } (no throw);
 *  - `---yaml` / `---yml` after the opener is accepted (the only language the
 *    contract ever allowed); any other suffix throws;
 *  - the closing delimiter is a line that is exactly `---` (trailing
 *    whitespace / CR tolerated); an opener without one throws;
 *  - exactly one line break after the closing line is dropped from content;
 *  - an empty or comments-only block ⇒ data {};
 *  - YAML that is not a mapping (a scalar, a list) ⇒ data {} — the read path
 *    is lenient, never a crash; YAML syntax errors propagate (YAMLException).
 */
export interface Frontmatter {
  data: Record<string, unknown>
  content: string
}

const DELIMITER = '---'
const ALLOWED_LANGUAGES: ReadonlySet<string> = new Set(['', 'yaml', 'yml'])

function stripCr(line: string): string {
  return line.endsWith('\r') ? line.slice(0, -1) : line
}

function isClosingLine(line: string): boolean {
  return stripCr(line).trimEnd() === DELIMITER
}

/**
 * Parse the YAML block into a plain object. js-yaml 4's load() is safe by
 * default (no !!js/* tags); an empty / comments-only document yields
 * undefined, and a scalar or sequence document is not entry data — both
 * read as {}.
 */
function parseMapping(block: string): Record<string, unknown> {
  const parsed: unknown = load(block)
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return {}
  return parsed as Record<string, unknown>
}

/**
 * Split a Markdown file into its YAML frontmatter and body.
 * Throws on a non-YAML language suffix, an unclosed block, or invalid YAML;
 * the lenient read path (parseEntry) turns every throw into _parseError.
 */
export function splitFrontmatter(raw: string): Frontmatter {
  const text = raw.charCodeAt(0) === 0xfeff ? raw.slice(1) : raw

  const firstBreak = text.indexOf('\n')
  const firstLine = stripCr(firstBreak === -1 ? text : text.slice(0, firstBreak))
  if (!firstLine.startsWith(DELIMITER)) return { data: {}, content: text }

  const language = firstLine.slice(DELIMITER.length).trim()
  if (!ALLOWED_LANGUAGES.has(language.toLowerCase())) {
    throw new Error(`frontmatter language "${language}" is not allowed — entries are YAML only`)
  }
  if (firstBreak === -1) {
    throw new Error('frontmatter opened with --- but never closed')
  }

  const lines = text.slice(firstBreak + 1).split('\n')
  const closeIdx = lines.findIndex(isClosingLine)
  if (closeIdx === -1) {
    throw new Error('frontmatter opened with --- but never closed')
  }

  return {
    data: parseMapping(lines.slice(0, closeIdx).join('\n')),
    // The split consumed the line break right after the closing line — the
    // one gray-matter dropped too; every later blank line survives verbatim.
    content: lines.slice(closeIdx + 1).join('\n'),
  }
}
