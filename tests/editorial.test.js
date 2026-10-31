import test from 'node:test';
import assert from 'node:assert/strict';
import { importEditorialPackage, publicationError, publicationTime } from '../shared/editorial.js';
const pkg = { article_id: 'NEWS_001', state: '편집 검토 대기', article: {title:'제목', summary:'요약', body:'<script>alert(1)</script>\n\n## 소제목', category:'건강', cms_category:'health', sources:[]}};
test('import preserves stable slug, escapes HTML, and fixes newsroom byline', () => {
  const a = importEditorialPackage(pkg);
  assert.equal(a.slug, importEditorialPackage(pkg).slug);
  assert.equal(a.newsroom_meta.author_name, '시니어 라이프 뉴스');
  assert.ok(!a.blocks[0].html.includes('<script>'));
  assert.equal(a.blocks[1].type, 'sectionTitle');
  assert.equal(a.image_url, '');
});
test('unreviewed or unresolved packages cannot import', () => {
  assert.throws(() => importEditorialPackage({...pkg, state:'초안 작성'}));
  assert.throws(() => importEditorialPackage({...pkg, article:{...pkg.article, pending_checks:['미확인']}}));
});
test('only administrator explicit approval allows publication', () => {
  assert.ok(publicationError({role:'editor'}, {status:'published', editorial_approved:true}));
  assert.ok(publicationError({role:'admin'}, {status:'published'}));
  assert.equal(publicationError({role:'admin'}, {status:'published', editorial_approved:true}), null);
  assert.equal(publicationError({role:'editor'}, {status:'review'}), null);
});
test('schedule requires future zoned timestamp and normalizes UTC for SQL', () => {
  assert.equal(publicationTime('2030-01-01T09:00:00+09:00', 0), '2030-01-01 00:00:00');
  assert.throws(() => publicationTime('2030-01-01T09:00:00', 0));
  assert.throws(() => publicationTime('2000-01-01T09:00:00Z'));
});
