import test from 'node:test';
import assert from 'node:assert/strict';
import { onRequest } from '../functions/[[path]].js';
import { onRequestGet as sitemap } from '../functions/sitemap.xml.js';
import { onRequestGet as rss } from '../functions/rss.xml.js';

const origin = 'https://seniorlifenews.co.kr';
const article = {
  slug: 'sample-news', title: '기사 제목', summary: '기사 요약', body_text: '기사 본문',
  image_url: '', author_name: '기자', category_name: '건강',
  published_at: '2026-10-15T00:00:00Z', updated_at: '2026-10-15T00:00:00Z',
};
const DB = { prepare: () => ({
  all: async () => ({ results: [article] }),
  bind: () => ({ first: async () => article }),
}) };
const html = '<html><head><title>뉴스</title><meta property="og:url" content="https://seniorlifenews.pages.dev/"></head><body><div id="root"></div></body></html>';
const context = (path) => ({
  request: new Request(`https://seniorlifenews.pages.dev${path}`), env: { DB },
  next: async () => new Response(html, { headers: { 'Content-Type': 'text/html' } }),
});

test('home and lab canonical URLs use the official domain even on the old host', async () => {
  for (const path of ['/', '/lab', '/lab/research']) {
    const body = await (await onRequest(context(path))).text();
    assert.ok(body.includes(`<link rel="canonical" href="${origin}${path}">`));
    assert.ok(body.includes(`<meta property="og:url" content="${origin}${path}">`));
    assert.ok(!body.includes('pages.dev'));
  }
});

test('article metadata and fallback image use the official domain', async () => {
  const body = await (await onRequest(context('/article/sample-news'))).text();
  assert.ok(body.includes(`"mainEntityOfPage":"${origin}/article/sample-news"`));
  assert.ok(body.includes(`${origin}/images/og-senior-life-news.png`));
  assert.equal((body.match(/rel="canonical"/g) || []).length, 1);
  assert.ok(!body.includes('pages.dev'));
});

test('sitemap and RSS publish official URLs when requested on another host', async () => {
  for (const handler of [sitemap, rss]) {
    const body = await (await handler(context('/feed'))).text();
    assert.ok(body.includes(`${origin}/article/sample-news`));
    assert.ok(!body.includes('pages.dev'));
  }
});

test('non-HTML responses pass through unchanged', async () => {
  const response = new Response('asset', { headers: { 'Content-Type': 'text/css' } });
  assert.equal(await onRequest({ ...context('/assets/style.css'), next: async () => response }), response);
});
