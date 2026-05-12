// Fixture for the rule-suggest tests. Intentionally violates several built-in
// rules. Excluded from tsc (tsconfig excludes **/__tests__/**) and never executed —
// only parsed as source text by the suggest engine.
export function run(): void {
  console.log('starting');
  console.log('step 1');
  console.log('step 2');
  console.log('step 3');
  console.log('step 4');
  console.log('done');

  const client = new OpenAI({ apiKey: 'demo' });
  void client;

  if (Math.random() > 0.5) {
    throw 'unexpected';
  }
}
