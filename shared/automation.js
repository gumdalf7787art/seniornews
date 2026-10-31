export const SCOPES = 'articles:read articles:write media:write articles:publish';
export async function sha256(value) {
  const data = typeof value === 'string' ? new TextEncoder().encode(value) : value;
  return [...new Uint8Array(await crypto.subtle.digest('SHA-256', data))].map(b => b.toString(16).padStart(2, '0')).join('');
}
export function approvedKey(key, now = new Date().toISOString()) {
  return !!key && !!key.approved_by && !key.revoked_at && (!key.expires_at || key.expires_at > now) && key.user_status === 'active' && key.user_role === 'admin';
}
const esc = value => String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');
export function articlePayload(data) {
  const a = data.article;
  if (!/^[a-z0-9][a-z0-9-]{2,79}$/.test(data.external_id || '')) throw new Error('external_id: 소문자 영문·숫자·하이픈 3~80자');
  if (!a || a.author !== '시니어 라이프 뉴스') throw new Error('작성자 표기 확인 필요');
  for (const key of ['title','summary','body','cms_category']) if (typeof a[key] !== 'string' || !a[key].trim()) throw new Error('필수 항목: '+key);
  if (a.title.length > 300 || a.summary.length > 3000 || a.body.length > 150000) throw new Error('원고 크기 제한 초과');
  if (!Array.isArray(a.pending_checks) || a.pending_checks.length) throw new Error('미확인 사실을 먼저 해결하세요');
  if (!Array.isArray(a.sources) || !a.sources.every(u => typeof u === 'string' && /^https?:\/\//.test(u))) throw new Error('출처 URL 배열 필요');
  const images = a.images || [];
  if (!Array.isArray(images) || images.length > 20) throw new Error('이미지 배열 확인 필요');
  for (const im of images) {
    if (!im.url || !im.alt?.trim() || !im.caption?.trim()) throw new Error('이미지 URL·ALT·캡션 필요');
    if (im.kind === 'ai') { if (!/AI (생성|제작) 이미지/.test(im.caption)) throw new Error('AI 캡션 표시 필요'); }
    else if (im.kind === 'photo') { if (!im.license || !im.license_evidence_url || !im.attribution || im.commercial_use_confirmed !== true) throw new Error('사진 사용권 확인 필요'); }
    else if (im.kind !== 'test' || data.test_only !== true) throw new Error('이미지 종류 확인 필요');
  }
  if (a.hero_image && !images.some(im => im.url === a.hero_image)) throw new Error('대표 이미지 확인 필요');
  const hero = images.find(im => im.url === a.hero_image);
  const content = a.body.split(/\n{2,}/).filter(Boolean).map(text => ({type:text.startsWith('## ')?'sectionTitle':'paragraph',text:text.replace(/^## /,''),html:esc(text.replace(/^## /,'')),...(text.startsWith('## ')?{attrs:{variant:'bar'}}:{})}));
  for (const im of images.filter(im => im.url !== a.hero_image)) content.push({type:'image',attrs:{src:im.url,alt:im.alt,caption:im.caption}});
  const editorial = {author_name:'시니어 라이프 뉴스',article_id:data.external_id,automation:true,test_only:data.test_only===true,seo_title:String(a.seo_title||a.title),meta_description:String(a.meta_description||a.summary),subtitle:String(a.subtitle||''),tags:Array.isArray(a.tags)?a.tags:[],hero_caption:hero?.caption||'',source_display:sourceDisplay(a.source_display || [],a.sources)};
  return {title:a.title.trim(),slug:'newsroom-'+data.external_id,summary:a.summary.trim(),category:a.cms_category,body_json:JSON.stringify({type:'doc',version:2,editorial,content}),body_text:content.filter(b=>b.type!=='image').map(b=>b.text).join('\n\n'),image_url:hero?.url||null,image_alt:hero?.alt||null,source_text:a.sources.join('\n'),status:'draft'};
}
export async function articleHash(a) {
  return sha256(JSON.stringify([a.id,a.category_id,a.title,a.slug,a.summary,a.body_json,a.body_text,a.image_url||null,a.image_alt||null,a.source_text||null,a.updated_at]));
}

export const REVIEW_CHECKS = ['facts','quotes','language','title','copyright','seo','images','sensitive_advice'];
export function validReview(r) {
  return !!r && typeof r.actor === 'string' && !!r.actor.trim() && Number.isFinite(Date.parse(r.at)) &&
    typeof r.selection_evidence === 'string' && !!r.selection_evidence.trim() &&
    REVIEW_CHECKS.every(k => r.checks?.[k]?.passed === true && typeof r.checks[k].note === 'string' && !!r.checks[k].note.trim());
}

export function sourceDisplay(value, sources) {
  if (!Array.isArray(value) || value.length > 1) throw new Error('표시 출처는 0개 또는 1개여야 합니다');
  return value.map(item => {
    if (typeof item.label !== 'string' || !item.label.trim() || item.label.length > 300 || !/^https?:\/\//.test(item.url || '') || !sources.includes(item.url)) throw new Error('원자료 목록과 일치하는 출처 이름·URL 필요');
    return {label:item.label.trim(),url:item.url};
  });
}
