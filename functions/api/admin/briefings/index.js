import { audit, json, requireUser, verifyMutationRequest } from '../../utils/auth.js';
import { ensureBriefingTable, validateBriefing } from '../../utils/briefings.js';

export async function onRequestGet(context) {
  const auth = await requireUser(context, ['admin']);
  if (auth.error) return auth.error;
  await ensureBriefingTable(context.env);
  const result = await context.env.DB.prepare('SELECT * FROM senior_briefings ORDER BY display_order ASC,id DESC').all();
  return json({ briefings: result.results || [] });
}

export async function onRequestPost(context) {
  if (!verifyMutationRequest(context.request)) return json({ message: '잘못된 요청입니다.' }, 403);
  const auth = await requireUser(context, ['admin']);
  if (auth.error) return auth.error;
  await ensureBriefingTable(context.env);
  const data = await context.request.json().catch(() => ({}));
  const invalid = validateBriefing(data);
  if (invalid) return json({ message: invalid }, 400);
  const result = await context.env.DB.prepare('INSERT INTO senior_briefings(category,message,target_url,display_order,is_active,starts_at,ends_at) VALUES(?,?,?,?,?,?,?)').bind(String(data.category).trim(), String(data.message).trim(), String(data.target_url).trim(), Math.max(0, Number(data.display_order) || 0), data.is_active === false ? 0 : 1, data.starts_at || null, data.ends_at || null).run();
  await audit(context.env, auth.user.id, 'create', 'briefing', result.meta.last_row_id, { message: data.message });
  return json({ success: true, id: result.meta.last_row_id }, 201);
}
