export type {
  AiTool,
  AiSession,
  AiPromptRecord,
  CodeAttribution,
  ProvenanceRecord,
} from './types.js';
export { emitAiBom } from './ai-bom/index.js';
export {
  capture,
  getStagedFiles,
  getStagedHunks,
  getCurrentCommitSha,
  readActiveSessions,
  findClosestSession,
  writeProvenanceRecord,
  buildRecord,
} from './git-hook/index.js';
export type {
  CaptureContext,
  CaptureResult,
  StagedHunk,
} from './git-hook/index.js';
export { buildArticle50Report } from './reporter/index.js';
export type { Article50Report } from './reporter/index.js';
