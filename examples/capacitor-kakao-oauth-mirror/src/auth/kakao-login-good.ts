/**
 * 정상 패턴 — Capacitor에서 카카오/네이버 OAuth를 WebView 내부 web flow로 처리.
 *
 * `naver-kakao-oauth-webview` 룰을 통과하는 baseline.
 *
 *   - `Browser.open()` 호출 안 함
 *   - in-app WebView iframe 또는 router 상에서 동일 URL 로드
 *   - 콜백은 같은 WebView 세션 내에서 처리되어 token이 유실되지 않음
 */

declare const router: { push(path: string, query?: Record<string, string>): Promise<void> };

const KAKAO_REST_API_KEY = 'YOUR_KAKAO_KEY';
const NAVER_CLIENT_ID = 'YOUR_NAVER_CLIENT_ID';
const REDIRECT_URI = 'https://app.example.com/oauth/callback';

export async function loginWithKakao(): Promise<void> {
  const url = `https://kauth.kakao.com/oauth/authorize?client_id=${KAKAO_REST_API_KEY}&redirect_uri=${REDIRECT_URI}&response_type=code`;
  await router.push('/oauth/external', { provider: 'kakao', url });
}

export async function loginWithNaver(state: string): Promise<void> {
  const url = `https://nid.naver.com/oauth2.0/authorize?response_type=code&client_id=${NAVER_CLIENT_ID}&redirect_uri=${REDIRECT_URI}&state=${state}`;
  await router.push('/oauth/external', { provider: 'naver', url, state });
}
