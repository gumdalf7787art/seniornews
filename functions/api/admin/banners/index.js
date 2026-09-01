import { audit, json, requireUser, verifyMutationRequest } from '../../utils/auth.js';
import { ensureBannerTable, validateBanner } from '../../utils/banners.js';

export async function onRequestGet(context) {
  const auth = await requireUser(context, ['admin']);
  if (auth.error) return auth.error;
  await ensureBannerTable(context.env);
  const result = await context.env.DB.prepare('SELECT * FROM banners ORDER BY display_order ASC,id DESC').all();
  return json({ banners: result.results || [] });
}

export async function onRequestPost(context) {
  if (!verifyMutationRequest(context.request)) return json({ message: '잘못된 요청입니다.' }, 403);
  const auth = await requireUser(context, ['admin']);
  if (auth.error) return auth.error;
  await ensureBannerTable(context.env);
  const data = await context.request.json().catch(() => ({}));
  const invalid = validateBanner(data);
  if (invalid) return json({ message: invalid }, 400);
  const order = Math.max(0, Number(data.display_order) || 0);
  const active = data.is_active === false ? 0 : 1;
  const result = await context.env.DB.prepare('INSERT INTO banners(name,image_url,image_alt,target_url,display_order,is_active,starts_at,ends_at) VALUES(?,?,?,?,?,?,?,?)')
    .bind(String(data.name).trim(), String(data.image_url).trim(), String(data.image_alt).trim(), String(data.target_url).trim(), order, active, data.starts_at || null, data.ends_at || null).run();
  await audit(context.env, auth.user.id, 'create', 'banner', result.meta.last_row_id, { name: data.name });
  return json({ success: true, id: result.meta.last_row_id }, 201);
}
