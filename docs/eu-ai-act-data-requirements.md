# EU AI Act 데이터 요구사항 — 출처 추적기 매핑 (2026-05-07 조사)

> 목적: aicq 출처 추적기가 캡처해야 할 필드를 EU AI Act Article 50 / Article 11 + Annex IV 요구사항과 매핑. v1.0 출시 시점에 컴플라이언스 리포트가 EU 시장에서 통할 수준인지 사전 검증.

> 시행일: **2026-08-02** — Article 50 (transparency, AI-generated content marking) 발효. high-risk AI 시스템 전체 적용은 2026-08~2027-08 단계적.

---

## 1. Article 50 — Transparency Obligations (모든 AI 적용)

### 1-1. 본문 5개 항

| 조항 | 요구사항 | aicq 관련성 |
|------|---------|------------|
| **50(1)** | AI 시스템과 상호작용하는 자연인에게 공지 | ✗ 가드레일/출처 추적기는 코드 도구라 일반 적용 |
| **50(2)** | **AI 생성/조작 콘텐츠(text 포함)는 machine-readable 형식으로 마킹** | ★ **핵심** — 코드도 텍스트, 우리 attributions가 곧 마킹 |
| 50(3) | 감정 인식 / 생체 분류 시스템 공지 | ✗ |
| 50(4) | Deepfake (이미지/영상/오디오) 표시 | ✗ |
| 50(5) | 공익(public interest) 텍스트 출판 시 표시 | △ 코드 자체는 적용 안 됨, 다만 high-risk AI 출력 코드는 가능 |

### 1-2. 50(2) 세부 — AI-generated text marking

원문 핵심:
> "Providers of AI systems generating synthetic audio, image, video or **text** content must ensure outputs are marked in a **machine-readable format** and **detectable as artificially generated or manipulated**, with technical solutions that are **effective, interoperable, robust and reliable** as far as technically feasible."

→ **AI가 생성한 코드는 machine-readable한 방식으로 표시되어야 함**. 우리의 `attributions[].sessionId` + `sessions[].tool/model` 가 이 표시 역할.

### 1-3. Code of Practice

- 2025-12-17: 1차 초안
- 2026-03-03: 2차 초안
- **2026-08-02: 발효**

→ aicq v1.0 출시(~2026-08-01)는 시행일 직전. **타이밍 윈도우 그대로 유효**.

---

## 2. Annex IV — Technical Documentation (high-risk AI 한정, Article 11)

high-risk AI 시스템 (Annex III: 채용, 금융, 교육, 법집행 등)을 만드는 회사가 작성해야 하는 9개 섹션 기술문서. **고객사의 AI 시스템이 high-risk면, 그 코드베이스의 출처 추적기가 Annex IV section 2/3 작성 근거가 됨.**

### 9개 섹션과 aicq 매핑

| # | Annex IV 섹션 | 요구 데이터 | aicq ProvenanceRecord 매핑 | 갭(부족) |
|---|--------------|------------|----------------------------|---------|
| 1 | 일반 설명 (purpose, interactions, hardware) | 시스템 메타데이터 | (없음) | 별도 도구 / 사용자 작성 |
| 2 | **개발 / 설계 상세** (design specs, data, testing) | sessions, prompts, attributions | ★ 핵심 매핑 — `prompts`, `attributions[].filePath`, `sessionId` | 모델 카드 URL, 학습데이터 출처 부족 |
| 3 | **모니터링 / 기능 / 통제** (capabilities, limits, accuracy, foreseeable misuse) | 가드레일 위반 + 인간 검토 기록 | △ 부분 — 가드레일 결과는 별도 SARIF로, 출처와 통합 필요 | human-in-the-loop 검토 기록 부족 |
| 4 | 위험 관리 (Article 9) | 위험 평가 표 | (없음) | 별도 도구 |
| 5 | 라이프사이클 변경 | git history + 모델 변경 이력 | △ git commit ↔ attribution 매핑은 가능 | 모델 버전 변경 추적 약함 |
| 6 | 적용 표준 | 표준 목록 | (없음) | 별도 |
| 7 | EU 적합성 선언 | 선언서 | (없음) | 사용자 작성 |
| 8 | 사후 모니터링 (Article 72) | 모니터링 계획 | (없음) | 별도 |
| 9 | (부속) | | | |

→ **aicq의 직접 기여 영역: 섹션 2 (개발/설계) + 섹션 3 일부 (가드레일 모니터링)**.

---

## 3. ProvenanceRecord 갭 분석 — v1.0 추가 필드 후보

현재 `modules/provenance/src/types.ts`의 인터페이스와 비교:

| 현재 필드 | 상태 | 비고 |
|-----------|------|------|
| `AiSession { sessionId, tool, model, modelVersion, startedAt, endedAt }` | ✅ | Annex IV section 2 충분 |
| `AiPromptRecord { sessionId, index, prompt, response, timestamp }` | ✅ | 50(2) machine-readable + Annex IV section 2 |
| `CodeAttribution { filePath, startLine, endLine, sessionId, promptIndex?, humanEdited }` | ✅ | 50(2) marking + Annex IV section 2 |

**v1.0에 추가해야 할 필드** (현재 갭):

```typescript
// AiSession에 추가
interface AiSession {
  // ... 기존
  modelCardUrl?: string;        // Annex IV §2: 모델 카드 (Hugging Face / 공식 문서)
  trainingDataLicense?: string; // Annex IV §2: 학습 데이터 라이선스 요약
  systemPrompt?: string;        // Annex IV §2: 시스템 프롬프트 (있으면)
  toolVersion?: string;         // Annex IV §2: Cursor/Claude Code 버전
}

// CodeAttribution에 추가
interface CodeAttribution {
  // ... 기존
  reviewedBy?: string;          // Annex IV §3: human-in-the-loop reviewer (사람 ID)
  reviewedAt?: string;          // Annex IV §3: 검토 시점
  guardrailViolations?: string[]; // 섹션 3 통합 — 이 hunk에서 잡힌 룰 ID들
}

// ProvenanceRecord에 추가
interface ProvenanceRecord {
  // ... 기존
  systemMetadata?: {            // Annex IV §1: 일반 설명
    repository: string;
    commitSha?: string;
    branch?: string;
    builderId?: string;        // CI / 빌드 시스템 식별
  };
}
```

→ Phase 1a 작업: 위 필드 추가 + Article 50 PDF 렌더러(E3)에서 활용.

---

## 4. 한국 컴플라이언스 매핑 (보너스 — 차별화 축 #6)

### 4-1. 금감원 AI 가이드라인 (2024-12 시행, 금융권 적용)

| 가이드라인 항목 | aicq 매핑 |
|---------------|----------|
| AI 의사결정 로그 보존 | ProvenanceRecord 자체 |
| 개인정보 마스킹 (학습/추론 단계) | systemPrompt 마스킹 옵션 필요 |
| 모델 버전 추적 | `AiSession.modelVersion` ✅ |
| 인간 개입 포인트 명시 | `CodeAttribution.reviewedBy/reviewedAt` (위 추가) |
| 설명가능성 메타데이터 | `prompts[]` ✅ |

→ 5개 중 4개 충족. 개인정보 마스킹만 옵션 기능으로 추가.

### 4-2. PIPA(개인정보보호법) — 텔레메트리 옵트인

EU GDPR 동급. 우리가 캡처하는 prompt 본문은 사용자 PII 포함 가능 → **opt-in 동의 + 로컬 저장 우선**. 클라우드 동기화는 명시적 동의 시에만.

---

## 5. 결론

- **Article 50(2) "machine-readable text marking"** — 우리 출처 추적기가 정확히 이 영역. v1.0 컴플라이언스 OK.
- **Annex IV section 2/3** — high-risk 고객사 시장에서 aicq가 직접 기여. 단, 4개 필드(`modelCardUrl`, `systemPrompt`, `reviewedBy/At`, `systemMetadata`) 추가 필요.
- **시행일 2026-08-02** — aicq v1.0 압축 출시(2026-08-01)로 도착. 타이밍 윈도우 유지.
- **한국 금감원 매핑** — 5개 중 4개 이미 충족, 1개(개인정보 마스킹) 옵션 추가로 한국 차별화 가능.

## Sources

- [Article 50 — Transparency Obligations (EU AI Act)](https://artificialintelligenceact.eu/article/50/)
- [Annex IV — Technical Documentation (EU AI Act)](https://artificialintelligenceact.eu/annex/4/)
- [Article 11 — Technical Documentation Required](https://artificialintelligenceact.eu/article/11/)
- [AI Act Technical Documentation: Annex IV Guide — aiacto.eu](https://www.aiacto.eu/en/blog/documentation-technique-ai-act-article-11-annexe-iv)
- [Code of Practice on AI-Generated Content — EC Digital Strategy](https://digital-strategy.ec.europa.eu/en/policies/code-practice-ai-generated-content)
- [Transparency Obligations for AI-Generated Content — Herbert Smith Freehills](https://www.hsfkramer.com/notes/ip/2026-03/transparency-obligations-for-ai-generated-content-under-the-eu-ai-act-from-principle-to-practice)
