import { json } from '../utils/auth.js';

export async function onRequestGet(context) {
  const url = new URL(context.request.url); const provider = url.searchParams.get('provider'); const state = crypto.randomUUID(); const origin = url.origin;
  const configs = {
    kakao: {
      clientId: context.env.KAKAO_CLIENT_ID,
      redirect: `${origin}/auth/kakao/callback`,
      auth: 'https://kauth.kakao.com/oauth/authorize',
      params: { response_type: 'code', scope: 'profile_nickname profile_image account_email' },
    },
    naver: { clientId: context.env.NAVER_CLIENT_ID, redirect: `${origin}/auth/naver/callback`, auth: 'https://nid.naver.com/oauth2.0/authorize', params: { response_type: 'code' } },
    google: { clientId: context.env.GOOGLE_CLIENT_ID, redirect: `${origin}/auth/google/callback`, auth: 'https://accounts.google.com/o/oauth2/v2/auth', params: { response_type: 'code', scope: 'email profile' } },
  };
  const config = configs[provider]; if (!config?.clientId) return json({ message: '소셜 로그인 설정이 완료되지 않았습니다.' }, 503);
  const authorization = new URL(config.auth); authorization.search = new URLSearchParams({ client_id: config.clientId, redirect_uri: config.redirect, state, ...config.params }).toString();
  return json({ authorizationUrl: authorization.toString() }, 200, { 'Set-Cookie': `oauth_state=${encodeURIComponent(`${provider}:${state}`)}; HttpOnly; Secure; Path=/api/auth; SameSite=Lax; Max-Age=600` });
}
