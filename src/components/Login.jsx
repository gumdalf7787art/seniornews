import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';

export default function Login({ setIsLoggedIn }) {
  const navigate = useNavigate(); const [params] = useSearchParams();
  const [form, setForm] = useState({ email: '', password: '' }); const [error, setError] = useState(''); const [loading, setLoading] = useState(false);
  const oauth = async (provider) => {
    try { const response = await fetch(`/api/auth/start?provider=${provider}`); const data = await response.json(); if (!response.ok) throw new Error(data.message); window.location.href = data.authorizationUrl; }
    catch (err) { setError(err.message || '소셜 로그인을 시작하지 못했습니다.'); }
  };
  const submit = async (event) => { event.preventDefault(); setLoading(true); setError(''); try { const response = await fetch('/api/login', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'SeniorNews' }, body: JSON.stringify(form) }); const data = await response.json(); if (!response.ok) throw new Error(data.message); setIsLoggedIn(data.user); navigate(params.get('next') || '/'); } catch (err) { setError(err.message || '로그인하지 못했습니다.'); } finally { setLoading(false); } };
  return <main className="auth-shell"><section className="auth-card"><Link className="brand auth-brand" to="/"><span className="brand-mark">시</span><strong>시니어 라이프 뉴스</strong></Link><h1>로그인</h1><div className="social-grid"><button onClick={() => oauth('kakao')}>카카오</button><button onClick={() => oauth('naver')}>네이버</button><button onClick={() => oauth('google')}>구글</button></div><div className="auth-divider">또는 이메일로</div><form onSubmit={submit}><div className="field"><label htmlFor="email">이메일</label><input id="email" type="email" autoComplete="email" required value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></div><div className="field"><label htmlFor="password">비밀번호</label><input id="password" type="password" autoComplete="current-password" required value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} /></div>{error && <p className="form-error" role="alert">{error}</p>}<button className="primary-button" style={{ width: '100%' }} disabled={loading}>{loading ? '확인 중…' : '로그인'}</button></form><p style={{ textAlign: 'center' }}><Link to="/reset-password">비밀번호를 잊으셨나요?</Link></p><p style={{ textAlign: 'center', marginTop: 24 }}>처음 오셨나요? <Link to="/signup"><strong>회원가입</strong></Link></p></section></main>;
}
