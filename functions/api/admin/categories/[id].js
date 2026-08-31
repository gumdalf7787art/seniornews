import { audit, json, requireUser, verifyMutationRequest } from '../../utils/auth.js';

export async function onRequestPatch(context) {
  if (!verifyMutationRequest(context.request)) return json({ message: '잘못된 요청입니다.' }, 403);
  const auth = await requireUser(context, ['admin']);
  if (auth.error) return auth.error;
  const id = Number(context.params.id);
  const data = await context.request.json();
  if (!Number.isInteger(id) || !Number.isInteger(Number(data.display_order)) || ![0, 1, true, false].includes(data.is_active)) return json({ message: '카테고리 설정 값이 올바르지 않습니다.' }, 400);
  const category = await context.env.DB.prepare('SELECT id,name FROM categories WHERE id=?').bind(id).first();
  if (!category) return json({ message: '카테고리를 찾을 수 없습니다.' }, 404);
  await context.env.DB.prepare('UPDATE categories SET display_order=?,is_active=? WHERE id=?').bind(Number(data.display_order), data.is_active ? 1 : 0, id).run();
  await audit(context.env, auth.user.id, 'update_category', 'category', id, { display_order: Number(data.display_order), is_active: Boolean(data.is_active) });
  return json({ success: true });
}
