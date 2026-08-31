const dateText = (value) => value ? String(value).replace('T', ' ').slice(0, 16) : '';

function parseBlocks(value, fallbackText = '') {
  if (Array.isArray(value)) return value;
  try {
    const parsed = JSON.parse(value || '[]');
    if (Array.isArray(parsed)) return parsed;
  } catch {
    // Older articles can contain plain text only.
  }
  return fallbackText ? fallbackText.split(/\n{2,}/).filter(Boolean).map((text) => ({ type: 'paragraph', text })) : [];
}

export function normalizeArticle(article) {
  const blocks = parseBlocks(article.body_json, article.body_text);
  return {
    ...article,
    category: article.category_slug,
    image: article.image_url || '',
    imageAlt: article.image_alt || '',
    author: article.author_name || '시니어 라이프 뉴스',
    publishedAt: dateText(article.published_at),
    updatedAt: dateText(article.updated_at),
    body: blocks,
  };
}

export async function fetchPublishedArticles(params = {}) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') search.set(key, String(value));
  });
  const response = await fetch(`/api/articles${search.size ? `?${search}` : ''}`);
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || '기사를 불러오지 못했습니다.');
  return (data.articles || []).map(normalizeArticle);
}
