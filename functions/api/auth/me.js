import { currentUser, json } from '../utils/auth.js';
export async function onRequestGet(context) {
  const user = await currentUser(context);
  if (!user) return json({ success: false, message: '로그인이 필요합니다.' }, 401);
  const { id, email, name, role, provider } = user;
  return json({ success: true, user: { id, email, name, role, provider } });
}
