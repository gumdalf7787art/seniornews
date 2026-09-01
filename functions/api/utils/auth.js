import { verifyJWT } from './jwt.js';

export function json(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', ...extraHeaders } });
}

export function getCookie(request, name) {
  const cookie = request.headers.get('Cookie') || '';
  const item = cookie.split(';').map((part) => part.trim()).find((part) => part.startsWith(`${name}=`));
  return item ? decodeURIComponent(item.slice(name.length + 1)) : null;
}

export async function currentUser(context) {
  const token = getCookie(context.request, 'token');
  if (!token || !context.env.JWT_SECRET) return null;
  const payload = await verifyJWT(token, context.env.JWT_SECRET);
  if (!payload) return null;
  return context.env.DB.prepare('SELECT id, email, name, role, status, provider, password_hash FROM users WHERE id = ? AND status = ?').bind(payload.sub, 'active').first();
}

export async function requireUser(context, roles = []) {
  const user = await currentUser(context);
  if (!user) return { error: json({ success: false, message: '로그인이 필요합니다.' }, 401) };
  if (roles.length && !roles.includes(user.role)) return { error: json({ success: false, message: '이 작업을 수행할 권한이 없습니다.' }, 403) };
  return { user };
}

export function verifyMutationRequest(request) {
  const sameOriginSignal = request.headers.get('X-Requested-With') === 'SeniorNews';
  const origin = request.headers.get('Origin');
  const expected = new URL(request.url).origin;
  return sameOriginSignal && (!origin || origin === expected);
}

export async function audit(env, userId, action, entityType, entityId, details = null) {
  await env.DB.prepare('INSERT INTO audit_logs(user_id, action, entity_type, entity_id, details) VALUES(?,?,?,?,?)').bind(userId, action, entityType, String(entityId || ''), details ? JSON.stringify(details) : null).run();
}
