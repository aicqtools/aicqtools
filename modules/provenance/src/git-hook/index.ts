export { capture } from './capture.js';
export type { CaptureContext, CaptureResult } from './capture.js';
export { getStagedFiles, getStagedHunks, getCurrentCommitSha } from './git.js';
export type { StagedHunk } from './git.js';
export { readActiveSessions, findClosestSession } from './session-source.js';
export { writeProvenanceRecord, buildRecord } from './persist.js';
