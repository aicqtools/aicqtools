/**
 * K1 — 한국 IT 컨벤션 7개 룰 단위 테스트.
 * PoC 정밀도 — false positive 가능성 명시된 룰 포함.
 */
import { describe, it, expect } from 'vitest';
import { runFileWithSource } from '../runner/run-file.js';
import camelcaseMigrationColumn from '../rules-default/camelcase-migration-column.js';
import enforceUtf8Encoding from '../rules-default/enforce-utf8-encoding.js';
import explicitKstTimezone from '../rules-default/explicit-kst-timezone.js';
import wonFormatThousands from '../rules-default/won-format-thousands.js';
import rfc5987KoreanFilename from '../rules-default/rfc5987-korean-filename.js';
import naverKakaoOauthWebview from '../rules-default/naver-kakao-oauth-webview.js';
import koreanCommentEncoding from '../rules-default/korean-comment-encoding.js';

describe('camelcase-migration-column', () => {
  it('flags snake_case key in queryInterface.createTable', () => {
    const src = `await queryInterface.createTable('users', { user_name: { type: 'STRING' } });\n`;
    const r = runFileWithSource('migrations/001.ts', src, 'typescript', [camelcaseMigrationColumn]);
    expect(r.diagnostics.length).toBeGreaterThan(0);
  });
  it('passes for camelCase keys', () => {
    const src = `await queryInterface.createTable('users', { userName: { type: 'STRING' } });\n`;
    const r = runFileWithSource('migrations/001.ts', src, 'typescript', [camelcaseMigrationColumn]);
    expect(r.diagnostics).toHaveLength(0);
  });
});

describe('enforce-utf8-encoding', () => {
  it('flags source containing replacement char', () => {
    const src = `const x = "�� bad";\n`;
    const r = runFileWithSource('a.ts', src, 'typescript', [enforceUtf8Encoding]);
    expect(r.diagnostics.length).toBeGreaterThan(0);
  });
  it('passes for clean UTF-8 Korean', () => {
    const src = `const x = "안녕하세요";\n`;
    const r = runFileWithSource('a.ts', src, 'typescript', [enforceUtf8Encoding]);
    expect(r.diagnostics).toHaveLength(0);
  });
});

describe('explicit-kst-timezone', () => {
  it('flags toLocaleString without timeZone option', () => {
    const r = runFileWithSource('a.ts', `const s = d.toLocaleString("ko-KR");\n`, 'typescript', [explicitKstTimezone]);
    expect(r.diagnostics).toHaveLength(1);
  });
  it('passes when timeZone option is present', () => {
    const r = runFileWithSource('a.ts', `const s = d.toLocaleString("ko-KR", { timeZone: "Asia/Seoul" });\n`, 'typescript', [explicitKstTimezone]);
    expect(r.diagnostics).toHaveLength(0);
  });
});

describe('won-format-thousands', () => {
  it('flags "5000원" (no comma)', () => {
    const r = runFileWithSource('a.ts', `const label = "5000원";\n`, 'typescript', [wonFormatThousands]);
    expect(r.diagnostics).toHaveLength(1);
  });
  it('passes for "5,000원" (with comma)', () => {
    const r = runFileWithSource('a.ts', `const label = "5,000원";\n`, 'typescript', [wonFormatThousands]);
    expect(r.diagnostics).toHaveLength(0);
  });
  it('passes for short amounts (3 digits)', () => {
    const r = runFileWithSource('a.ts', `const label = "500원";\n`, 'typescript', [wonFormatThousands]);
    expect(r.diagnostics).toHaveLength(0);
  });
});

describe('rfc5987-korean-filename', () => {
  it('flags Content-Disposition with Korean filename without filename*=', () => {
    const src = `res.setHeader("Content-Disposition", 'attachment; filename="보고서.csv"');\n`;
    const r = runFileWithSource('a.ts', src, 'typescript', [rfc5987KoreanFilename]);
    expect(r.diagnostics.length).toBeGreaterThan(0);
  });
  it('passes when filename*= UTF-8 encoded form is used', () => {
    const src = `res.setHeader("Content-Disposition", "attachment; filename*=UTF-8''%EB%B3%B4%EA%B3%A0%EC%84%9C.csv");\n`;
    const r = runFileWithSource('a.ts', src, 'typescript', [rfc5987KoreanFilename]);
    expect(r.diagnostics).toHaveLength(0);
  });
});

describe('naver-kakao-oauth-webview', () => {
  it('flags Browser.open with kakao URL', () => {
    const src = `Browser.open({ url: 'https://kauth.kakao.com/oauth/authorize?...' });\n`;
    const r = runFileWithSource('a.ts', src, 'typescript', [naverKakaoOauthWebview]);
    expect(r.diagnostics).toHaveLength(1);
  });
  it('passes for non-OAuth URL', () => {
    const src = `Browser.open({ url: 'https://example.com' });\n`;
    const r = runFileWithSource('a.ts', src, 'typescript', [naverKakaoOauthWebview]);
    expect(r.diagnostics).toHaveLength(0);
  });
});

describe('korean-comment-encoding', () => {
  it('flags comment with replacement char', () => {
    const src = `// ��� broken\nconst x = 1;\n`;
    const r = runFileWithSource('a.ts', src, 'typescript', [koreanCommentEncoding]);
    expect(r.diagnostics.length).toBeGreaterThan(0);
  });
  it('passes for clean Korean comment', () => {
    const src = `// 한국어 주석입니다\nconst x = 1;\n`;
    const r = runFileWithSource('a.ts', src, 'typescript', [koreanCommentEncoding]);
    expect(r.diagnostics).toHaveLength(0);
  });
});
