import { currentUser, json } from '../utils/auth.js';
export async function onRequestGet(context) { const user = await currentUser(context); return user ? json({ success: true, user }) : json({ success: false, message: '로그인이 필요합니다.' }, 401); }
