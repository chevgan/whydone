import { defineConfig } from 'tsdown'

// Plain .mjs + `--config-loader native` in the build script, on purpose: on
// runtimes without native type stripping tsdown routes EVERY config (even
// .mjs) through an optional "unrun" loader that is not installed — the
// v1.0.0 CI matrix failed on Node 20 exactly there. Native import + JS
// config loads everywhere.
//
// All runtime deps live in devDependencies so tsdown bundles them: the emitted
// dist/cli.js is fully self-contained (zero install-time dependencies for npm
// consumers, and the same file is vendored verbatim into the plugin channel as
// cli/whydone.mjs by scripts/sync-plugin-cli.mjs).
// The bundled packages keep no license headers in the output, so their
// notices live in THIRD_PARTY_NOTICES.md; tests/third-party-notices.test.ts
// checks that file against the //#region markers rolldown leaves in the bundle.
// dts: false also kills declaration sourcemaps — a bin-only package ships no
// types, and .map files would leak full source text into the tarball.
export default defineConfig({
  entry: ['src/cli.ts'],
  format: 'esm',
  target: 'node20',
  platform: 'node',
  shims: false,
  clean: true,
  fixedExtension: false,
  dts: false,
  // One self-contained file: the lazy per-subcommand import()s in cli.ts would
  // otherwise split into sibling chunks, and the plugin channel vendors exactly
  // one file (cli/whydone.mjs).
  // NOTE: tsdown 0.22 deprecation hint suggests codeSplitting: false, but that
  // option is NOT wired in 0.22 (verified: emits chunked output) — keep the
  // deprecated-but-working outputOptions form until the tsdown upgrade.
  outputOptions: {
    inlineDynamicImports: true,
  },
})
