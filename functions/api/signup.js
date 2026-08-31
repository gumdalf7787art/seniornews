import { signJWT } from './utils/jwt.js';
import { hashPassword } from './utils/password.js';
import { json, verifyMutationRequest } from './utils/auth.js';
import { createToken, sendEmail, tokenHash } from './utils/emailTokens.js';

export async function onRequestPost(context) {
  if (!verifyMutationRequest(context.request)) return json({ success: false, message: '잘못된 요청입니다.' }, 403);
  if (!context.env.DB) return json({ success: false, message: '회원 데이터베이스가 연결되지 않았습니다.' }, 503);
  if (!context.env.JWT_SECRET) return json({ success: false, message: '로그인 보안 설정이 적용되지 않았습니다.' }, 503);
  let stage = 'request';
  try {
    const { email, password, name, agreed } = await context.request.json();
    const normalizedEmail = String(email || '').trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail) || String(name || '').trim().length < 2 || String(password || '').length < 10 || !agreed) return json({ success: false, message: '입력 내용과 약관 동의를 확인해 주세요.' }, 400);
    stage = 'password';
    const passwordHash = await hashPassword(password);
    stage = 'database';
    const result = await context.env.DB.prepare('INSERT INTO users(email,password_hash,name,terms_agreed_at) VALUES(?,?,?,CURRENT_TIMESTAMP)').bind(normalizedEmail, passwordHash, name.trim()).run();
    stage = 'email';
    const emailConfigured = Boolean(context.env.RESEND_API_KEY && context.env.RESEND_FROM_EMAIL);
    if (emailConfigured) {
      const verificationToken=createToken(); await context.env.DB.prepare("INSERT INTO email_tokens(user_id,purpose,token_hash,expires_at) VALUES(?,'verify',?,datetime('now','+24 hours'))").bind(result.meta.last_row_id,await tokenHash(verificationToken)).run();
      const verificationLink=`${new URL(context.request.url).origin}/api/auth/verify?token=${verificationToken}`;
      context.waitUntil(sendEmail(context.env,normalizedEmail,'[시니어 라이프 뉴스] 이메일을 확인해 주세요',`<p><a href="${verificationLink}">이메일 인증하기</a></p>`));
    }
    stage = 'session';
    const token = await signJWT({ sub: result.meta.last_row_id, email: normalizedEmail, role: 'reader' }, context.env.JWT_SECRET);
    return json({ success: true, verificationRequired: emailConfigured, user: { id: result.meta.last_row_id, email: normalizedEmail, name: name.trim(), role: 'reader' } }, 201, { 'Set-Cookie': `token=${token}; HttpOnly; Secure; Path=/; SameSite=Strict; Max-Age=86400` });
  } catch (error) {
    if (String(error.message).includes('UNIQUE')) return json({ success: false, message: '이미 가입된 이메일입니다.' }, 409);
    const errorId = crypto.randomUUID();
    console.error('signup_failed', { errorId, name: error?.name, message: error?.message, stack: error?.stack });
    return json({ success: false, message: `회원가입을 처리하지 못했습니다. 오류단계: ${stage}, 오류번호: ${errorId}` }, 500);
  }
}
