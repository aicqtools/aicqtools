import { startStdio } from '@aicqtools/guardrail';

export async function runMcpStdio(): Promise<never> {
  await startStdio();
  return new Promise<never>(() => {
    // Block forever; transport reads stdin until EOF.
  });
}
