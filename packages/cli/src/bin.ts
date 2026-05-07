#!/usr/bin/env node
import { buildProgram } from './index.js';

buildProgram().parseAsync(process.argv).catch((err: unknown) => {
  process.stderr.write(`aicq: ${err instanceof Error ? err.message : String(err)}\n`);
  process.exit(2);
});
