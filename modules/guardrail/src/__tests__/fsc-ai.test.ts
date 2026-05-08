/**
 * K2 — 금감원 AI 가이드라인 5개 룰 단위 테스트.
 * 모두 heuristic 기반 — false positive 가능성 명시된 베타 단계.
 */
import { describe, it, expect } from 'vitest';
import { runFileWithSource } from '../runner/run-file.js';
import auditLogAiDecision from '../rules-default/audit-log-ai-decision.js';
import maskPiiInAiPrompt from '../rules-default/mask-pii-in-ai-prompt.js';
import trackAiModelVersion from '../rules-default/track-ai-model-version.js';
import humanOversightCheckpoint from '../rules-default/human-oversight-checkpoint.js';
import aiExplainabilityMetadata from '../rules-default/ai-explainability-metadata.js';

describe('audit-log-ai-decision', () => {
  it('flags an AI call without any logger invocation', () => {
    const src = `async function decide(input: string) {
  const result = await openai.chat.completions.create({ model: 'gpt-4', messages: [{ role: 'user', content: input }] });
  return result;
}\n`;
    const r = runFileWithSource('a.ts', src, 'typescript', [auditLogAiDecision]);
    expect(r.diagnostics.length).toBeGreaterThan(0);
  });
  it('passes when logger.info is called in the same function', () => {
    const src = `async function decide(input: string) {
  const result = await openai.chat.completions.create({ model: 'gpt-4', messages: [] });
  logger.info('ai-decision', { result });
  return result;
}\n`;
    const r = runFileWithSource('a.ts', src, 'typescript', [auditLogAiDecision]);
    expect(r.diagnostics).toHaveLength(0);
  });
});

describe('mask-pii-in-ai-prompt', () => {
  it('flags Korean RRN in AI prompt argument', () => {
    const src = `await openai.chat.completions.create({ messages: [{ role: 'user', content: '주민번호 900101-1234567' }] });\n`;
    const r = runFileWithSource('a.ts', src, 'typescript', [maskPiiInAiPrompt]);
    expect(r.diagnostics.length).toBeGreaterThan(0);
  });
  it('flags 16-digit card number in AI prompt', () => {
    const src = `await anthropic.messages.create({ messages: [{ role: 'user', content: '카드번호: 4111111111111111' }] });\n`;
    const r = runFileWithSource('a.ts', src, 'typescript', [maskPiiInAiPrompt]);
    expect(r.diagnostics.length).toBeGreaterThan(0);
  });
  it('passes when no PII patterns are present', () => {
    const src = `await openai.chat.completions.create({ messages: [{ role: 'user', content: 'hello world' }] });\n`;
    const r = runFileWithSource('a.ts', src, 'typescript', [maskPiiInAiPrompt]);
    expect(r.diagnostics).toHaveLength(0);
  });
});

describe('track-ai-model-version', () => {
  it('flags AI call without explicit model parameter', () => {
    const src = `await openai.chat.completions.create({ messages: [] });\n`;
    const r = runFileWithSource('a.ts', src, 'typescript', [trackAiModelVersion]);
    expect(r.diagnostics).toHaveLength(1);
  });
  it('passes when model is specified', () => {
    const src = `await openai.chat.completions.create({ model: 'gpt-4', messages: [] });\n`;
    const r = runFileWithSource('a.ts', src, 'typescript', [trackAiModelVersion]);
    expect(r.diagnostics).toHaveLength(0);
  });
});

describe('human-oversight-checkpoint', () => {
  it('flags AI result persisted to DB without review marker', () => {
    const src = `async function autoApprove() {
  const decision = await openai.chat.completions.create({ model: 'gpt-4', messages: [] });
  await prisma.decisions.create({ data: { value: decision } });
  logger.info('ai', { decision });
}\n`;
    const r = runFileWithSource('a.ts', src, 'typescript', [humanOversightCheckpoint]);
    expect(r.diagnostics.length).toBeGreaterThan(0);
  });
  it('passes when a review marker is present', () => {
    const src = `async function maybeStore() {
  const decision = await openai.chat.completions.create({ model: 'gpt-4', messages: [] });
  if (await requiresApproval(decision)) {
    await prisma.decisions.create({ data: { value: decision, status: 'pending_review' } });
  }
}\n`;
    const r = runFileWithSource('a.ts', src, 'typescript', [humanOversightCheckpoint]);
    expect(r.diagnostics).toHaveLength(0);
  });
});

describe('ai-explainability-metadata', () => {
  it('flags res.json with aiResult and no explainability keys', () => {
    const src = `res.json({ aiResult: 'yes', confidence: 0.9 });\n`;
    const r = runFileWithSource('a.ts', src, 'typescript', [aiExplainabilityMetadata]);
    expect(r.diagnostics).toHaveLength(1);
  });
  it('passes when reasoning + sources are included', () => {
    const src = `res.json({ aiResult: 'yes', reasoning: 'because X', sources: [], model: 'gpt-4' });\n`;
    const r = runFileWithSource('a.ts', src, 'typescript', [aiExplainabilityMetadata]);
    expect(r.diagnostics).toHaveLength(0);
  });
  it('passes when payload is not AI-related', () => {
    const src = `res.json({ user: { id: 1, name: 'A' } });\n`;
    const r = runFileWithSource('a.ts', src, 'typescript', [aiExplainabilityMetadata]);
    expect(r.diagnostics).toHaveLength(0);
  });
});
