export {
  runFile,
  runFileWithSource,
  runProject,
  runRule,
} from './runner/index.js';
export type { RunFileResult, RunProjectOptions } from './runner/index.js';

export { traverse, parseYamlRule } from './matcher/index.js';
export type { YamlRuleInput } from './matcher/index.js';

export {
  builtinFunctionRules,
  loadBuiltinYamlRules,
  loadAllBuiltinRules,
  loadFunctionRulesFromDir,
} from './rules-default/index.js';

export {
  buildMcpServer,
  startStdio,
  handleCheckSnippet,
  handleListRules,
  checkSnippetInputSchema,
} from './mcp/index.js';

export {
  renderRules,
  injectIntoMarkdown,
  syncAiRules,
  MARKER_START,
  MARKER_END,
} from './sync/index.js';
export type { RenderOptions, SyncOptions, SyncTarget } from './sync/index.js';

export { renderRuleMarkdown, renderRulesIndex, buildRuleDocs } from './docs/index.js';
export type { BuildDocsOptions, BuildDocsResult } from './docs/index.js';
export type {
  BuildMcpServerOptions,
  CheckSnippetInput,
  CheckSnippetResult,
  ListRulesResult,
} from './mcp/index.js';
