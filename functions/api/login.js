import { signJWT } from './utils/jwt.js';
import { verifyPassword } from './utils/password.js';
import { json, verifyMutationRequest } from './utils/auth.js';

async function digest(value) { const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value)); return Array.from(new Uint8Array(hash), (byte) => byte.toString(16).padStart(2, '0')).join(''); }

export async function onRequestPost(context) {
  try {
    if (!verifyMutationRequest(context.request)) return json({ success: false, message: '잘못된 요청입니다.' }, 403);
    const { email, password } = await context.request.json(); const normalizedEmail = String(email || '').trim().toLowerCase();
    if (!normalizedEmail || !password) return json({ success: false, message: '이메일과 비밀번호를 입력해 주세요.' }, 400);
    if (!context.env.DB) return json({ success: false, message: '로그인 서버 설정을 확인하는 중입니다. 잠시 후 다시 시도해 주세요.' }, 503);
    let ipHash = '';
    try { ipHash = await digest(context.request.headers.get('CF-Connecting-IP') || 'local'); } catch { ipHash = ''; }
    let recentCount = 0;
    try {
      const recent = await context.env.DB.prepare("SELECT COUNT(*) AS failed_count FROM login_attempts WHERE email=? AND succeeded=0 AND attempted_at > datetime('now','-15 minutes')").bind(normalizedEmail).first();
      recentCount = Number(recent?.failed_count || 0);
    } catch { recentCount = 0; }
    if (recentCount >= 5) return json({ success: false, message: '로그인 시도가 많습니다. 15분 뒤 다시 시도해 주세요.' }, 429);
    const user = await context.env.DB.prepare('SELECT * FROM users WHERE email=? AND status=?').bind(normalizedEmail, 'active').first();
    let valid = false;
    try { valid = Boolean(user && await verifyPassword(password, user.password_hash)); } catch { valid = false; }
    try { await context.env.DB.prepare('INSERT INTO login_attempts(email,ip_hash,succeeded) VALUES(?,?,?)').bind(normalizedEmail, ipHash, valid ? 1 : 0).run(); } catch { /* 로그인 기록 장애가 인증을 막지 않도록 합니다. */ }
    if (!valid) return json({ success: false, message: '이메일 또는 비밀번호를 확인해 주세요.' }, 401);
    if (!context.env.JWT_SECRET) return json({ success: false, message: '로그인 세션 설정이 누락되었습니다. 관리자에게 알려 주세요.' }, 503);
    const token = await signJWT({ sub: user.id, email: user.email, role: user.role }, context.env.JWT_SECRET);
    return json({ success: true, user: { id: user.id, email: user.email, name: user.name, role: user.role } }, 200, { 'Set-Cookie': `token=${token}; HttpOnly; Secure; Path=/; SameSite=Strict; Max-Age=86400` });
  } catch (error) {
    console.error('login_failed', error instanceof Error ? error.message : String(error));
    return json({ success: false, message: '로그인 서버에 일시적인 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.' }, 503);
  }
}

// Runtime secret configuration is managed by Cloudflare Pages.
