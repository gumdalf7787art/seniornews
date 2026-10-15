import test from 'node:test';
import assert from 'node:assert/strict';
import { onRequest } from '../functions/[[path]].js';
import { onRequestGet } from '../functions/sitemap.xml.js';
import { publicPages, categoryPages, pageTitle } from '../shared/seo.js';

const html = '<html><head><title>기본 제목</title><meta name="naver-site-verification" content="keep"></head><body><div id="root"></div></body></html>';
function context(path, DB) {
  return { request: new Request(`https://seniorlifenews.co.kr${path}`), env: { DB }, next: async () => new Response(html, { headers: { 'Content-Type': 'text/html', ETag: 'old' } }) };
}

test('public landing pages have unique titles, canonical URLs, schemas and crawlable navigation without JavaScript', async () => {
  assert.equal(new Set(publicPages.map(pageTitle)).size, publicPages.length);
  for (const page of publicPages) {
    const response = await onRequest(context(page.path));
    const body = await response.text();
    assert.ok(body.includes(`<title>${pageTitle(page)}</title>`));
    assert.ok(body.includes(page.description));
    assert.ok(body.includes('<meta name="naver-site-verification" content="keep">'));
    assert.equal(response.headers.get('ETag'), null);
    for (const category of categoryPages) assert.ok(body.includes(`href="${category.path}"`));
    const schema = JSON.parse(body.match(/<script id="public-page-schema"[^>]*>(.*?)<\/script>/s)[1]);
    assert.equal(schema['@graph'][0]['@type'], 'WebSite');
    assert.equal(schema['@graph'][1].url, `https://seniorlifenews.co.kr${page.path}`);
  }
});

test('category HTML includes only its published article query, escaped content and article links', async () => {
  let query, values;
  const DB = { prepare(sql) { query = sql; return { bind(...args) { values = args; return { all: async () => ({ results: [{ slug: 'safe-slug', title: '<script>alert(1)</script>', summary: 'A & B' }] }) }; } }; } };
  const body = await (await onRequest(context('/category/health', DB))).text();
  assert.match(query, /status='published'/);
  assert.match(query, /published_at<=CURRENT_TIMESTAMP/);
  assert.match(query, /c.slug=\?/);
  assert.deepEqual(values, ['health']);
  assert.ok(body.includes('href="/article/safe-slug"'));
  assert.ok(body.includes('&lt;script&gt;alert(1)&lt;/script&gt;'));
  assert.ok(body.includes('A &amp; B'));
});

test('sitemap lists public navigation destinations without account or preview pages', async () => {
  const DB = { prepare: () => ({ all: async () => ({ results: [] }) }) };
  const body = await (await onRequestGet(context('/sitemap.xml', DB))).text();
  for (const page of publicPages) assert.ok(body.includes(`<loc>https://seniorlifenews.co.kr${page.path}</loc>`));
  for (const privatePath of ['/login', '/admin', '/mypage', '/brand-preview']) assert.ok(!body.includes(privatePath));
});
