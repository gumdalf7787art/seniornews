import { signJWT } from './jwt.js';
import { getCookie, json, verifyMutationRequest } from './auth.js';

export async function completeOAuth(context, provider) {
  if (!verifyMutationRequest(context.request)) return json({ message: '잘못된 요청입니다.' }, 403);
  try {
    const { code, state, redirectUri } = await context.request.json(); const saved = getCookie(context.request, 'oauth_state');
    if (!code || !state || saved !== `${provider}:${state}`) return json({ message: '로그인 요청이 만료되었거나 올바르지 않습니다.' }, 403);
    const profile = await fetchProfile(context.env, provider, code, redirectUri, state);
    if (!profile.email) return json({ message: '소셜 계정에서 이메일을 확인할 수 없습니다.' }, 400);
    let user = await context.env.DB.prepare('SELECT * FROM users WHERE email=? COLLATE NOCASE').bind(profile.email).first();
    if (!user) { const result = await context.env.DB.prepare('INSERT INTO users(email,name,provider,provider_id,email_verified_at,terms_agreed_at) VALUES(?,?,?,?,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)').bind(profile.email,profile.name,provider,profile.id).run(); user={ id:result.meta.last_row_id,email:profile.email,name:profile.name,role:'reader' }; }
    if (user.status && user.status !== 'active') return json({ message: '사용할 수 없는 계정입니다.' }, 403);
    const token = await signJWT({ sub:user.id,email:user.email,role:user.role },context.env.JWT_SECRET);
    return json({ success:true,user:{ id:user.id,email:user.email,name:user.name,role:user.role } },200,{ 'Set-Cookie': `token=${token}; HttpOnly; Secure; Path=/; SameSite=Strict; Max-Age=86400` });
  } catch { return json({ message: '소셜 로그인을 완료하지 못했습니다.' },500); }
}

async function fetchProfile(env, provider, code, redirectUri, state) {
  if (provider === 'kakao') {
    const token = await postForm('https://kauth.kakao.com/oauth/token',{ grant_type:'authorization_code',client_id:env.KAKAO_CLIENT_ID,client_secret:env.KAKAO_CLIENT_SECRET,redirect_uri:redirectUri,code });
    const response=await fetch('https://kapi.kakao.com/v2/user/me',{headers:{Authorization:`Bearer ${token.access_token}`}}); const data=await response.json(); if(!response.ok)throw new Error(); return {id:String(data.id),email:data.kakao_account?.email,name:data.kakao_account?.profile?.nickname||'카카오 회원'};
  }
  if (provider === 'naver') {
    const token=await postForm('https://nid.naver.com/oauth2.0/token',{grant_type:'authorization_code',client_id:env.NAVER_CLIENT_ID,client_secret:env.NAVER_CLIENT_SECRET,code,state}); const response=await fetch('https://openapi.naver.com/v1/nid/me',{headers:{Authorization:`Bearer ${token.access_token}`}}); const data=await response.json(); if(!response.ok||data.resultcode!=='00')throw new Error(); return {id:String(data.response.id),email:data.response.email,name:data.response.name||data.response.nickname||'네이버 회원'};
  }
  const token=await postForm('https://oauth2.googleapis.com/token',{client_id:env.GOOGLE_CLIENT_ID,client_secret:env.GOOGLE_CLIENT_SECRET,code,grant_type:'authorization_code',redirect_uri:redirectUri}); const response=await fetch('https://www.googleapis.com/oauth2/v2/userinfo',{headers:{Authorization:`Bearer ${token.access_token}`}}); const data=await response.json(); if(!response.ok)throw new Error(); return {id:String(data.id),email:data.email,name:data.name||'구글 회원'};
}
async function postForm(url,params){const response=await fetch(url,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams(params)});const data=await response.json();if(!response.ok||data.error)throw new Error();return data;}
