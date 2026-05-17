export {
  runFile,
  runFileWithSource,
  runProject,
  runRule,
  applyRuleConfig,
  applyOverridesForFile,
  collectUnknownOverrideIds,
  collectNegationPaths,
  normalizeOverridePath,
} from './runner/index.js';
export type {
  RunFileResult,
  RunProjectOptions,
  ApplyRuleConfigResult,
  UnknownOverrideId,
  NegationOverridePath,
} from './runner/index.js';

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

export { analyzeRepo, minePatterns, buildConfigSnippet, formatSuggestText, formatSuggestYaml } from './suggest/index.js';
export type {
  AnalyzeRepoOptions,
  DependencySource,
  DetectedDependency,
  MinePatternsOptions,
  PatternRuleDraft,
  RuleSuggestion,
  RuleSuggestionReport,
  SuggestSampleLocation,
} from './suggest/index.js';
export type {
  BuildMcpServerOptions,
  CheckSnippetInput,
  CheckSnippetResult,
  ListRulesResult,
} from './mcp/index.js';
