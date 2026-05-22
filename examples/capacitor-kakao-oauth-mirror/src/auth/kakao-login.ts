/**
 * Capacitor + 카카오/네이버 OAuth — `naver-kakao-oauth-webview` 룰 시연.
 *
 * Capacitor의 `Browser.open()`은 Android에서 Chrome Custom Tab을 외부로 띄우는데,
 * 카카오/네이버 OAuth 콜백이 in-app 세션으로 정확히 복귀하지 않는 경우가 잦다.
 * 한국 핀테크 앱(소상장)에서 반복 관찰된 안티패턴 — WebView 내 web flow로
 * 대체하면 콜백 연속성이 보장된다.
 *
 * 정상 패턴은 ./kakao-login-good.ts 참조.
 */

import { Browser } from '@capacitor/browser';

const KAKAO_REST_API_KEY = 'YOUR_KAKAO_KEY'; // 실제 값은 env 주입
const NAVER_CLIENT_ID = 'YOUR_NAVER_CLIENT_ID';
const REDIRECT_URI = 'https://app.example.com/oauth/callback';

// naver-kakao-oauth-webview 위반 #1 — 카카오 OAuth URL을 Browser.open()으로
export async function loginWithKakao(): Promise<void> {
  await Browser.open({
    url: `https://kauth.kakao.com/oauth/authorize?client_id=${KAKAO_REST_API_KEY}&redirect_uri=${REDIRECT_URI}&response_type=code`,
  });
}

// naver-kakao-oauth-webview 위반 #2 — 네이버 OAuth URL도 동일 패턴
export async function loginWithNaver(state: string): Promise<void> {
  await Browser.open({
    url: `https://nid.naver.com/oauth2.0/authorize?response_type=code&client_id=${NAVER_CLIENT_ID}&redirect_uri=${REDIRECT_URI}&state=${state}`,
  });
}
