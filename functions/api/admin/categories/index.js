import { audit, json, requireUser, verifyMutationRequest } from '../../utils/auth.js';

export async function onRequestGet(context) {
  const auth = await requireUser(context, ['admin']);
  if (auth.error) return auth.error;
  const result = await context.env.DB.prepare('SELECT id,name,slug,display_order,is_active,created_at FROM categories ORDER BY display_order,name').all();
  return json({ categories: result.results });
}

export async function onRequestPost(context) {
  if (!verifyMutationRequest(context.request)) return json({ message: '잘못된 요청입니다.' }, 403);
  const auth = await requireUser(context, ['admin']);
  if (auth.error) return auth.error;
  const data = await context.request.json();
  const name = String(data.name || '').trim();
  const slug = String(data.slug || '').trim();
  if (!name || !/^[a-z0-9-]{2,40}$/.test(slug)) return json({ message: '카테고리 이름과 영문 주소를 확인해 주세요.' }, 400);
  try {
    const result = await context.env.DB.prepare('INSERT INTO categories(name,slug,display_order,is_active) VALUES(?,?,COALESCE((SELECT MAX(display_order)+1 FROM categories),1),1)').bind(name, slug).run();
    await audit(context.env, auth.user.id, 'create_category', 'category', result.meta.last_row_id, { name, slug });
    return json({ success: true, id: result.meta.last_row_id }, 201);
  } catch (error) {
    return json({ message: String(error.message).includes('UNIQUE') ? '이미 사용 중인 카테고리 주소입니다.' : '카테고리를 추가하지 못했습니다.' }, String(error.message).includes('UNIQUE') ? 409 : 500);
  }
}
