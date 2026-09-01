import { audit, json, requireUser, verifyMutationRequest } from '../../utils/auth.js';

export async function onRequestPost(context) {
  if (!verifyMutationRequest(context.request)) return json({ message: '잘못된 요청입니다.' }, 403);
  const auth = await requireUser(context, ['admin']);
  if (auth.error) return auth.error;
  const form = await context.request.formData();
  const file = form.get('file');
  const alt = String(form.get('alt') || '').trim();
  if (!file || typeof file.arrayBuffer !== 'function' || !alt) return json({ message: '배너 이미지와 이미지 설명을 입력해 주세요.' }, 400);
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 10 * 1024 * 1024) return json({ message: 'JPG, PNG, WEBP 이미지 10MB 이하만 업로드할 수 있습니다.' }, 400);
  if (!context.env.BUCKET || !context.env.PUBLIC_MEDIA_URL) return json({ message: '이미지 저장소 설정을 확인해 주세요.' }, 503);
  const extension = String(file.name || 'banner').split('.').pop().toLowerCase();
  const key = `banners/${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}.${extension}`;
  try {
    const bytes = await file.arrayBuffer();
    await context.env.BUCKET.put(key, bytes, { httpMetadata: { contentType: file.type } });
    const url = `${context.env.PUBLIC_MEDIA_URL.replace(/\/$/, '')}/${key}`;
    const result = await context.env.DB.prepare('INSERT INTO media(uploader_id,object_key,url,alt_text,mime_type,size_bytes) VALUES(?,?,?,?,?,?)').bind(auth.user.id, key, url, alt, file.type, file.size).run();
    await audit(context.env, auth.user.id, 'upload', 'banner_media', result.meta.last_row_id, { key });
    return json({ success: true, url }, 201);
  } catch (error) {
    return json({ message: `배너 이미지를 저장하지 못했습니다: ${error.message || '잠시 후 다시 시도해 주세요.'}` }, 500);
  }
}
