import { audit, json, requireUser, verifyMutationRequest } from '../utils/auth.js';

export async function onRequestPost(context) {
  if (!verifyMutationRequest(context.request)) return json({ message: '잘못된 요청입니다.' }, 403);
  const auth = await requireUser(context, ['editor', 'admin']);
  if (auth.error) return auth.error;
  const form = await context.request.formData();
  const file = form.get('file');
  const alt = String(form.get('alt') || '').trim();
  if (!file || typeof file.arrayBuffer !== 'function' || !alt) return json({ message: '이미지 파일을 다시 선택해 주세요.' }, 400);
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 10 * 1024 * 1024) return json({ message: 'JPG, PNG, WEBP 이미지만 10MB까지 올릴 수 있습니다.' }, 400);
  if (!context.env.BUCKET || !context.env.PUBLIC_MEDIA_URL) return json({ message: '이미지 저장소 설정을 확인해 주세요.' }, 503);
  const extension = String(file.name || 'image').split('.').pop().toLowerCase();
  const key = `articles/${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}.${extension}`;
  try {
    const bytes = await file.arrayBuffer();
    await context.env.BUCKET.put(key, bytes, { httpMetadata: { contentType: file.type } });
    const base = context.env.PUBLIC_MEDIA_URL.replace(/\/$/, '');
    const url = `${base}/${key}`;
    const result = await context.env.DB.prepare('INSERT INTO media(uploader_id,object_key,url,alt_text,mime_type,size_bytes) VALUES(?,?,?,?,?,?)').bind(auth.user.id, key, url, alt, file.type, file.size).run();
    await audit(context.env, auth.user.id, 'upload', 'media', result.meta.last_row_id, { key });
    return json({ success: true, id: result.meta.last_row_id, url, alt }, 201);
  } catch (error) {
    return json({ message: `이미지 저장에 실패했습니다: ${error.message || '잠시 후 다시 시도해 주세요.'}` }, 500);
  }
}
