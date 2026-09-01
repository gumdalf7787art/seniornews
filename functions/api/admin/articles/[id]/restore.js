import { audit, json, requireUser, verifyMutationRequest } from '../../../utils/auth.js';

export async function onRequestPost(context) {
  if (!verifyMutationRequest(context.request)) return json({ message: '잘못된 요청입니다.' }, 403);
  const auth = await requireUser(context, ['editor', 'admin']);
  if (auth.error) return auth.error;
  const id = Number(context.params.id);
  if (!Number.isInteger(id)) return json({ message: '잘못된 기사 번호입니다.' }, 400);

  const article = await context.env.DB.prepare('SELECT id,title,author_id,status FROM articles WHERE id=?').bind(id).first();
  if (!article) return json({ message: '기사를 찾을 수 없습니다.' }, 404);
  if (auth.user.role === 'editor' && Number(article.author_id) !== Number(auth.user.id)) return json({ message: '본인이 작성한 기사만 복원할 수 있습니다.' }, 403);
  if (article.status !== 'archived') return json({ message: '보관된 기사만 복원할 수 있습니다.' }, 400);

  await context.env.DB.prepare("UPDATE articles SET status='draft', updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(id).run();
  await audit(context.env, auth.user.id, 'restore', 'article', id, { title: article.title });
  return json({ success: true, status: 'draft' });
}
