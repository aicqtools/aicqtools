import { describe, it, expect } from 'vitest';
import { runFileWithSource } from '../runner/run-file.js';
import noIdOverwrite from '../rules-default/no-id-overwrite.js';
import routeNeedsRateLimit from '../rules-default/route-needs-rate-limit.js';
import controllerNeedsAsyncWrapper from '../rules-default/controller-needs-async-wrapper.js';
import fkNeedsOnDelete from '../rules-default/fk-needs-on-delete.js';
import apiResponseShape from '../rules-default/api-response-shape.js';
import { parseYamlRule } from '../matcher/yaml-rule.js';

const noInlineMathRound = parseYamlRule(`
id: no-inline-math-round
language: typescript
severity: warning
message: Avoid inline Math.round.
query: |
  (call_expression
    function: (member_expression
      object: (identifier) @obj
      property: (property_identifier) @prop)
    (#eq? @obj "Math")
    (#eq? @prop "round")) @call
`);

describe('no-id-overwrite', () => {
  it('flags assignment to .id', () => {
    const r = runFileWithSource('a.ts', `obj.id = "new-id-123";\n`, 'typescript', [noIdOverwrite]);
    expect(r.diagnostics).toHaveLength(1);
  });
  it('does not flag .name assignment', () => {
    const r = runFileWithSource('a.ts', `obj.name = "x";\n`, 'typescript', [noIdOverwrite]);
    expect(r.diagnostics).toHaveLength(0);
  });
});

describe('no-inline-math-round (YAML)', () => {
  it('flags Math.round call', () => {
    const r = runFileWithSource('a.ts', `const x = Math.round(1.5);\n`, 'typescript', [noInlineMathRound]);
    expect(r.diagnostics).toHaveLength(1);
  });
  it('does not flag mathHelper.round', () => {
    const r = runFileWithSource('a.ts', `const x = mathHelper.round(1.5);\n`, 'typescript', [noInlineMathRound]);
    expect(r.diagnostics).toHaveLength(0);
  });
});

describe('route-needs-rate-limit', () => {
  it('flags route without rate-limit middleware', () => {
    const src = `router.post("/users", validate, handler);\n`;
    const r = runFileWithSource('a.ts', src, 'typescript', [routeNeedsRateLimit]);
    expect(r.diagnostics).toHaveLength(1);
  });
  it('passes when rateLimit is present', () => {
    const src = `router.post("/users", rateLimit({ max: 10 }), handler);\n`;
    const r = runFileWithSource('a.ts', src, 'typescript', [routeNeedsRateLimit]);
    expect(r.diagnostics).toHaveLength(0);
  });
  it('passes for non-router calls', () => {
    const src = `service.post(payload);\n`;
    const r = runFileWithSource('a.ts', src, 'typescript', [routeNeedsRateLimit]);
    expect(r.diagnostics).toHaveLength(0);
  });
});

describe('controller-needs-async-wrapper', () => {
  it('flags raw async handler on router', () => {
    const src = `router.get("/x", rateLimit(), async (req, res) => { await x(); });\n`;
    const r = runFileWithSource('a.ts', src, 'typescript', [controllerNeedsAsyncWrapper]);
    expect(r.diagnostics).toHaveLength(1);
  });
  it('passes when wrapped with asyncWrapper', () => {
    const src = `router.get("/x", rateLimit(), asyncWrapper(async (req, res) => { await x(); }));\n`;
    const r = runFileWithSource('a.ts', src, 'typescript', [controllerNeedsAsyncWrapper]);
    expect(r.diagnostics).toHaveLength(0);
  });
  it('does not flag synchronous handler', () => {
    const src = `router.get("/x", rateLimit(), (req, res) => { res.send("ok"); });\n`;
    const r = runFileWithSource('a.ts', src, 'typescript', [controllerNeedsAsyncWrapper]);
    expect(r.diagnostics).toHaveLength(0);
  });
});

describe('fk-needs-on-delete', () => {
  it('flags belongsTo without onDelete', () => {
    const src = `User.belongsTo(Org, { foreignKey: "orgId" });\n`;
    const r = runFileWithSource('a.ts', src, 'typescript', [fkNeedsOnDelete]);
    expect(r.diagnostics).toHaveLength(1);
  });
  it('passes when onDelete is present', () => {
    const src = `User.belongsTo(Org, { foreignKey: "orgId", onDelete: "CASCADE" });\n`;
    const r = runFileWithSource('a.ts', src, 'typescript', [fkNeedsOnDelete]);
    expect(r.diagnostics).toHaveLength(0);
  });
  it('flags hasMany without options', () => {
    const src = `Org.hasMany(User);\n`;
    const r = runFileWithSource('a.ts', src, 'typescript', [fkNeedsOnDelete]);
    expect(r.diagnostics).toHaveLength(1);
  });
});

describe('api-response-shape', () => {
  it('flags res.json without success key', () => {
    const src = `app.get("/", (req, res) => { res.json({ data: 1 }); });\n`;
    const r = runFileWithSource('a.ts', src, 'typescript', [apiResponseShape]);
    expect(r.diagnostics).toHaveLength(1);
  });
  it('passes with standard shape', () => {
    const src = `app.get("/", (req, res) => { res.json({ success: true, data: 1, message: "ok" }); });\n`;
    const r = runFileWithSource('a.ts', src, 'typescript', [apiResponseShape]);
    expect(r.diagnostics).toHaveLength(0);
  });
  it('passes with shorthand success', () => {
    const src = `app.get("/", (req, res) => { res.json({ success, data, message }); });\n`;
    const r = runFileWithSource('a.ts', src, 'typescript', [apiResponseShape]);
    expect(r.diagnostics).toHaveLength(0);
  });
});
