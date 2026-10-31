import test from 'node:test';
import assert from 'node:assert/strict';
import { signJWT } from '../functions/api/utils/jwt.js';
import { onRequestPost as publish } from '../functions/api/admin/articles/[id]/publish.js';
import { onRequestPost as create } from '../functions/api/admin/articles/index.js';
import { onRequestPatch as update } from '../functions/api/admin/articles/[id]/index.js';

async function setup(role, data, options = {}) {
  const writes = [];
  const user = {id:1, role, status:'active'};
  const article = {id:2, author_id:1, status:'review', updated_at:'2026-10-31 01:00:00', title:'테스트', summary:'요약', body_text:'본문', body_json:'{}'};
  const DB = {prepare(sql) {
    let args = [];
    return {bind(...values) { args = values; return this; }, async first() {
      if (sql.includes('FROM users')) return user;
      if (sql.includes('FROM articles')) return article;
      if (sql.includes('FROM categories')) return {id:1};
      throw new Error('Unexpected SELECT: ' + sql);
    }, async run() {
      writes.push({sql, args});
      return {meta:{changes: options.stale ? 0 : 1, last_row_id:2}};
    }};
  }};
  const secret = 'test-only-editorial-secret';
  const token = await signJWT({sub:1, role}, secret);
  return {writes, context:{params:{id:'2'}, env:{DB, JWT_SECRET:secret}, request:new Request('https://seniorlifenews.co.kr/api/admin/articles/2/publish', {
    method:'POST', headers:{Origin:'https://seniorlifenews.co.kr', 'X-Requested-With':'SeniorNews', 'Content-Type':'application/json', Cookie:'token='+token}, body:JSON.stringify(data)
  })}};
}

test('editor cannot publish through create, edit, or publish endpoint', async () => {
  for (const handler of [create, update, publish]) {
    const {context, writes} = await setup('editor', {title:'제목', slug:'test-article', summary:'요약', body_text:'본문', status:'published', editorial_approved:true});
    assert.equal((await handler(context)).status, 403);
    assert.equal(writes.length, 0);
  }
});
test('admin publish requires explicit approval and current revision', async () => {
  for (const data of [{}, {editorial_approved:true, expected_updated_at:'stale'}]) {
    const {context,writes} = await setup('admin',data);
    assert.ok([403,409].includes((await publish(context)).status));
    assert.equal(writes.length, 0);
  }
});
test('approved schedule normalizes to UTC and records approval audit', async () => {
  const {context,writes} = await setup('admin',{editorial_approved:true, expected_updated_at:'2026-10-31 01:00:00', scheduled_at:'2035-01-01T09:00:00+09:00'});
  assert.equal((await publish(context)).status, 200);
  const change = writes.find((w) => w.sql.startsWith('UPDATE articles'));
  assert.equal(change.args[1], '2035-01-01 00:00:00');
  assert.equal(change.args[2], '2035-01-01 00:00:00');
  assert.ok(writes.some((w) => w.sql.includes('audit_logs')));
});
test('racing update cannot receive successful publication receipt', async () => {
  const {context,writes} = await setup('admin',{editorial_approved:true, expected_updated_at:'2026-10-31 01:00:00'}, {stale:true});
  assert.equal((await publish(context)).status, 409);
  assert.ok(!writes.some((w) => w.sql.includes('audit_logs')));
});
test('cross-origin mutation is rejected before any writes', async () => {
  const {context,writes} = await setup('admin', {editorial_approved:true});
  context.request = new Request(context.request, {headers:{Origin:'https://example.org', 'X-Requested-With':'SeniorNews'}});
  assert.equal((await publish(context)).status, 403);
  assert.equal(writes.length, 0);
});
