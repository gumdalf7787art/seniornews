const dateText = (value) => value ? String(value).replace('T', ' ').slice(0, 16) : '';

function parseBlocks(value, fallbackText = '') {
  if (Array.isArray(value)) return value;
  try {
    const parsed = JSON.parse(value || '[]');
    if (Array.isArray(parsed)) return parsed;
    if (Array.isArray(parsed?.content)) return parsed.content;
  } catch {
    // Older articles can contain plain text only.
  }
  return fallbackText ? fallbackText.split(/\n{2,}/).filter(Boolean).map((text) => ({ type: 'paragraph', text })) : [];
}

export function normalizeArticle(article) {
  const blocks = parseBlocks(article.body_json, article.body_text);
  let editorial = {}; try { editorial = JSON.parse(article.body_json || '{}').editorial || {}; } catch { /* Legacy content */ }
  return {
    ...article,
    editorial,
    category: article.category_slug,
    image: article.image_url || '',
    imageAlt: article.image_alt || '',
    author: article.author_name || '시니어 라이프 뉴스',
    publishedAt: dateText(article.published_at),
    updatedAt: dateText(article.updated_at),
    body: blocks,
  };
}

const initial = (() => {
  try { return JSON.parse(document.getElementById('news-initial')?.textContent || 'null'); } catch { return null; }
})();
export function initialArticle(slug) {
  return initial?.article?.slug === slug && initial.path === window.location.pathname ? normalizeArticle(initial.article) : null;
}
export function releaseInitialArticle() { if (initial) delete initial.article; }
const summaries = new Map();
function remember(items) {
  for (const item of items) summaries.set(item.slug, item);
  while (summaries.size > 180) summaries.delete(summaries.keys().next().value);
  return items;
}
export const articlePreview = slug => summaries.get(slug);
let homeList = initial?.path === '/' && Array.isArray(initial.articles) ? remember(initial.articles.map(normalizeArticle)) : null;
let fetchedAt = Date.now();
export const recentHomeList = () => Date.now() - fetchedAt < 60000 ? homeList : null;
export async function fetchPublishedArticles(params = {}) {
  const isHome = params.limit === 30 && Object.keys(params).length === 1;
  if (isHome && recentHomeList()) return homeList;
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') search.set(key, String(value));
  });
  const response = await fetch(`/api/articles${search.size ? `?${search}` : ''}`);
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || '기사를 불러오지 못했습니다.');
  const items = remember((data.articles || []).map(normalizeArticle));
  if (isHome) { homeList = items; fetchedAt = Date.now(); }
  return items;
}
