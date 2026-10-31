export const NEWSROOM_BYLINE = '시니어 라이프 뉴스';
const escape = (value) => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');
export function importEditorialPackage(pkg) {
  const a = pkg?.article;
  if (!a || !/^[A-Za-z0-9_-]{1,80}$/.test(pkg.article_id || '')) throw new Error('기사 패키지와 기사 ID를 확인해 주세요.');
  if (pkg.state !== '편집 검토 대기' && pkg.state !== '승인 완료') throw new Error('검수를 마친 기사 패키지만 불러올 수 있습니다.');
  if (a.pending_checks?.length || pkg.package?.pending_checks?.length) throw new Error('미확인 사항이 남아 있습니다.');
  for (const field of ['title', 'summary', 'body', 'category']) if (typeof a[field] !== 'string' || !a[field].trim()) throw new Error('필수 기사 정보 누락: ' + field);
  const category = a.cms_category;
  if (typeof category !== 'string' || !category.trim()) throw new Error('cms_category에 홈페이지 카테고리 slug를 지정해 주세요.');
  const blocks = a.body.split(/\n{2,}/).filter(Boolean).map((text, index) => ({id: 'import-' + index, type: text.startsWith('## ') ? 'sectionTitle' : 'paragraph', text: text.replace(/^## /, ''), html: escape(text.replace(/^## /, ''))}));
  return {title: a.title, slug: 'newsroom-' + pkg.article_id.toLowerCase().replaceAll('_', '-'), summary: a.summary, category, blocks, image_url: '', image_alt: '', source_text: (a.sources || []).join('\n') + '\n작성: ' + NEWSROOM_BYLINE, newsroom_meta: {author_name: NEWSROOM_BYLINE, article_id: pkg.article_id, seo_title: a.seo_title || '', meta_description: a.meta_description || '', tags: a.tags || [], subtitle: a.subtitle || '', hero_caption: (a.images || []).find((im) => im.path === a.hero_image)?.caption || '', images: (a.images || []).map(({kind, caption, alt, attribution}) => ({kind, caption, alt, attribution}))}};
}

export function publicationError(user, data) {
  if (data.status === 'published' && (user.role !== 'admin' || data.editorial_approved !== true)) return '관리자의 명시적 승인 후 공개할 수 있습니다.';
  return null;
}

export function publicationTime(value, now = Date.now()) {
  if (!value) return null;
  if (typeof value !== 'string' || !/(Z|[+-]\d{2}:\d{2})$/.test(value)) throw new Error('예약 시각의 시간대가 필요합니다.');
  const ms = Date.parse(value);
  if (!Number.isFinite(ms) || ms <= now) throw new Error('미래의 예약 시각을 지정해 주세요.');
  return new Date(ms).toISOString().slice(0, 19).replace('T', ' ');
}
