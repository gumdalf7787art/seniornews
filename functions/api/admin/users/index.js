import { json, requireUser } from '../../utils/auth.js';

export async function onRequestGet(context) {
  const auth = await requireUser(context, ['admin']);
  if (auth.error) return auth.error;
  const result = await context.env.DB.prepare("SELECT id,name,email,role,status,provider,created_at FROM users ORDER BY CASE WHEN role='admin' THEN 0 WHEN role='editor' THEN 1 ELSE 2 END, created_at DESC LIMIT 200").all();
  return json({ users: result.results });
}
