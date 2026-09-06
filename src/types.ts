/**
 * Shared TypeScript types for the whydone CLI.
 * All subcommands implement against these contracts.
 */

/**
 * Closed enum for entry status field.
 */
export type EntryStatus = 'done' | 'wip' | 'blocked'

/**
 * Shape returned by parseEntry(). Represents a single .whydone entry
 * after lenient reading (frontmatter split + field normalization).
 *
 * _file and _stem are always present. All frontmatter fields are optional
 * because parseEntry() degrades gracefully on malformed entries (_parseError: true).
 */
export interface ParsedEntry {
  /** Absolute path to the entry file */
  _file: string
  /** Filename without .md extension (e.g. "20260601-design-entry-schema") */
  _stem: string
  /** True when the frontmatter could not be parsed (YAML error, refused language suffix, unclosed block) — all other fields absent */
  _parseError?: boolean
  /** Schema version — must equal 1 for v1 entries */
  schema?: number
  /** Entry id — must equal filename stem */
  id?: string
  /** ISO date string YYYY-MM-DD (normalized from Date object if unquoted in YAML) */
  date?: string
  /** ASCII kebab-case slug — must equal id.slice(9) */
  slug?: string
  /** One-line imperative description of what was done */
  task?: string
  /** Entry status — done | wip | blocked */
  status?: string
  /** Tags — always array after toArray normalization */
  tags?: string[]
  /** Repo-relative file paths — always array after toArray normalization */
  files?: string[]
  /** Free-form links — always array after toArray normalization */
  links?: string[]
  /** IDs of entries this entry supersedes — always array after toArray normalization */
  supersedes?: string[]
  /** Present canonical body headings detected in the entry */
  _sections?: string[]
  /** Names of frontmatter fields where scalar-to-array coercion was applied */
  _scalarFields?: string[]
  /** Forward-compatible: preserve unknown frontmatter fields */
  [key: string]: unknown
}

/**
 * A single validation issue (error or warning) for a specific entry.
 */
export interface ValidationIssue {
  /** Machine-readable issue code (e.g. "MISSING_FIELD", "BAD_DATE", "ID_MISMATCH") */
  code: string
  /** Human-readable description */
  message: string
  /** Which frontmatter field the issue relates to, if applicable */
  field?: string
}

/**
 * Shape returned per entry by the strict validate pass.
 */
export interface ValidationResult {
  /** Absolute path to the entry file */
  file: string
  /** Filename without .md extension */
  stem: string
  /** Blocking errors — any non-empty errors array causes non-zero exit */
  errors: ValidationIssue[]
  /** Non-blocking warnings — do not affect exit code */
  warnings: ValidationIssue[]
}

/**
 * Concrete output shape for a single entry in manifest.json.
 *
 * Distinct from ParsedEntry (which has [key: string]: unknown index signature).
 * All array fields are guaranteed non-optional; _supersededBy is a computed
 * second-pass inverse of supersedes[].
 */
export interface ManifestEntry {
  /** Entry id (equals filename stem) */
  id: string
  /** ISO date string YYYY-MM-DD */
  date: string
  /** ASCII kebab-case slug */
  slug: string
  /** One-line imperative description of what was done */
  task: string
  /** Entry status — done | wip | blocked */
  status: string
  /** Tags */
  tags: string[]
  /** Repo-relative file paths */
  files: string[]
  /** Free-form links */
  links: string[]
  /** IDs of entries this entry supersedes */
  supersedes: string[]
  /** Canonical body headings detected in the entry */
  _sections: string[]
  /** True when the entry had a YAML parse error */
  _parseError: boolean
  /** Computed inverse: IDs of entries whose supersedes[] references this entry's id */
  _supersededBy: string[]
}

/**
 * Shape of .claude/whydone.lock.json written by `npx whydone init`.
 * Read by `uninstall`/`update` to perform exact surgical cleanup.
 *
 * Lock v2 semantics (design §7.2): every path is relative to the lock file's
 * OWN directory, POSIX-separated. The lock is self-contained — any command
 * that found the lock resolves its contents via
 * path.resolve(path.dirname(lockPath), rel), never against cwd.
 * `installedAt` was removed in v2: the lock is deterministic and committable
 * without churn; `version` alone carries update detection.
 */
export interface LockFile {
  /** Lock format version — readers accept only 2 */
  lockVersion: number
  /** whydone package version that ran init (for update detection) */
  version: string
  /** Install scope: project .claude/skills/ or global ~/.claude/skills/ */
  scope: 'project' | 'global'
  /** Lock-dir-relative POSIX path to the skills directory (e.g. "skills") */
  skillsDir: string
  /** Lock-dir-relative POSIX paths to every file copied by init */
  skills: string[]
  /** Whether init patched CLAUDE.md with the marker block */
  claudeMdPatched: boolean
  /** Lock-dir-relative POSIX path to CLAUDE.md (e.g. "../CLAUDE.md") */
  claudeMdPath: string
}
