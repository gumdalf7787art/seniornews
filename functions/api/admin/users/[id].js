import { audit, json, requireUser, verifyMutationRequest } from '../../utils/auth.js';

const roles = ['reader', 'editor', 'admin'];
const statuses = ['active', 'suspended'];

export async function onRequestPatch(context) {
  if (!verifyMutationRequest(context.request)) return json({ message: '잘못된 요청입니다.' }, 403);
  const auth = await requireUser(context, ['admin']);
  if (auth.error) return auth.error;
  const id = Number(context.params.id);
  if (!Number.isInteger(id)) return json({ message: '잘못된 회원 번호입니다.' }, 400);
  if (id === Number(auth.user.id)) return json({ message: '본인 계정의 권한과 상태는 이 화면에서 변경할 수 없습니다.' }, 400);
  const data = await context.request.json();
  if (!roles.includes(data.role) || !statuses.includes(data.status)) return json({ message: '회원 권한 또는 상태 값이 올바르지 않습니다.' }, 400);
  const target = await context.env.DB.prepare('SELECT id,name,email FROM users WHERE id=?').bind(id).first();
  if (!target) return json({ message: '회원을 찾을 수 없습니다.' }, 404);
  await context.env.DB.prepare('UPDATE users SET role=?,status=?,updated_at=CURRENT_TIMESTAMP WHERE id=?').bind(data.role, data.status, id).run();
  await audit(context.env, auth.user.id, 'update_member', 'user', id, { email: target.email, role: data.role, status: data.status });
  return json({ success: true });
}
