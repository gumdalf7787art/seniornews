// Image-only changes: never rebuild text blocks or publication metadata.
function image(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('이미지 객체 필요');
  for (const [key, max] of [['url',2048],['alt',1000],['caption',3000]]) {
    if (typeof value[key] !== 'string' || !value[key].trim() || value[key].length > max) throw new Error('이미지 URL·ALT·캡션 확인 필요');
  }
  const url = new URL(value.url);
  if (url.protocol !== 'https:' || url.username || url.password || url.hash) throw new Error('HTTPS 이미지 주소 필요');
  if (value.kind === 'ai') {
    if (!/AI (생성|제작) 이미지/.test(value.caption) || !/AI/.test(value.alt)) throw new Error('AI 캡션·ALT 표시 필요');
  } else if (value.kind === 'photo') {
    if (!value.license?.trim() || !value.attribution?.trim() || value.commercial_use_confirmed !== true || !/^https:\/\//.test(value.license_evidence_url || '')) throw new Error('사진 이용권 근거 필요');
  } else throw new Error('이미지 종류는 ai 또는 photo');
  return {url:value.url,alt:value.alt.trim(),caption:value.caption.trim()};
}

export function editArticleImages(article, data) {
  const doc = JSON.parse(article.body_json);
  if (!doc || !Array.isArray(doc.content) || !doc.editorial || typeof doc.editorial !== 'object') throw new Error('기사 문서 형식 확인 필요');
  if (Object.keys(data).some(k => !['expected_hash','hero','operations'].includes(k))) throw new Error('사진 전용 요청에 다른 필드를 넣을 수 없습니다');
  if (!Object.hasOwn(data,'hero') && !data.operations?.length) throw new Error('변경할 사진을 지정하세요');
  const operations = data.operations ?? [];
  if (!Array.isArray(operations) || operations.length > 20) throw new Error('사진 작업은 최대20개');
  const urls = [];
  let image_url = article.image_url, image_alt = article.image_alt;
  if (Object.hasOwn(data,'hero')) {
    const hero = data.hero === null ? null : image(data.hero);
    image_url = hero?.url ?? null; image_alt = hero?.alt ?? null;
    doc.editorial.hero_caption = hero?.caption ?? '';
    if (hero) urls.push(hero.url);
  }
  for (const op of operations) {
    if (!op || !['insert','replace','remove'].includes(op.action) || !Number.isInteger(op.index)) throw new Error('본문 사진 action·index 확인 필요');
    // Indices refer to the evolving content array, including all text blocks.
    if (op.index < 0 || op.index > doc.content.length || (op.action !== 'insert' && op.index === doc.content.length)) throw new Error('본문 블록 위치 오류');
    if (op.action !== 'insert' && doc.content[op.index]?.type !== 'image') throw new Error('사진 블록만 교체·제거할 수 있습니다');
    if (op.action === 'remove') { doc.content.splice(op.index,1); continue; }
    const im = image(op.image);urls.push(im.url);
    const block = {type:'image',attrs:{src:im.url,alt:im.alt,caption:im.caption}};
    doc.content.splice(op.index,op.action === 'replace' ? 1 : 0,block);
  }
  if (doc.content.filter(b => b.type === 'image').length + (image_url ? 1 : 0) > 20) throw new Error('기사 사진은 최대20개');
  return {body_json:JSON.stringify(doc),image_url,image_alt,urls:[...new Set(urls)]};
}
