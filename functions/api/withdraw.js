import { audit, json, requireUser, verifyMutationRequest } from './utils/auth.js';
export async function onRequestPost(context) {
  if (!verifyMutationRequest(context.request)) return json({ success: false, message: '잘못된 요청입니다.' }, 403);
  const auth = await requireUser(context); if (auth.error) return auth.error;
  await audit(context.env, auth.user.id, 'withdraw', 'user', auth.user.id);
  await context.env.DB.prepare("UPDATE users SET status='withdrawn', email=('withdrawn-' || id || '-' || email), name='탈퇴한 회원', password_hash=NULL, updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(auth.user.id).run();
  return json({ success: true }, 200, { 'Set-Cookie': 'token=; HttpOnly; Secure; Path=/; SameSite=Strict; Max-Age=0' });
}
