import { editArticleImages } from '../../../shared/article-images.js';
import { json, requireUser, verifyMutationRequest, audit, AUTOMATION_USER } from '../utils/auth.js';
import { onRequestPost as createArticle } from '../admin/articles/index.js';
import { onRequestPatch as updateArticle } from '../admin/articles/[id]/index.js';
import { sourceDisplay, validReview, SCOPES, sha256, approvedKey, articlePayload, articleHash } from '../../../shared/automation.js';

const schema = `CREATE TABLE IF NOT EXISTS editorial_api_keys (
 id TEXT PRIMARY KEY, token_hash TEXT NOT NULL UNIQUE, name TEXT NOT NULL,
 scopes TEXT NOT NULL, requested_at TEXT NOT NULL, pair_expires_at TEXT NOT NULL,
 expires_at TEXT, ip_hash TEXT NOT NULL, approved_by INTEGER REFERENCES users(id),
 approved_at TEXT, revoked_at TEXT, last_used_at TEXT)`;
const iso = () => new Date().toISOString();
const future = ms => new Date(Date.now()+ms).toISOString();
const failure = (message,status=400) => json({success:false,message},status);
async function tokenKey(context) {
  const match = /^Bearer (sln_[A-Za-z0-9_-]{43})$/.exec(context.request.headers.get('Authorization')||'');
  if (!match) return null;
  const hash = await sha256(match[1]);
  return context.env.DB.prepare('SELECT k.*,u.role user_role,u.status user_status FROM editorial_api_keys k LEFT JOIN users u ON u.id=k.approved_by WHERE k.token_hash=?').bind(hash).first();
}
async function body(request) {
  const text = await request.text();
  if (text.length > 1000000) throw new Error('요청이 너무 큽니다');
  return JSON.parse(text);
}
function internal(context,user,data) {
  const headers = new Headers({'Content-Type':'application/json','X-Requested-With':'SeniorNews','Origin':new URL(context.request.url).origin});
  return {...context,[AUTOMATION_USER]:user,request:new Request(context.request.url,{method:'POST',headers,body:JSON.stringify(data)})};
}
function samePayload(existing,payload,categoryId) {
  return Number(existing.category_id)===Number(categoryId) && ['title','slug','summary','body_json','body_text','image_url','image_alt','source_text'].every(k=>(existing[k]||null)===(payload[k]||null));
}
async function owned(context,key,id) {
  if (!/^\d+$/.test(id||'')) return null;
  const a = await context.env.DB.prepare("SELECT * FROM articles WHERE id=? AND author_id=? AND slug LIKE 'newsroom-%'").bind(Number(id),key.approved_by).first();
  return a;
}
async function mediaUpload(context,key) {
  if (!context.env.BUCKET || !context.env.PUBLIC_MEDIA_URL) return failure('이미지 저장소 설정 필요',503);
  const f = await context.request.formData(); const file=f.get('file'),alt=String(f.get('alt')||'').trim();
  if (!file || typeof file.arrayBuffer!=='function' || !alt || file.size===0 || file.size>10*1024*1024) return failure('이미지 파일(10MB 이하)·ALT 필요');
  const exts={'image/png':'png','image/jpeg':'jpg','image/webp':'webp'};
  if (!exts[file.type]) return failure('PNG/JPG/WEBP만 허용');
  const bytes=new Uint8Array(await file.arrayBuffer());
  const valid=file.type==='image/png'?bytes.slice(0,8).join(',')==='137,80,78,71,13,10,26,10':file.type==='image/jpeg'?bytes[0]===255&&bytes[1]===216&&bytes[2]===255:new TextDecoder().decode(bytes.slice(0,4))==='RIFF'&&new TextDecoder().decode(bytes.slice(8,12))==='WEBP';
  if (!valid) return failure('파일 실제 형식 불일치');
  const hash=await sha256(bytes); const objectKey=`automation/${key.approved_by}/${hash}.${exts[file.type]}`;
  const url=context.env.PUBLIC_MEDIA_URL.replace(/\/$/,'')+'/'+objectKey;
  await context.env.BUCKET.put(objectKey,bytes,{httpMetadata:{contentType:file.type}});
  await context.env.DB.prepare('INSERT OR IGNORE INTO media(uploader_id,object_key,url,alt_text,mime_type,size_bytes) VALUES(?,?,?,?,?,?)').bind(key.approved_by,objectKey,url,alt,file.type,file.size).run();
  return json({success:true,url,alt,sha256:hash});
}
export async function onRequest(context) {
  const path = new URL(context.request.url).pathname.replace(/^\/api\/automation\/?/,'').split('/');
  const method=context.request.method;
  if (!context.env.DB) return failure('DB 설정 필요',503);
  try {
    await context.env.DB.prepare(schema).run();
    if(path[0]==='pair' && method==='POST') {
      const d=await body(context.request);
      if(!/^[a-f0-9]{64}$/.test(d.token_hash||'') || typeof d.name!=='string' || !d.name.trim() || d.name.length>80) return failure('연결 정보 오류');
      const ip=await sha256(context.request.headers.get('CF-Connecting-IP')||'unknown');
      const old=await context.env.DB.prepare('SELECT id,pair_expires_at FROM editorial_api_keys WHERE token_hash=?').bind(d.token_hash).first();
      if(old)return json({pair_id:old.id,pair_expires_at:old.pair_expires_at});
      const count=await context.env.DB.prepare('SELECT COUNT(*) n FROM editorial_api_keys WHERE requested_at>? AND (ip_hash=? OR approved_by IS NULL)').bind(new Date(Date.now()-3600000).toISOString(),ip).first();
      if(count.n>=10)return failure('연결 요청이 많습니다. 잠시 후 재시도하세요',429);
      const id=crypto.randomUUID(),until=future(30*60000);
      await context.env.DB.prepare('INSERT INTO editorial_api_keys(id,token_hash,name,scopes,requested_at,pair_expires_at,expires_at,ip_hash) VALUES(?,?,?,?,?,?,?,?)').bind(id,d.token_hash,d.name,SCOPES,iso(),until,null,ip).run();
      return json({pair_id:id,pair_expires_at:until,scopes:SCOPES},201);
    }
    if(['connections','approve','revoke','enable-delete','disable-delete'].includes(path[0])) {
      if(method!=='GET'&&!verifyMutationRequest(context.request))return failure('잘못된 요청',403);
      const auth=await requireUser(context,['admin']); if(auth.error)return auth.error;
      if(path[0]==='connections'&&method==='GET'){
        const rows=await context.env.DB.prepare('SELECT id,name,scopes,requested_at,pair_expires_at,expires_at,approved_at,revoked_at FROM editorial_api_keys WHERE approved_by=? OR (approved_by IS NULL AND pair_expires_at>?) ORDER BY requested_at DESC LIMIT 30').bind(auth.user.id,iso()).all();
        return json({connections:rows.results});
      }
      const d=await body(context.request); if(!/^[a-f0-9-]{36}$/.test(d.id||''))return failure('연결 ID 필요');
      if(path[0]==='approve'&&method==='POST'){
        if(d.confirm_access!==true)return failure('이 PC 연결 승인 확인 필요');
        const result=await context.env.DB.prepare('UPDATE editorial_api_keys SET approved_by=?,approved_at=? WHERE id=? AND approved_by IS NULL AND revoked_at IS NULL AND pair_expires_at>?').bind(auth.user.id,iso(),d.id,iso()).run();
        if(result.meta.changes!==1)return failure('연결 요청이 만료되었거나 처리되었습니다',409);
        await audit(context.env,auth.user.id,'api_connection_approve','api_key',d.id,{scopes:SCOPES});
        return json({success:true});
      }
      if (['enable-delete','disable-delete'].includes(path[0]) && method === 'POST') {
        const scopes = path[0] === 'enable-delete' ? SCOPES + ' articles:delete' : SCOPES;
        const changed = await context.env.DB.prepare('UPDATE editorial_api_keys SET scopes=? WHERE id=? AND approved_by=? AND revoked_at IS NULL').bind(scopes,d.id,auth.user.id).run();
        if (!changed.meta.changes) return failure('활성 연결 없음',404);
        await audit(context.env,auth.user.id,path[0],'api_key',d.id);
        return json({success:true});
      }
      if(path[0]==='revoke'&&method==='POST'){
        await context.env.DB.prepare('UPDATE editorial_api_keys SET revoked_at=? WHERE id=? AND approved_by=?').bind(iso(),d.id,auth.user.id).run();
        await audit(context.env,auth.user.id,'api_connection_revoke','api_key',d.id);return json({success:true});
      }
      return failure('지원하지 않는 요청',405);
    }
    const key=await tokenKey(context);
    if(path[0]==='status'&&method==='GET')return json({connected:approvedKey(key),state:!key?'unknown':key.revoked_at?'revoked':key.approved_by?(approvedKey(key)?'active':'expired'):key.pair_expires_at>iso()?'pending':'expired',expires_at:key?.expires_at||null,scopes:key?.scopes||null});
    if(!approvedKey(key))return failure('API 연결 승인·유효기간을 확인하세요',401);
    if(![SCOPES, SCOPES + ' articles:delete'].includes(key.scopes))return failure('권한 범위 오류',403);
    const user={id:key.approved_by,role:'admin',status:'active'};
    if(path[0]==='categories'&&method==='GET')return json({categories:(await context.env.DB.prepare('SELECT id,name,slug FROM categories WHERE is_active=1 ORDER BY display_order').all()).results});
    if(path[0]==='media'&&method==='POST')return mediaUpload(context,key);
    if(path[0]!=='articles')return failure('경로 없음',404);
    if(method==='GET'){
      if(path[1]){const a=await owned(context,key,path[1]);return a?json({article:a,content_hash:await articleHash(a)}):failure('기사 없음',404);}
      const slug=new URL(context.request.url).searchParams.get('slug');
      if(!slug?.startsWith('newsroom-'))return failure('조회할 newsroom- 기사 주소 필요');
      const a=await context.env.DB.prepare('SELECT * FROM articles WHERE slug=? AND author_id=?').bind(slug,key.approved_by).first();
      return a?json({article:a,content_hash:await articleHash(a)}):failure('기사 없음',404);
    }
    const d=await body(context.request);
    if(!path[1]&&method==='POST'){
      const payload=articlePayload(d);
      const category=await context.env.DB.prepare('SELECT id FROM categories WHERE slug=? AND is_active=1').bind(payload.category).first();
      if(!category)return failure('활성 카테고리 확인 필요');
      for(const im of d.article.images||[]){if(!await context.env.DB.prepare('SELECT id FROM media WHERE url=? AND uploader_id=?').bind(im.url,key.approved_by).first())return failure('이 계정으로 업로드한 이미지만 사용하세요');}
      const existing=await context.env.DB.prepare('SELECT * FROM articles WHERE slug=?').bind(payload.slug).first();
      if(existing)return existing.author_id===key.approved_by&&samePayload(existing,payload,category.id)?json({success:true,id:existing.id,status:existing.status,existing:true,content_hash:await articleHash(existing)}):failure('기사 ID가 이미 존재하며 내용이 다릅니다. 기존 원고를 조회 후 수정하세요',409);
      const response=await createArticle(internal(context,user,payload));
      if(response.status===409){const a=await context.env.DB.prepare('SELECT * FROM articles WHERE slug=? AND author_id=?').bind(payload.slug,user.id).first();if(a&&samePayload(a,payload,category.id))return json({success:true,id:a.id,status:a.status,existing:true,content_hash:await articleHash(a)});}
      return response;
    }
    const a=await owned(context,key,path[1]);if(!a)return failure('기사 없음',404);
    if(d.expected_hash!==await articleHash(a))return failure('원고가 변경되었습니다. 다시 검토하세요',409);
    if (method === 'PATCH' && path.length === 3 && path[2] === 'images') {
      let change;
      try { change = editArticleImages(a,d); } catch (error) { return failure(error.message,400); }
      for (const url of change.urls) {
        if (!await context.env.DB.prepare('SELECT id FROM media WHERE url=? AND uploader_id=?').bind(url,key.approved_by).first()) return failure('이 연결 계정이 업로드한 이미지만 사용할 수 있습니다',403);
      }
      const result = await context.env.DB.prepare("UPDATE articles SET body_json=?,image_url=?,image_alt=?,updated_at=strftime('%Y-%m-%d %H:%M:%f','now') WHERE id=? AND author_id=? AND updated_at=? AND body_json=? AND status=? AND image_url IS ? AND image_alt IS ?").bind(change.body_json,change.image_url,change.image_alt,a.id,user.id,a.updated_at,a.body_json,a.status,a.image_url,a.image_alt).run();
      if (result.meta.changes !== 1) return failure('동시 변경 감지',409);
      await audit(context.env,user.id,'api_edit_images','article',a.id,{key_id:key.id,previous_hash:d.expected_hash,hero_changed:Object.hasOwn(d,'hero'),operations:(d.operations||[]).map(op=>({action:op.action,index:op.index}))});
      return json({success:true,id:a.id,status:a.status});
    }
    if (method === 'DELETE' && path.length === 2) {
      if (!key.scopes.split(' ').includes('articles:delete')) return failure('관리자 화면에서 이 연결의 삭제 권한을 활성화하세요',403);
      if (d.confirm_slug !== a.slug) return failure('삭제할 기사 주소가 일치하지 않습니다',400);
      const result = await context.env.DB.prepare('DELETE FROM articles WHERE id=? AND author_id=? AND updated_at=? AND body_json=? AND status=?').bind(a.id,user.id,a.updated_at,a.body_json,a.status).run();
      if (result.meta.changes !== 1) return failure('동시 변경 감지',409);
      await audit(context.env,user.id,'api_delete','article',a.id,{slug:a.slug,key_id:key.id});
      return json({success:true,id:a.id,status:'deleted'});
    }
    if (method === 'PATCH' && path.length === 2 && Object.hasOwn(d,'body_markdown')) {
      if (typeof d.body_markdown !== 'string' || !d.body_markdown.trim() || d.body_markdown.length > 150000) return failure('본문 길이 확인 필요');
      const doc = JSON.parse(a.body_json);
      if (!Array.isArray(doc.content) || doc.content.some(b => !['paragraph','sectionTitle'].includes(b.type))) return failure('본문에 별도 이미지 또는 특수 블록이 있어 관리자 편집기를 사용하세요',409);
      const content = d.body_markdown.trim().split(/\r?\n\s*\r?\n/).map(paragraph => {
        const heading = paragraph.startsWith('## ');
        const text = heading ? paragraph.slice(3) : paragraph;
        const html = text.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
        return {type:heading?'sectionTitle':'paragraph',text,html,...(heading?{attrs:{variant:'bar'}}:{})};
      });
      const result = await context.env.DB.prepare("UPDATE articles SET body_json=?,body_text=?,updated_at=strftime('%Y-%m-%d %H:%M:%f','now') WHERE id=? AND author_id=? AND updated_at=? AND body_json=? AND status=?").bind(JSON.stringify({...doc,content}),content.map(b=>b.text).join('\n\n'),a.id,user.id,a.updated_at,a.body_json,a.status).run();
      if (result.meta.changes !== 1) return failure('동시 변경 감지',409);
      await audit(context.env,user.id,'api_edit_body','article',a.id,{key_id:key.id,previous_hash:d.expected_hash});
      return json({success:true,id:a.id,status:a.status});
    }
    if(path[2]==='source-display'&&method==='POST'){
      const display=sourceDisplay(d.source_display,(a.source_text||'').split('\n').map(s=>s.trim()).filter(Boolean));
      const doc=JSON.parse(a.body_json);doc.editorial={...doc.editorial,source_display:display};
      const result=await context.env.DB.prepare("UPDATE articles SET body_json=?,updated_at=strftime('%Y-%m-%d %H:%M:%f','now') WHERE id=? AND updated_at=? AND body_json=?").bind(JSON.stringify(doc),a.id,a.updated_at,a.body_json).run();
      if(result.meta.changes!==1)return failure('동시 변경 감지',409);
      await audit(context.env,user.id,'api_source_display','article',a.id,{key_id:key.id,source_display:display});return json({success:true,status:a.status});
    }
    if(method==='PATCH'&&!path[2]){
      if(a.status==='published')return failure('공개·예약 기사는 먼저 예약 해제/편집 절차 확인',409);
      const payload=articlePayload(d);if(payload.slug!==a.slug)return failure('기사 ID 변경 불가');
      for(const im of d.article.images||[]){if(!await context.env.DB.prepare('SELECT id FROM media WHERE url=? AND uploader_id=?').bind(im.url,key.approved_by).first())return failure('이미지 소유권 확인 필요');}
      return updateArticle({...internal(context,user,payload),params:{id:String(a.id)}});
    }
    if(path[2]==='cancel-schedule'&&method==='POST'){
      if(a.status!=='published'||!a.scheduled_at||a.published_at<=new Date().toISOString().slice(0,19).replace('T',' '))return failure('해제할 미래 예약이 없습니다',409);
      const result=await context.env.DB.prepare("UPDATE articles SET status='draft',scheduled_at=NULL,published_at=NULL,updated_at=strftime('%Y-%m-%d %H:%M:%f','now') WHERE id=? AND updated_at=? AND body_json=? AND status='published' AND published_at>CURRENT_TIMESTAMP").bind(a.id,a.updated_at,a.body_json).run();
      if(result.meta.changes!==1)return failure('동시 변경 감지',409);
      await audit(context.env,user.id,'api_cancel_schedule','article',a.id,{key_id:key.id});return json({success:true,status:'draft',scheduled_at:null});
    }
    if(path[2]==='publish'&&method==='POST'){
      if(!validReview(d.review))return failure('선정 근거와 항목별 검수 기록 필요',403);
      if(d.scheduled_at)return failure('자동 발행은 예약 없이 즉시 공개합니다');
      const scheduled=null;
      if(!['draft','review'].includes(a.status))return failure('초안 또는 검토 원고만 승인할 수 있습니다',409);
      let editorial;try{editorial=JSON.parse(a.body_json).editorial;}catch{return failure('원고 형식 확인 필요');}
      if(editorial?.test_only)return failure('시험 원고는 공개할 수 없습니다',403);
      if(!a.source_text?.trim())return failure('검증된 원자료 출처 필요',403);
      if(!a.title||!a.summary||!a.body_text||(a.image_url&&!a.image_alt))return failure('필수 원고·이미지 정보 누락');
      const result=await context.env.DB.prepare("UPDATE articles SET status='published',editor_id=?,scheduled_at=?,published_at=COALESCE(?,CURRENT_TIMESTAMP),updated_at=strftime('%Y-%m-%d %H:%M:%f','now') WHERE id=? AND updated_at=? AND body_json=? AND status IN ('draft','review')").bind(user.id,scheduled,scheduled,a.id,a.updated_at,a.body_json).run();
      if(result.meta.changes!==1)return failure('동시 변경 감지',409);
      await audit(context.env,user.id,'api_automatic_publish','article',a.id,{key_id:key.id,content_hash:d.expected_hash,review:d.review,scheduled_at:scheduled});return json({success:true,status:scheduled?'scheduled':'published',scheduled_at:scheduled});
    }
    return failure('지원하지 않는 요청',405);
  } catch(error) { console.error('Automation request failed',error?.name); return failure('요청을 처리하지 못했습니다. 입력 형식과 서버 연결을 확인하세요',400); }
}
