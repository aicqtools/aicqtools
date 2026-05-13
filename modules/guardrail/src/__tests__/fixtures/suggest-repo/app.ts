// Fixture for the rule-suggest tests. Intentionally violates several built-in
// rules. Excluded from tsc (tsconfig excludes **/__tests__/**) and never executed —
// only parsed as source text by the suggest engine.
//
// The fixture also exercises `--patterns` (AST pattern mining): `tracker.report(...)`
// is a non-stdlib repeated call shape (so it survives the stdlib blocklist), while
// `console.log(...)` is the canonical stdlib pattern that the blocklist filters out.
const tracker = { report(_msg: string): void { /* noop */ } };

export function run(): void {
  console.log('starting');
  console.log('step 1');
  console.log('step 2');
  console.log('step 3');
  console.log('step 4');
  console.log('done');

  tracker.report('a');
  tracker.report('b');
  tracker.report('c');
  tracker.report('d');
  tracker.report('e');
  tracker.report('f');

  const client = new OpenAI({ apiKey: 'demo' });
  void client;

  if (Math.random() > 0.5) {
    throw 'unexpected';
  }
}
