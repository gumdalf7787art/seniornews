import { json, verifyMutationRequest } from '../utils/auth.js';
export async function onRequestPost(context) { if (!verifyMutationRequest(context.request)) return json({ success: false }, 403); return json({ success: true }, 200, { 'Set-Cookie': 'token=; HttpOnly; Secure; Path=/; SameSite=Strict; Max-Age=0' }); }
