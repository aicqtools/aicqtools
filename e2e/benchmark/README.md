# Benchmark — 1만 줄 코드베이스 (Phase 0 검증)

## 목표

- Cold (캐시 미사용) 1만 줄 검사 ≤ 5,000 ms
- Warm (sqlite 캐시 hit) 1만 줄 검사 ≤ 1,000 ms

## 실행

```bash
node e2e/benchmark/generate.mjs   # 100 files × 100 lines = ~10k LOC
node e2e/benchmark/run.mjs        # cold + warm 측정
```

## 결과 (2026-05-07 기준, Windows 11 / Node 22.20.0)

| 지표 | 값 | 목표 | 결과 |
|------|-----|------|------|
| 파일 수 | 100 | — | — |
| 라인 수 | 9,900 | 10,000 | OK |
| 검출된 위반 | 14 | — | — |
| **Cold** | **1,393 ms** | ≤ 5,000 | ✅ PASS (28% 사용) |
| **Warm** | **6 ms** | ≤ 1,000 | ✅ PASS (0.6% 사용) |
| Speedup | 232× | — | — |

빌트인 룰 8개 모두 적용. 위반 패턴은 합성 코드의 10% 파일(`console.log`)과 4% 파일(`new OpenAI(...)`)에 의도적 삽입.

## 메모

- 합성 코드는 단조로워 실제 코드보다 파싱 친화적. 실제 1만 줄 (TalkUp) 측정은 Phase 1a에서 수행.
- warm run의 6ms는 사실상 sqlite 조회 + 결과 합산 시간만. tree-sitter 재파싱 없음.
- 캐시 invalidation은 `mtime + size + ruleset hash` 기반 (`packages/core/src/cache/sqlite.ts`).
