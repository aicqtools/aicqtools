import { readFile, readdir } from 'node:fs/promises';
import { dirname, extname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import type { Rule } from '@aicqtools/rule-sdk';
import { parseYamlRule } from '../matcher/yaml-rule.js';
// Phase 0 (TalkUp 사례 + 기본)
import noConsoleLog from './no-console-log.js';
import noIdOverwrite from './no-id-overwrite.js';
import routeNeedsRateLimit from './route-needs-rate-limit.js';
import controllerNeedsAsyncWrapper from './controller-needs-async-wrapper.js';
import fkNeedsOnDelete from './fk-needs-on-delete.js';
import apiResponseShape from './api-response-shape.js';

// S3.A — TS 글로벌 추가 (function-style)
import noBareThrow from './no-bare-throw.js';
import noEmptyCatch from './no-empty-catch.js';
import noProcessEnvLeak from './no-process-env-leak.js';
import routeNeedsAuth from './route-needs-auth.js';
import noMagicNumber from './no-magic-number.js';
import noDefaultExportFromLibs from './no-default-export-from-libs.js';
import preferConstArray from './prefer-const-array.js';
import noBooleanTrap from './no-boolean-trap.js';
import preferNamedImports from './prefer-named-imports.js';
import noJsonbCircular from './no-jsonb-circular.js';

// S3.B — Python 글로벌 (function-style; YAML은 자동 로드됨)
import requestsNeedsTimeout from './requests-needs-timeout.js';
import noShellTrue from './no-shell-true.js';
import noFstringSql from './no-fstring-sql.js';
import noMutableDefaultArg from './no-mutable-default-arg.js';
import noBareExcept from './no-bare-except.js';
import typeHintRequiredPublic from './type-hint-required-public.js';
import asyncAwaitConsistency from './async-await-consistency.js';
import pytestFixtureNaming from './pytest-fixture-naming.js';

// K1 — 한국 IT 컨벤션 (Phase 1a 베타)
import camelcaseMigrationColumn from './camelcase-migration-column.js';
import enforceUtf8Encoding from './enforce-utf8-encoding.js';
import explicitKstTimezone from './explicit-kst-timezone.js';
import wonFormatThousands from './won-format-thousands.js';
import rfc5987KoreanFilename from './rfc5987-korean-filename.js';
import naverKakaoOauthWebview from './naver-kakao-oauth-webview.js';
import koreanCommentEncoding from './korean-comment-encoding.js';

// K2 — 한국 도메인 컴플라이언스 (Phase 1b 베타)
// 금감원 AI 가이드라인 (5)
import auditLogAiDecision from './audit-log-ai-decision.js';
import maskPiiInAiPrompt from './mask-pii-in-ai-prompt.js';
import trackAiModelVersion from './track-ai-model-version.js';
import humanOversightCheckpoint from './human-oversight-checkpoint.js';
import aiExplainabilityMetadata from './ai-explainability-metadata.js';
// PCI DSS (8)
import noPlainCardNumber from './no-plain-card-number.js';
import noCvvLogging from './no-cvv-logging.js';
import requireTls12Plus from './require-tls-1-2-plus.js';
import verifyPgResponse from './verify-pg-response.js';
import requireIdempotencyKey from './require-idempotency-key.js';
import separateRefundPermission from './separate-refund-permission.js';
import preserveTransactionLog from './preserve-transaction-log.js';
import maskCardNumber from './mask-card-number.js';

export const builtinFunctionRules: readonly Rule[] = [
  // Phase 0
  noConsoleLog,
  noIdOverwrite,
  routeNeedsRateLimit,
  controllerNeedsAsyncWrapper,
  fkNeedsOnDelete,
  apiResponseShape,
  // S3.A TS 글로벌
  noBareThrow,
  noEmptyCatch,
  noProcessEnvLeak,
  routeNeedsAuth,
  noMagicNumber,
  noDefaultExportFromLibs,
  preferConstArray,
  noBooleanTrap,
  preferNamedImports,
  noJsonbCircular,
  // S3.B Python 글로벌
  requestsNeedsTimeout,
  noShellTrue,
  noFstringSql,
  noMutableDefaultArg,
  noBareExcept,
  typeHintRequiredPublic,
  asyncAwaitConsistency,
  pytestFixtureNaming,
  // K1 한국 IT 컨벤션
  camelcaseMigrationColumn,
  enforceUtf8Encoding,
  explicitKstTimezone,
  wonFormatThousands,
  rfc5987KoreanFilename,
  naverKakaoOauthWebview,
  koreanCommentEncoding,
  // K2 금감원 AI 가이드라인
  auditLogAiDecision,
  maskPiiInAiPrompt,
  trackAiModelVersion,
  humanOversightCheckpoint,
  aiExplainabilityMetadata,
  // K2 PCI DSS
  noPlainCardNumber,
  noCvvLogging,
  requireTls12Plus,
  verifyPgResponse,
  requireIdempotencyKey,
  separateRefundPermission,
  preserveTransactionLog,
  maskCardNumber,
];

export async function loadBuiltinYamlRules(): Promise<Rule[]> {
  const dir = dirname(fileURLToPath(import.meta.url));
  const entries = await readdir(dir);
  const rules: Rule[] = [];
  for (const entry of entries) {
    if (extname(entry) === '.yaml' || extname(entry) === '.yml') {
      const content = await readFile(join(dir, entry), 'utf-8');
      rules.push(parseYamlRule(content));
    }
  }
  return rules;
}

export async function loadAllBuiltinRules(): Promise<Rule[]> {
  const yaml = await loadBuiltinYamlRules();
  return [...builtinFunctionRules, ...yaml];
}

export async function loadFunctionRulesFromDir(dir: string): Promise<Rule[]> {
  const absDir = resolve(dir);
  const entries = await readdir(absDir);
  const rules: Rule[] = [];
  for (const entry of entries) {
    if (extname(entry) === '.ts' || extname(entry) === '.js' || extname(entry) === '.mjs') {
      const url = pathToFileURL(join(absDir, entry)).href;
      const mod = (await import(url)) as { default?: Rule };
      if (mod.default) rules.push(mod.default);
    }
  }
  return rules;
}
