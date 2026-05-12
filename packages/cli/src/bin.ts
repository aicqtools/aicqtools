#!/usr/bin/env node
import { buildProgram } from './index.js';

buildProgram().parseAsync(process.argv).catch((err: unknown) => {
  if (err instanceof Error && 'filePath' in err && typeof (err as { filePath: unknown }).filePath === 'string') {
    const e = err as Error & { filePath: string };
    process.stderr.write(`aicq: parser failed on ${e.filePath}: ${e.message}\n`);
  } else {
    process.stderr.write(`aicq: ${err instanceof Error ? err.message : String(err)}\n`);
  }
  process.exit(2);
});
