import { useState } from 'react';
export default function AutomationAccess() {
  const [rows,setRows]=useState([]),[message,setMessage]=useState(''),[code,setCode]=useState('');
  const load=async()=>{try{const r=await fetch('/api/automation/connections',{credentials:'include'});const d=await r.json();if(!r.ok)throw new Error(d.message);setRows(d.connections||[]);}catch(e){setMessage(e.message);}};
  const act=async(action,id)=>{try{const r=await fetch('/api/automation/'+action,{method:'POST',credentials:'include',headers:{'Content-Type':'application/json','X-Requested-With':'SeniorNews'},body:JSON.stringify({id,confirm_access:true})});const d=await r.json();if(!r.ok)throw new Error(d.message);setMessage(action==='approve'?'이 PC의 API 연결을 승인했습니다.':'API 연결을 해제했습니다.');await load();}catch(e){setMessage(e.message);}};
  return <details className="form-card"><summary>브라우저 없는 기사 API 연결</summary>
    <p>처음 한 번만 이 PC를 승인하면 로그인 창 없이 초안·이미지를 전송할 수 있습니다. 선정·검증·품질 검수를 통과한 기사는 별도 승인이나 예약 없이 즉시 공개합니다. 연결은 기한 없이 유지되며 언제든 해제할 수 있습니다.</p>
    <button type="button" onClick={load}>연결 요청 확인</button>
    <label htmlFor="pair-code">이 대화에 표시된 연결 ID</label><input id="pair-code" value={code} onChange={e=>setCode(e.target.value.trim())} autoComplete="off" />
    <p role="status">{message}</p>
    {rows.map(r=><section key={r.id}><strong>{r.name}</strong><p>연결 ID: {r.id}</p><p>권한: 기사 조회·초안 저장·이미지 업로드·검수 후 즉시 자동 공개</p><p>만료: {r.expires_at || '기한 없음'}</p>
      {r.revoked_at?<p>해제됨</p>:r.approved_at?<button type="button" onClick={()=>act('revoke',r.id)}>이 연결 해제</button>:<button type="button" disabled={code!==r.id||Date.parse(r.pair_expires_at)<Date.now()} onClick={()=>act('approve',r.id)}>이 PC 연결 승인</button>}
    </section>)}
  </details>;
}
