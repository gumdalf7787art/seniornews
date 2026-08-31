import { signJWT } from './utils/jwt.js';
import { verifyPassword } from './utils/password.js';
import { json, verifyMutationRequest } from './utils/auth.js';

async function digest(value) { const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value)); return Array.from(new Uint8Array(hash), (byte) => byte.toString(16).padStart(2, '0')).join(''); }

export async function onRequestPost(context) {
  if (!verifyMutationRequest(context.request)) return json({ success: false, message: '잘못된 요청입니다.' }, 403);
  const { email, password } = await context.request.json(); const normalizedEmail = String(email || '').trim().toLowerCase();
  const ipHash = await digest(context.request.headers.get('CF-Connecting-IP') || 'local');
  const recent = await context.env.DB.prepare("SELECT COUNT(*) count FROM login_attempts WHERE email=? AND succeeded=0 AND attempted_at > datetime('now','-15 minutes')").bind(normalizedEmail).first();
  if (recent.count >= 5) return json({ success: false, message: '로그인 시도가 많습니다. 15분 뒤 다시 시도해 주세요.' }, 429);
  const user = await context.env.DB.prepare('SELECT * FROM users WHERE email=? AND status=?').bind(normalizedEmail, 'active').first();
  const valid = user && await verifyPassword(password || '', user.password_hash);
  await context.env.DB.prepare('INSERT INTO login_attempts(email,ip_hash,succeeded) VALUES(?,?,?)').bind(normalizedEmail, ipHash, valid ? 1 : 0).run();
  if (!valid) return json({ success: false, message: '이메일 또는 비밀번호를 확인해 주세요.' }, 401);
  const token = await signJWT({ sub: user.id, email: user.email, role: user.role }, context.env.JWT_SECRET);
  return json({ success: true, user: { id: user.id, email: user.email, name: user.name, role: user.role } }, 200, { 'Set-Cookie': `token=${token}; HttpOnly; Secure; Path=/; SameSite=Strict; Max-Age=86400` });
}
