const SETTINGS_EVENT = 'senior-news:settings-changed';
const INTERESTS_KEY = 'senior-news:interests';
const RECENT_KEY = 'senior-news:recent-articles';

function readJson(key, fallback) {
  try {
    const value = window.localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key, value) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Some in-app browsers can restrict local storage. The page remains usable.
  }
}

export function getReaderSettings() {
  try {
    return {
      largeText: window.localStorage.getItem('largeText') === 'true',
      highContrast: window.localStorage.getItem('highContrast') === 'true',
    };
  } catch {
    return { largeText: false, highContrast: false };
  }
}

export function saveReaderSettings(settings) {
  try {
    window.localStorage.setItem('largeText', String(settings.largeText));
    window.localStorage.setItem('highContrast', String(settings.highContrast));
  } catch {
    // The visual setting is still applied below even when persistence is unavailable.
  }
  document.body.classList.toggle('large-text', settings.largeText);
  document.body.classList.toggle('high-contrast', settings.highContrast);
  window.dispatchEvent(new CustomEvent(SETTINGS_EVENT, { detail: settings }));
}

export function getInterestedCategories() {
  return readJson(INTERESTS_KEY, []);
}

export function saveInterestedCategories(categories) {
  writeJson(INTERESTS_KEY, categories);
}

export function getRecentArticles() {
  return readJson(RECENT_KEY, []);
}

export function saveRecentArticle(article) {
  if (!article?.id || !article?.slug) return;
  const item = {
    id: article.id,
    slug: article.slug,
    category: article.category,
    title: article.title,
    summary: article.summary,
    image: article.image,
    imageAlt: article.imageAlt,
    author: article.author,
    publishedAt: article.publishedAt,
    viewedAt: new Date().toISOString(),
  };
  const next = [item, ...getRecentArticles().filter((recent) => recent.slug !== item.slug)].slice(0, 12);
  writeJson(RECENT_KEY, next);
}

export function clearRecentArticles() {
  writeJson(RECENT_KEY, []);
}

export { SETTINGS_EVENT };
