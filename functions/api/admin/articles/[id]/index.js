import { audit, json, requireUser, verifyMutationRequest } from '../../../utils/auth.js';

function validateImages(data) {
  if (data.image_url && !data.image_alt?.trim()) return '대표 이미지 설명을 입력해 주세요.';
  try {
    const blocks = JSON.parse(data.body_json || '{}')?.content || [];
    if (blocks.some((block) => block.type === 'image' && block.attrs?.src && !block.attrs?.alt?.trim())) return '본문 이미지마다 이미지 설명을 입력해 주세요.';
  } catch {
    return '본문 데이터 형식을 확인해 주세요.';
  }
  return null;
}

export async function onRequestPatch(context) {
  if (!verifyMutationRequest(context.request)) return json({ message: '잘못된 요청입니다.' }, 403);
  const auth = await requireUser(context, ['editor', 'admin']);
  if (auth.error) return auth.error;
  const id = Number(context.params.id);
  if (!Number.isInteger(id)) return json({ message: '잘못된 기사 번호입니다.' }, 400);
  const data = await context.request.json();
  if (!data.title?.trim() || !/^[a-z0-9-]{3,}$/.test(data.slug || '') || !data.summary?.trim() || !data.body_text?.trim()) return json({ message: '제목, 영문 주소, 요약, 본문을 확인해 주세요.' }, 400);
  const imageError = validateImages(data); if (imageError) return json({ message: imageError }, 400);
  const current = await context.env.DB.prepare('SELECT id,author_id,status FROM articles WHERE id=?').bind(id).first();
  if (!current) return json({ message: '기사를 찾을 수 없습니다.' }, 404);
  if (auth.user.role === 'editor' && Number(current.author_id) !== Number(auth.user.id)) return json({ message: '본인이 작성한 기사만 수정할 수 있습니다.' }, 403);
  const category = await context.env.DB.prepare('SELECT id FROM categories WHERE slug=? AND is_active=1').bind(data.category).first();
  if (!category) return json({ message: '카테고리를 확인해 주세요.' }, 400);
  const nextStatus = current.status === 'published' && auth.user.role === 'admin' ? 'published' : (['review', 'published'].includes(data.status) ? data.status : 'draft');
  try {
    await context.env.DB.prepare("UPDATE articles SET category_id=?,title=?,slug=?,summary=?,body_json=?,body_text=?,image_url=?,image_alt=?,source_text=?,status=?,editor_id=CASE WHEN ?='published' THEN ? ELSE editor_id END,published_at=CASE WHEN ?='published' THEN COALESCE(published_at,CURRENT_TIMESTAMP) ELSE published_at END,updated_at=CURRENT_TIMESTAMP WHERE id=?")
      .bind(category.id, data.title.trim(), data.slug, data.summary.trim(), data.body_json || '{}', data.body_text.trim(), data.image_url || null, data.image_alt || null, data.source_text || null, nextStatus, nextStatus, auth.user.id, nextStatus, id).run();
    const action = nextStatus === 'review' ? 'request_publication' : nextStatus === 'published' ? (auth.user.role === 'admin' ? 'edit_publish' : 'direct_publish') : 'update';
    await audit(context.env, auth.user.id, action, 'article', id, { title: data.title });
    return json({ success: true, status: nextStatus });
  } catch {
    return json({ message: String(error.message).includes('UNIQUE') ? '이미 사용 중인 기사 주소입니다.' : '기사를 수정하지 못했습니다.' }, String(error.message).includes('UNIQUE') ? 409 : 500);
  }
}

export async function onRequestDelete(context) {
  if (!verifyMutationRequest(context.request)) return json({ message: '잘못된 요청입니다.' }, 403);
  const auth = await requireUser(context, ['admin']);
  if (auth.error) return auth.error;
  const id = Number(context.params.id);
  if (!Number.isInteger(id)) return json({ message: '잘못된 기사 번호입니다.' }, 400);

  const article = await context.env.DB.prepare('SELECT id,title FROM articles WHERE id=?').bind(id).first();
  if (!article) return json({ message: '기사를 찾을 수 없습니다.' }, 404);

  try {
    await context.env.DB.batch([
      context.env.DB.prepare('DELETE FROM bookmarks WHERE article_id=?').bind(id),
      context.env.DB.prepare('DELETE FROM article_views WHERE article_id=?').bind(id),
      context.env.DB.prepare('DELETE FROM article_tags WHERE article_id=?').bind(id),
      context.env.DB.prepare('DELETE FROM articles WHERE id=?').bind(id),
    ]);
    await audit(context.env, auth.user.id, 'delete', 'article', id, { title: article.title });
    return json({ success: true });
  } catch (error) {
    return json({ message: '기사를 삭제하지 못했습니다. 잠시 후 다시 시도해 주세요.' }, 500);
  }
}
