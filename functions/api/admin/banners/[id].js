import { audit, json, requireUser, verifyMutationRequest } from '../../utils/auth.js';
import { ensureBannerTable, validateBanner } from '../../utils/banners.js';

export async function onRequestPatch(context) {
  if (!verifyMutationRequest(context.request)) return json({ message: '잘못된 요청입니다.' }, 403);
  const auth = await requireUser(context, ['admin']);
  if (auth.error) return auth.error;
  const id = Number(context.params.id);
  if (!Number.isInteger(id)) return json({ message: '잘못된 배너 번호입니다.' }, 400);
  await ensureBannerTable(context.env);
  const data = await context.request.json().catch(() => ({}));
  const invalid = validateBanner(data);
  if (invalid) return json({ message: invalid }, 400);
  const order = Math.max(0, Number(data.display_order) || 0);
  const active = data.is_active === false ? 0 : 1;
  const result = await context.env.DB.prepare('UPDATE banners SET name=?,image_url=?,image_alt=?,target_url=?,display_order=?,is_active=?,starts_at=?,ends_at=?,updated_at=CURRENT_TIMESTAMP WHERE id=?')
    .bind(String(data.name).trim(), String(data.image_url).trim(), String(data.image_alt).trim(), String(data.target_url).trim(), order, active, data.starts_at || null, data.ends_at || null, id).run();
  if (!result.meta.changes) return json({ message: '배너를 찾을 수 없습니다.' }, 404);
  await audit(context.env, auth.user.id, 'update', 'banner', id, { name: data.name });
  return json({ success: true });
}

export async function onRequestDelete(context) {
  if (!verifyMutationRequest(context.request)) return json({ message: '잘못된 요청입니다.' }, 403);
  const auth = await requireUser(context, ['admin']);
  if (auth.error) return auth.error;
  const id = Number(context.params.id);
  if (!Number.isInteger(id)) return json({ message: '잘못된 배너 번호입니다.' }, 400);
  await ensureBannerTable(context.env);
  const banner = await context.env.DB.prepare('SELECT name FROM banners WHERE id=?').bind(id).first();
  if (!banner) return json({ message: '배너를 찾을 수 없습니다.' }, 404);
  await context.env.DB.prepare('DELETE FROM banners WHERE id=?').bind(id).run();
  await audit(context.env, auth.user.id, 'delete', 'banner', id, { name: banner.name });
  return json({ success: true });
}
