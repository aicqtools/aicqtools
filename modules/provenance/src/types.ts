/**
 * AI code provenance types.
 *
 * Aligned with EU AI Act Article 50 (transparency obligations) and
 * CycloneDX AI-BOM spec. Phase 0 freezes the type surface so Phase 1a
 * implementation can populate it.
 */

export type AiTool = 'claude-code' | 'cursor' | 'copilot' | 'chatgpt' | 'unknown';

export interface AiSession {
  readonly sessionId: string;
  readonly tool: AiTool;
  readonly model: string;
  readonly modelVersion?: string;
  readonly startedAt: string;
  readonly endedAt?: string;
}

export interface AiPromptRecord {
  readonly sessionId: string;
  readonly index: number;
  readonly prompt: string;
  readonly response?: string;
  readonly timestamp: string;
}

export interface CodeAttribution {
  readonly filePath: string;
  readonly startLine: number;
  readonly endLine: number;
  readonly sessionId: string;
  readonly promptIndex?: number;
  readonly humanEdited: boolean;
}

export interface ProvenanceRecord {
  readonly version: '0.1';
  readonly sessions: readonly AiSession[];
  readonly prompts: readonly AiPromptRecord[];
  readonly attributions: readonly CodeAttribution[];
  readonly capturedAt: string;
}
