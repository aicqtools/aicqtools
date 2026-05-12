# Large file parsing regression fixture

Guards against the `tree-sitter@0.21.1` 32,768-byte native-binding bug that blocked alpha.2 on TalkUp's `CharacterForm.tsx` (49,961 bytes). Run `node generate.mjs` to materialize TSX/TS/Python fixtures of 32K / 50K / 100K bytes, then `node verify.mjs` to assert that `parseSource()` returns a clean tree (`rootNode.type === 'program'|'module'`, no `hasError`, no throw).

Pass criterion: every fixture parses without throwing and without syntactic errors. CI runs both scripts back-to-back; a failure means tree-sitter regressed on large inputs (or the upgrade was reverted).

The `src/` output is gitignored — fixtures are regenerated on every CI run.
