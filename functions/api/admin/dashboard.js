import { json, requireUser } from '../utils/auth.js';

export async function onRequestGet(context) {
  const auth = await requireUser(context, ['admin']);
  if (auth.error) return auth.error;
  const [articleCounts, memberCounts, reviewArticles, auditLogs] = await Promise.all([
    context.env.DB.prepare("SELECT status, COUNT(*) count FROM articles GROUP BY status").all(),
    context.env.DB.prepare("SELECT role, COUNT(*) count FROM users WHERE status='active' GROUP BY role").all(),
    context.env.DB.prepare("SELECT a.id,a.title,a.slug,a.status,a.updated_at,c.name category_name,u.name author_name FROM articles a JOIN categories c ON c.id=a.category_id JOIN users u ON u.id=a.author_id WHERE a.status='review' ORDER BY a.updated_at ASC LIMIT 8").all(),
    context.env.DB.prepare("SELECT l.action,l.entity_type,l.entity_id,l.details,l.created_at,u.name user_name FROM audit_logs l LEFT JOIN users u ON u.id=l.user_id ORDER BY l.created_at DESC LIMIT 8").all(),
  ]);
  return json({
    articleCounts: articleCounts.results,
    memberCounts: memberCounts.results,
    reviewArticles: reviewArticles.results,
    auditLogs: auditLogs.results,
  });
}
