# install-isolation — alpha.5 regression fixture

End-to-end fixture that catches the alpha.4 defect class: multiple `tree-sitter` native binding instances getting installed side-by-side under `node_modules/`. The TalkUp alpha.4 dogfood hit this when `tree-sitter-typescript`'s `peerOptional ^0.21` made npm hoist `tree-sitter@0.21.1` to the user root while each aicq package nested its own `tree-sitter@0.22.4` — four native copies, cross-instance `Parser.Tree` / `Parser.Query` calls failed under typescript grammar's strict node identity check.

alpha.5 fixes this by:
- moving `tree-sitter*` to `peerDependencies` in `@aicqtools/core`, `@aicqtools/guardrail`, `@aicqtools/rule-sdk`
- declaring `tree-sitter*` as direct `dependencies` of `@aicqtools/cli` so user installs hoist a single copy
- pinning `tree-sitter` via root `pnpm.overrides` for monorepo dev/CI

This fixture verifies both invariants:

1. After `npm install` of the packed CLI into a clean tempdir, **exactly one** `tree-sitter` package copy is hoisted.
2. The four YAML pattern rules (`no-direct-openai`, `no-direct-anthropic`, `no-inline-date`, `no-inline-math-round`) run on a `.ts` source without `@aicq/parse-failed` warnings.

## Running locally

```bash
# pack the workspace CLI + all its workspace deps
pnpm -r pack --pack-destination /tmp/aicq-tarballs

# run the bisect
node e2e/install-isolation/run-bisect.mjs /tmp/aicq-tarballs
```

The script exits non-zero on any failure. CI wires it as a hard gate.

## When this fails

| Symptom | Likely cause |
|---|---|
| `expected 1 tree-sitter copy, found N` | A dep added an explicit `tree-sitter` range that diverges from the workspace's `~0.22.4`. Check `pnpm.overrides` and any new package's `dependencies.tree-sitter`. |
| `bisect found N guilty rules` | The single-instance invariant holds but tree-sitter native is rejecting query×tree calls. Likely a `tree-sitter-typescript` major bump that broke the grammar API. |
