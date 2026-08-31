import { useState } from 'react';
import { articles as initialArticles, categories } from '../data/articles';

const emptyForm = { title: '', slug: '', summary: '', category: 'health', body_text: '', image_url: '', image_alt: '', status: 'draft' };

export default function AdminPage({ user }) {
  const [items, setItems] = useState(initialArticles);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [message, setMessage] = useState('');
  const update = (event) => setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  const autoSlug = (title) => title.toLowerCase().trim().replace(/[^a-z0-9가-힣\s-]/g, '').replace(/[가-힣]+/g, '').replace(/\s+/g, '-').replace(/-+/g, '-');

  const save = async (event) => {
    event.preventDefault(); setMessage('저장 중입니다.');
    const payload = { ...form, slug: form.slug || autoSlug(form.title), body_json: JSON.stringify({ type: 'doc', content: form.body_text.split('\n').filter(Boolean).map((text) => ({ type: 'paragraph', text })) }) };
    try {
      const response = await fetch('/api/admin/articles', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'SeniorNews' }, body: JSON.stringify(payload) });
      const data = await response.json(); if (!response.ok) throw new Error(data.message);
      setItems((current) => [{ ...payload, id: data.id, author: user.name, publishedAt: '미발행', views: 0, image: payload.image_url, imageAlt: payload.image_alt }, ...current]);
      setForm(emptyForm); setEditing(false); setMessage('기사를 임시 저장했습니다.');
    } catch (error) { setMessage(error.message || '저장하지 못했습니다.'); }
  };

  const publish = async (id) => {
    if (!confirm('이 기사를 지금 발행할까요?')) return;
    const response = await fetch(`/api/admin/articles/${id}/publish`, { method: 'POST', credentials: 'include', headers: { 'X-Requested-With': 'SeniorNews' } });
    if (response.ok) { setMessage('기사를 발행했습니다.'); setItems((current) => current.map((item) => item.id === id ? { ...item, status: 'published' } : item)); } else setMessage('발행하지 못했습니다. 권한과 입력 내용을 확인하세요.');
  };

  return <div className="container"><div className="section-heading"><h1>기사 관리</h1><button className="primary-button" onClick={() => setEditing((value) => !value)}>{editing ? '목록으로' : '새 기사 작성'}</button></div>{message && <p role="status" className="panel">{message}</p>}{editing ? <form className="form-card" onSubmit={save}><div className="field"><label htmlFor="title">기사 제목</label><input id="title" name="title" value={form.title} onChange={update} required maxLength={150} /></div><div className="field"><label htmlFor="slug">영문 주소</label><input id="slug" name="slug" value={form.slug} onChange={update} pattern="[a-z0-9-]+" placeholder="비워두면 제목에서 자동 생성" /></div><div className="field"><label htmlFor="summary">기사 요약</label><textarea id="summary" name="summary" value={form.summary} onChange={update} required maxLength={300} /></div><div className="field"><label htmlFor="category">카테고리</label><select id="category" name="category" value={form.category} onChange={update}>{categories.map((category) => <option value={category.slug} key={category.slug}>{category.name}</option>)}</select></div><div className="field"><label htmlFor="image_url">대표 이미지 주소</label><input id="image_url" name="image_url" type="url" value={form.image_url} onChange={update} /></div><div className="field"><label htmlFor="image_alt">이미지 설명</label><input id="image_alt" name="image_alt" value={form.image_alt} onChange={update} required={Boolean(form.image_url)} /></div><div className="field"><label htmlFor="body_text">기사 본문</label><textarea id="body_text" name="body_text" value={form.body_text} onChange={update} required style={{ minHeight: 350 }} /></div><div style={{ display: 'flex', gap: 10 }}><button className="primary-button" type="submit">임시 저장</button><button className="secondary-button" type="button" onClick={() => window.open('/article/senior-welfare-guide-2026', '_blank')}>화면 미리보기</button></div></form> : <div className="panel"><table className="admin-table"><thead><tr><th>제목</th><th>상태</th><th>작성자</th><th>관리</th></tr></thead><tbody>{items.map((article) => <tr key={article.id}><td>{article.title}</td><td><span className="status">{article.status || 'published'}</span></td><td>{article.author}</td><td>{(article.status && article.status !== 'published' && user.role === 'admin') ? <button className="secondary-button" onClick={() => publish(article.id)}>발행</button> : (article.status && article.status !== 'published' ? '검수 대기' : '공개 중')}</td></tr>)}</tbody></table></div>}</div>;
}
