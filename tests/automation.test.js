import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { onRequest } from '../functions/api/automation/[[path]].js';
import { onRequestGet as publicArticle } from '../functions/api/articles/[slug].js';
import { signJWT } from '../functions/api/utils/jwt.js';
import { REVIEW_CHECKS, sha256, articlePayload } from '../shared/automation.js';

async function setup() {
  const sql=new DatabaseSync(':memory:');sql.exec(readFileSync(new URL('../schema.sql',import.meta.url),'utf8'));
  sql.exec("INSERT INTO users(id,email,name,role,status) VALUES(1,'test@example.org','Test admin','admin','active')");
  const DB={prepare(query){const stmt=sql.prepare(query);let vals=[];return {bind(...args){vals=args;return this;},async first(){return stmt.get(...vals)||null;},async all(){return {results:stmt.all(...vals)};},async run(){const r=stmt.run(...vals);return {meta:{changes:Number(r.changes),last_row_id:Number(r.lastInsertRowid)}};}};}};
  const objects=new Map();const env={DB,JWT_SECRET:'test-only-secret',PUBLIC_MEDIA_URL:'https://media.example.org',BUCKET:{async put(k,b){objects.set(k,b);}}};
  const token='sln_'+ 'a'.repeat(43);
  const cookie='token='+await signJWT({sub:1,role:'admin'},env.JWT_SECRET);
  async function call(path,method='GET',data=null,auth='token',form=null){
    const headers={};if(auth==='token')headers.Authorization='Bearer '+token;
    if(auth==='admin')Object.assign(headers,{Cookie:cookie,Origin:'https://seniorlifenews.co.kr','X-Requested-With':'SeniorNews'});
    if(data)headers['Content-Type']='application/json';
    const context={env,request:new Request('https://seniorlifenews.co.kr/api/automation/'+path,{method,headers,body:form|| (data?JSON.stringify(data):undefined)})};
    const r=await onRequest(context);return {status:r.status,body:await r.json()};
  }
  async function pair(){
    const r=await call('pair','POST',{token_hash:await sha256(token),name:'Test PC'},null);
    return r.body.pair_id;
  }
  async function active(){const id=await pair();assert.equal((await call('approve','POST',{id,confirm_access:true},'admin')).status,200);return id;}
  const payload={external_id:'test-api',test_only:true,article:{title:'Test only',summary:'Not real news',body:'Test content',cms_category:'health',author:'시니어 라이프 뉴스',sources:[],pending_checks:[],images:[]}};
  return {sql,env,objects,token,call,pair,active,payload};
}
test('pairing cannot self-approve; revoked and expired keys fail closed',async()=>{
  const s=await setup();try{
    const id=await s.pair();assert.equal((await s.call('status')).body.state,'pending');
    assert.equal((await s.call('categories')).status,401);
    assert.equal((await s.call('approve','POST',{id,confirm_access:true})).status,403);
    assert.equal((await s.call('approve','POST',{id,confirm_access:true},'admin')).status,200);
    assert.equal((await s.call('categories')).status,200);
    s.sql.prepare("UPDATE editorial_api_keys SET expires_at='2000-01-01'").run();assert.equal((await s.call('categories')).status,401);
    s.sql.prepare("UPDATE editorial_api_keys SET expires_at='2099-01-01',revoked_at='2026-01-01'").run();assert.equal((await s.call('categories')).status,401);
  }finally{s.sql.close();}
});
test('article create is draft-only and idempotent; conflicting reuse rejected',async()=>{
  const s=await setup();try{await s.active();const a=await s.call('articles','POST',{...s.payload,status:'published'});assert.equal(a.status,201);assert.equal(a.body.status,'draft');
    const again=await s.call('articles','POST',s.payload);assert.equal(again.body.id,a.body.id);assert.equal(again.body.existing,true);
    const conflict=structuredClone(s.payload);conflict.article.body='Different';assert.equal((await s.call('articles','POST',conflict)).status,409);
    assert.equal(s.sql.prepare('SELECT COUNT(*) n FROM articles').get().n,1);
  }finally{s.sql.close();}
});
test('indefinite connection and immediate reviewed publication; tests never public',async()=>{
  const s=await setup();try{await s.active();assert.equal((await s.call('status')).body.expires_at,null);
    const created=await s.call('articles','POST',s.payload);const id=created.body.id;
    const read=await s.call('articles/'+id);
    const review={actor:'quality review',at:new Date().toISOString(),selection_evidence:'Selected research record 1',checks:Object.fromEntries(REVIEW_CHECKS.map(k=>[k,{passed:true,note:'Fixture verified'}]))};
    const d={expected_hash:read.body.content_hash,review};
    assert.equal((await s.call(`articles/${id}/publish`,'POST',d)).status,403);
    assert.equal((await publicArticle({env:s.env,params:{slug:'newsroom-test-api'},waitUntil(){}})).status,404);
    const real=structuredClone(s.payload);real.test_only=false;real.external_id='reviewed-fixture';real.article.sources=['https://example.org/source'];
    const c=await s.call('articles','POST',real);const r=await s.call('articles/'+c.body.id);const path=`articles/${c.body.id}/publish`;
    assert.equal((await s.call(path,'POST',{expected_hash:r.body.content_hash})).status,403);
    assert.equal((await s.call(path,'POST',{...d,expected_hash:'stale'})).status,409);
    assert.equal((await s.call(path,'POST',{...d,expected_hash:r.body.content_hash,scheduled_at:'2099-01-01'})).status,400);
    assert.equal((await s.call(path,'POST',{...d,expected_hash:r.body.content_hash})).body.status,'published');
    const final=await s.call('articles/'+c.body.id);assert.equal(final.body.article.scheduled_at,null);assert.ok(final.body.article.published_at);
  }finally{s.sql.close();}
});
test('legacy future schedule can be cancelled',async()=>{
  const s=await setup();try{await s.active();const c=await s.call('articles','POST',s.payload);
    s.sql.prepare("UPDATE articles SET status='published',scheduled_at='2099-01-01 00:00:00',published_at='2099-01-01 00:00:00' WHERE id=?").run(c.body.id);
    const r=await s.call('articles/'+c.body.id);
    assert.equal((await s.call(`articles/${c.body.id}/cancel-schedule`,'POST',{expected_hash:r.body.content_hash})).status,200);
    const f=await s.call('articles/'+c.body.id);assert.equal(f.body.article.status,'draft');assert.equal(f.body.article.published_at,null);
  }finally{s.sql.close();}
});
test('media upload checks bytes and reuses content-addressed objects',async()=>{
  const s=await setup();try{await s.active();const form=()=>{const f=new FormData();f.set('alt','Test image');f.set('file',new File([new Uint8Array([137,80,78,71,13,10,26,10,0])],'test.png',{type:'image/png'}));return f;};
    const first=await s.call('media','POST',null,'token',form());const second=await s.call('media','POST',null,'token',form());assert.equal(first.status,200);assert.equal(first.body.url,second.body.url);assert.equal(s.objects.size,1);
    const bad=new FormData();bad.set('alt','bad');bad.set('file',new File(['not png'],'x.png',{type:'image/png'}));assert.equal((await s.call('media','POST',null,'token',bad)).status,400);
  }finally{s.sql.close();}
});
test('plain text import escapes HTML and demands image rights',()=>{
  const d={external_id:'test-escape',article:{title:'x',summary:'y',body:'<script>evil</script>',cms_category:'health',author:'시니어 라이프 뉴스',sources:[],pending_checks:[]}};
  const content=JSON.parse(articlePayload(d).body_json).content;
  assert.ok(!content[0].html.includes('<script>'));
  assert.equal(content[0].text,'<script>evil</script>');
  d.article.images=[{url:'https://media.example.org/x.png',alt:'x',caption:'photo',kind:'photo'}];assert.throws(()=>articlePayload(d));
});

test('source display edit preserves published content, attribution and internal evidence',async()=>{
  const s=await setup();try{await s.active();s.payload.article.sources=['https://example.org/official','https://example.org/evidence'];const c=await s.call('articles','POST',s.payload);
    s.sql.prepare("UPDATE articles SET status='published',published_at=CURRENT_TIMESTAMP WHERE id=?").run(c.body.id);
    const before=(await s.call('articles/'+c.body.id)).body;
    const d={expected_hash:before.content_hash,source_display:[{label:'Official report',url:'https://example.org/official'}]};
    assert.equal((await s.call(`articles/${c.body.id}/source-display`,'POST',{...d,source_display:[{label:'x',url:'https://evil.example'}]})).status,400);
    assert.equal((await s.call(`articles/${c.body.id}/source-display`,'POST',d)).status,200);
    const after=(await s.call('articles/'+c.body.id)).body.article;
    for(const k of ['status','published_at','source_text','body_text','title','image_url'])assert.equal(after[k],before.article[k]);
    const oldDoc=JSON.parse(before.article.body_json),doc=JSON.parse(after.body_json);assert.deepEqual(doc.content,oldDoc.content);assert.equal(doc.editorial.hero_caption,oldDoc.editorial.hero_caption);assert.deepEqual(doc.editorial.source_display,d.source_display);
    assert.equal((await s.call(`articles/${c.body.id}/source-display`,'POST',d)).status,409);
  }finally{s.sql.close();}
});
