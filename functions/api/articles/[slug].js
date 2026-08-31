import { json } from '../utils/auth.js';
export async function onRequestGet(context) {
  const article = await context.env.DB.prepare("SELECT a.*,c.name category_name,c.slug category_slug,u.name author_name,e.name editor_name FROM articles a JOIN categories c ON c.id=a.category_id JOIN users u ON u.id=a.author_id LEFT JOIN users e ON e.id=a.editor_id WHERE a.slug=? AND a.status='published' AND a.published_at<=CURRENT_TIMESTAMP").bind(context.params.slug).first();
  if (!article) return json({ message: '기사를 찾을 수 없습니다.' }, 404);
  context.waitUntil(context.env.DB.prepare('INSERT INTO article_views(article_id,viewer_hash) VALUES(?,?)').bind(article.id, null).run());
  return json({ article }, 200, { 'Cache-Control': 'public, max-age=60' });
}
