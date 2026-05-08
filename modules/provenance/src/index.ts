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
export {
  buildArticle50Report,
  renderArticle50Html,
  renderArticle50Pdf,
} from './reporter/index.js';
export type {
  Article50Report,
  RenderHtmlOptions,
  RenderPdfOptions,
} from './reporter/index.js';
export {
  ManualSessionReader,
  ClaudeCodeSessionReader,
  CursorSessionReader,
  CompositeSessionReader,
  createReader,
  encodeClaudeProjectId,
  getCursorWorkspaceStorageDir,
} from './session-readers/index.js';
export type {
  SessionReader,
  SessionReaderResult,
  ClaudeCodeReaderOptions,
  CursorReaderOptions,
  ReaderName,
} from './session-readers/index.js';
