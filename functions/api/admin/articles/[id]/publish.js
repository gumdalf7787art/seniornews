import { publicationTime } from '../../../../../shared/editorial.js';
import { audit, json, requireUser, verifyMutationRequest } from '../../../utils/auth.js';

function articleImagesAreAccessible(article) {
  if (article.image_url && !article.image_alt?.trim()) return false;
  try {
    const blocks = JSON.parse(article.body_json || '{}')?.content || [];
    return !blocks.some((block) => block.type === 'image' && block.attrs?.src && !block.attrs?.alt?.trim());
  } catch {
    return false;
  }
}

export async function onRequestPost(context) {
  if (!verifyMutationRequest(context.request)) return json({ message: '잘못된 요청입니다.' }, 403);
  const auth = await requireUser(context, ['admin']);
  if (auth.error) return auth.error;
  const data = await context.request.json().catch(() => ({}));
  if (data.editorial_approved !== true) return json({ message: '편집국장 승인 확인이 필요합니다.' }, 403);
  let scheduled;
  try { scheduled = publicationTime(data.scheduled_at); } catch (error) { return json({ message: error.message }, 400); }
  const id = Number(context.params.id);
  if (!Number.isInteger(id)) return json({ message: '잘못된 기사 번호입니다.' }, 400);

  const article = await context.env.DB.prepare('SELECT id,author_id,status,updated_at,title,summary,body_text,image_url,image_alt,body_json FROM articles WHERE id=?').bind(id).first();
  if (!article || !['draft', 'review', 'scheduled'].includes(article.status)) return json({ message: '발행할 기사를 찾지 못했습니다.' }, 404);
  if (!data.expected_updated_at || data.expected_updated_at !== article.updated_at) return json({ message: '원고가 변경되었습니다. 다시 열어 검토해 주세요.' }, 409);
  if (auth.user.role === 'editor' && Number(article.author_id) !== Number(auth.user.id)) return json({ message: '본인이 작성한 기사만 직접 발행할 수 있습니다.' }, 403);
  if (!article.title?.trim() || !article.summary?.trim() || !article.body_text?.trim() || !articleImagesAreAccessible(article)) return json({ message: '제목, 요약, 본문과 모든 이미지 설명을 확인한 뒤 발행해 주세요.' }, 400);

  const result = await context.env.DB.prepare("UPDATE articles SET status='published',editor_id=?,scheduled_at=?,published_at=COALESCE(?,CURRENT_TIMESTAMP),updated_at=CURRENT_TIMESTAMP WHERE id=? AND updated_at=? AND status IN ('draft','review','scheduled')").bind(auth.user.id, scheduled, scheduled, id, data.expected_updated_at).run();
  if (result.meta.changes !== 1) return json({ message: '다른 작업이 먼저 처리되었습니다. 목록을 새로고침해 주세요.' }, 409);
  await audit(context.env, auth.user.id, auth.user.role === 'admin' ? 'publish' : 'direct_publish', 'article', id, { title: article.title, editorial_approved: true, scheduled_at: scheduled, reviewed_updated_at: data.expected_updated_at });
  return json({ success: true, status: 'published' });
}
