import { audit, json, requireUser, verifyMutationRequest } from '../../../utils/auth.js';

export async function onRequestPatch(context) {
  if (!verifyMutationRequest(context.request)) return json({ message: '잘못된 요청입니다.' }, 403);
  const auth = await requireUser(context, ['editor', 'admin']);
  if (auth.error) return auth.error;
  const id = Number(context.params.id);
  if (!Number.isInteger(id)) return json({ message: '잘못된 기사 번호입니다.' }, 400);
  const data = await context.request.json();
  if (!data.title?.trim() || !/^[a-z0-9-]{3,}$/.test(data.slug || '') || !data.summary?.trim() || !data.body_text?.trim()) return json({ message: '제목, 영문 주소, 요약, 본문을 확인해 주세요.' }, 400);
  const current = await context.env.DB.prepare('SELECT id,author_id,status FROM articles WHERE id=?').bind(id).first();
  if (!current) return json({ message: '기사를 찾을 수 없습니다.' }, 404);
  if (auth.user.role === 'editor' && Number(current.author_id) !== Number(auth.user.id)) return json({ message: '본인이 작성한 기사만 수정할 수 있습니다.' }, 403);
  if (current.status === 'published' && auth.user.role !== 'admin') return json({ message: '발행된 기사는 제작자만 수정할 수 있습니다.' }, 403);
  const category = await context.env.DB.prepare('SELECT id FROM categories WHERE slug=? AND is_active=1').bind(data.category).first();
  if (!category) return json({ message: '카테고리를 확인해 주세요.' }, 400);
  const nextStatus = current.status === 'published' && auth.user.role === 'admin' ? 'published' : (data.status === 'review' ? 'review' : 'draft');
  try {
    await context.env.DB.prepare("UPDATE articles SET category_id=?,title=?,slug=?,summary=?,body_json=?,body_text=?,image_url=?,image_alt=?,source_text=?,status=?,updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(category.id, data.title.trim(), data.slug, data.summary.trim(), data.body_json || '{}', data.body_text.trim(), data.image_url || null, data.image_alt || null, data.source_text || null, nextStatus, id).run();
    await audit(context.env, auth.user.id, nextStatus === 'review' ? 'resubmit_review' : 'update', 'article', id, { title: data.title });
    return json({ success: true, status: nextStatus });
  } catch (error) {
    return json({ message: String(error.message).includes('UNIQUE') ? '이미 사용 중인 기사 주소입니다.' : '기사를 수정하지 못했습니다.' }, String(error.message).includes('UNIQUE') ? 409 : 500);
  }
}
