import { json } from '../utils/auth.js';
export async function onRequestGet(context) {
  const url = new URL(context.request.url); const category = url.searchParams.get('category'); const q = url.searchParams.get('q'); const cursor = Math.max(0, Number(url.searchParams.get('cursor') || 0)); const limit = Math.min(30, Math.max(1, Number(url.searchParams.get('limit') || 12)));
  const clauses = ["a.status='published'", 'a.published_at <= CURRENT_TIMESTAMP']; const values = [];
  if (category) { clauses.push('c.slug=?'); values.push(category); }
  if (q) { clauses.push('(a.title LIKE ? OR a.summary LIKE ? OR a.body_text LIKE ?)'); const pattern = `%${q.replace(/[%_]/g, '')}%`; values.push(pattern, pattern, pattern); }
  const sql = `SELECT a.id,a.slug,a.title,a.summary,a.image_url,a.image_alt,a.published_at,a.updated_at,a.is_featured,c.name category_name,c.slug category_slug,u.name author_name,(SELECT COUNT(*) FROM article_views v WHERE v.article_id=a.id) views FROM articles a JOIN categories c ON c.id=a.category_id JOIN users u ON u.id=a.author_id WHERE ${clauses.join(' AND ')} ORDER BY a.published_at DESC,a.id DESC LIMIT ? OFFSET ?`;
  const result = await context.env.DB.prepare(sql).bind(...values, limit + 1, cursor).all(); const rows = result.results; const hasMore = rows.length > limit;
  return json({ articles: rows.slice(0, limit), nextCursor: hasMore ? cursor + limit : null }, 200, { 'Cache-Control': 'public, max-age=60' });
}
