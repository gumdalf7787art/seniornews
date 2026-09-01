import { audit, json, requireUser, verifyMutationRequest } from '../../utils/auth.js';
import { ensureBriefingTable, validateBriefing } from '../../utils/briefings.js';

export async function onRequestPatch(context) {
  if (!verifyMutationRequest(context.request)) return json({ message: '잘못된 요청입니다.' }, 403);
  const auth = await requireUser(context, ['admin']);
  if (auth.error) return auth.error;
  const id = Number(context.params.id);
  if (!Number.isInteger(id)) return json({ message: '잘못된 알림 번호입니다.' }, 400);
  await ensureBriefingTable(context.env);
  const data = await context.request.json().catch(() => ({}));
  const invalid = validateBriefing(data);
  if (invalid) return json({ message: invalid }, 400);
  const result = await context.env.DB.prepare('UPDATE senior_briefings SET category=?,message=?,target_url=?,display_order=?,is_active=?,starts_at=?,ends_at=?,updated_at=CURRENT_TIMESTAMP WHERE id=?').bind(String(data.category).trim(), String(data.message).trim(), String(data.target_url).trim(), Math.max(0, Number(data.display_order) || 0), data.is_active === false ? 0 : 1, data.starts_at || null, data.ends_at || null, id).run();
  if (!result.meta.changes) return json({ message: '알림을 찾을 수 없습니다.' }, 404);
  await audit(context.env, auth.user.id, 'update', 'briefing', id, { message: data.message });
  return json({ success: true });
}

export async function onRequestDelete(context) {
  if (!verifyMutationRequest(context.request)) return json({ message: '잘못된 요청입니다.' }, 403);
  const auth = await requireUser(context, ['admin']);
  if (auth.error) return auth.error;
  const id = Number(context.params.id);
  if (!Number.isInteger(id)) return json({ message: '잘못된 알림 번호입니다.' }, 400);
  await ensureBriefingTable(context.env);
  const briefing = await context.env.DB.prepare('SELECT message FROM senior_briefings WHERE id=?').bind(id).first();
  if (!briefing) return json({ message: '알림을 찾을 수 없습니다.' }, 404);
  await context.env.DB.prepare('DELETE FROM senior_briefings WHERE id=?').bind(id).run();
  await audit(context.env, auth.user.id, 'delete', 'briefing', id, { message: briefing.message });
  return json({ success: true });
}
