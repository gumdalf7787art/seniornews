import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarClock, CheckCircle2, FilePenLine, ImageUp, LoaderCircle, Pencil, Plus, Send, UploadCloud } from 'lucide-react';
import { categories } from '../data/articles';

const emptyForm = { title: '', slug: '', summary: '', category: 'health', body_text: '', image_url: '', image_alt: '', source_text: '' };
const statusLabel = { draft: '작성 중', review: '검수 요청', scheduled: '예약 발행', published: '공개 중', archived: '보관됨' };

function statusClass(status) {
  return `status status-${status || 'draft'}`;
}

function createBodyJson(bodyText) {
  return JSON.stringify({ type: 'doc', content: bodyText.split('\n').map((text) => text.trim()).filter(Boolean).map((text) => ({ type: 'paragraph', text })) });
}

export default function AdminPage({ user }) {
  const [items, setItems] = useState([]);
  const [view, setView] = useState('dashboard');
  const [filter, setFilter] = useState('all');
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const isCreator = user.role === 'admin';
  const displayRole = isCreator ? '제작자' : '관리자(기자)';

  const loadArticles = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/articles', { credentials: 'include' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message);
      setItems(data.articles || []);
    } catch (error) {
      setMessage(error.message || '기사 목록을 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const requestId = window.setTimeout(() => { void loadArticles(); }, 0);
    return () => window.clearTimeout(requestId);
  }, []);

  const filteredItems = useMemo(() => filter === 'all' ? items : items.filter((article) => article.status === filter), [items, filter]);
  const counts = useMemo(() => ({
    draft: items.filter((item) => item.status === 'draft').length,
    review: items.filter((item) => item.status === 'review').length,
    published: items.filter((item) => item.status === 'published').length,
  }), [items]);

  const update = (event) => setForm((current) => ({ ...current, [event.target.name]: event.target.value }));

  const makeSlug = (title) => {
    const latin = title.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
    return latin.length >= 3 ? latin : `article-${Date.now()}`;
  };

  const openNewArticle = () => {
    setForm(emptyForm);
    setEditingId(null);
    setMessage('');
    setView('editor');
  };

  const openEditor = (article) => {
    setForm({
      title: article.title || '', slug: article.slug || '', summary: article.summary || '', category: article.category_slug || 'health',
      body_text: article.body_text || '', image_url: article.image_url || '', image_alt: article.image_alt || '', source_text: article.source_text || '',
    });
    setEditingId(article.id);
    setMessage('');
    setView('editor');
  };

  const save = async (status) => {
    const payload = { ...form, slug: form.slug || makeSlug(form.title), status, body_json: createBodyJson(form.body_text) };
    if (payload.slug !== form.slug) setForm((current) => ({ ...current, slug: payload.slug }));
    if (!payload.title.trim() || !payload.summary.trim() || !payload.body_text.trim()) {
      setMessage('제목, 요약, 본문은 꼭 입력해 주세요.');
      return;
    }
    setSaving(true);
    setMessage(status === 'review' ? '검수를 요청하는 중입니다.' : '기사를 저장하는 중입니다.');
    try {
      const response = await fetch(editingId ? `/api/admin/articles/${editingId}` : '/api/admin/articles', {
        method: editingId ? 'PATCH' : 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'SeniorNews' }, body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message);
      setMessage(status === 'review' ? '검수 요청을 보냈습니다. 제작자가 확인 후 발행합니다.' : '기사를 임시 저장했습니다.');
      await loadArticles();
      setView('dashboard');
      setForm(emptyForm);
      setEditingId(null);
    } catch (error) {
      setMessage(error.message || '기사를 저장하지 못했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const publish = async (article) => {
    if (!window.confirm(`“${article.title}” 기사를 지금 공개할까요?`)) return;
    try {
      const response = await fetch(`/api/admin/articles/${article.id}/publish`, { method: 'POST', credentials: 'include', headers: { 'X-Requested-With': 'SeniorNews' } });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message);
      setMessage('기사를 공개했습니다.');
      await loadArticles();
    } catch (error) {
      setMessage(error.message || '기사를 발행하지 못했습니다.');
    }
  };

  const uploadImage = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!form.image_alt.trim()) { setMessage('이미지를 올리기 전에 이미지 설명을 먼저 입력해 주세요.'); event.target.value = ''; return; }
    const formData = new FormData();
    formData.append('file', file);
    formData.append('alt', form.image_alt.trim());
    setUploading(true);
    setMessage('이미지를 올리는 중입니다.');
    try {
      const response = await fetch('/api/admin/media', { method: 'POST', credentials: 'include', headers: { 'X-Requested-With': 'SeniorNews' }, body: formData });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message);
      setForm((current) => ({ ...current, image_url: data.url }));
      setMessage('대표 이미지를 올렸습니다.');
    } catch (error) {
      setMessage(error.message || '이미지를 올리지 못했습니다.');
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  };

  return <div className="container newsroom-admin">
    <div className="admin-hero">
      <div><p className="eyebrow">{displayRole} 업무 공간</p><h1>기사 관리 센터</h1><p>{isCreator ? '검수와 발행, 전체 기사 현황을 관리합니다.' : '기사를 작성하고 검수를 요청해 발행을 준비합니다.'}</p></div>
      <button className="primary-button" onClick={openNewArticle}><Plus size={20} />새 기사 작성</button>
    </div>

    {message && <p role="status" className="admin-notice">{message}</p>}

    <nav className="admin-tabs" aria-label="기사 관리 메뉴">
      <button className={view === 'dashboard' ? 'active' : ''} onClick={() => setView('dashboard')}>내 기사</button>
      <button className={view === 'editor' ? 'active' : ''} onClick={openNewArticle}>기사 작성</button>
      <Link to="/mypage">마이페이지</Link>
    </nav>

    {view === 'dashboard' ? <>
      <section className="editor-stat-grid" aria-label="기사 현황">
        <button onClick={() => setFilter('draft')}><FilePenLine /><strong>{counts.draft}</strong><span>작성 중</span></button>
        <button onClick={() => setFilter('review')}><Send /><strong>{counts.review}</strong><span>검수 요청</span></button>
        <button onClick={() => setFilter('published')}><CheckCircle2 /><strong>{counts.published}</strong><span>공개 중</span></button>
      </section>
      <section className="panel admin-list-panel">
        <div className="panel-heading"><div><h2>{isCreator ? '전체 기사' : '내 기사'}</h2><p>{isCreator ? '검수 요청된 기사를 확인하고 최종 발행할 수 있습니다.' : '임시 저장한 기사를 이어서 작성하거나 검수를 요청하세요.'}</p></div><button className="secondary-button" onClick={loadArticles}>새로고침</button></div>
        <div className="article-filter" aria-label="기사 상태 필터">{[{ id: 'all', label: '전체' }, { id: 'draft', label: '작성 중' }, { id: 'review', label: '검수 요청' }, { id: 'published', label: '공개 중' }].map((item) => <button key={item.id} className={filter === item.id ? 'active' : ''} onClick={() => setFilter(item.id)}>{item.label}</button>)}</div>
        {loading ? <p className="admin-loading"><LoaderCircle className="spin" />기사를 불러오는 중입니다.</p> : filteredItems.length ? <div className="editor-article-list">{filteredItems.map((article) => <article key={article.id} className="editor-article-row"><div className="editor-article-copy"><div><span className={statusClass(article.status)}>{statusLabel[article.status] || article.status}</span><span className="article-category-label">{article.category_name}</span></div><h3>{article.title}</h3><p>{article.summary}</p><small>마지막 수정 {String(article.updated_at || '').slice(0, 16).replace('T', ' ') || '-' }{isCreator && ` · 작성 ${article.author_name}`}</small></div><div className="editor-row-actions"><button className="secondary-button" onClick={() => openEditor(article)}><Pencil size={17} />수정</button>{isCreator && ['draft', 'review', 'scheduled'].includes(article.status) && <button className="primary-button" onClick={() => publish(article)}>발행</button>}{article.status === 'review' && !isCreator && <span className="review-waiting">제작자 검수 중</span>}</div></article>)}</div> : <div className="empty-state"><h3>{filter === 'all' ? '아직 작성한 기사가 없습니다.' : '해당 상태의 기사가 없습니다.'}</h3><p>새 기사를 작성해 임시 저장하거나 제작자에게 검수를 요청해 보세요.</p><button className="primary-button" onClick={openNewArticle}>새 기사 작성</button></div>}</section>
    </> : <section className="editor-layout"><form className="form-card article-editor-form" onSubmit={(event) => { event.preventDefault(); save('draft'); }}><div className="panel-heading"><div><h2>{editingId ? '기사 수정' : '새 기사 작성'}</h2><p>필수 항목을 작성한 뒤 임시 저장하거나 검수를 요청할 수 있습니다.</p></div><button type="button" className="text-button" onClick={() => setView('dashboard')}>목록으로</button></div><div className="field"><label htmlFor="title">기사 제목</label><input id="title" name="title" value={form.title} onChange={update} required maxLength={150} placeholder="독자가 바로 이해할 수 있는 제목을 입력하세요" /></div><div className="editor-form-grid"><div className="field"><label htmlFor="category">카테고리</label><select id="category" name="category" value={form.category} onChange={update}>{categories.map((category) => <option value={category.slug} key={category.slug}>{category.name}</option>)}</select></div><div className="field"><label htmlFor="slug">기사 주소</label><input id="slug" name="slug" value={form.slug} onChange={update} pattern="[a-z0-9-]+" placeholder="영문·숫자·하이픈 (비우면 자동 생성)" /></div></div><div className="field"><label htmlFor="summary">기사 요약</label><textarea id="summary" name="summary" value={form.summary} onChange={update} required maxLength={300} placeholder="기사 핵심 내용을 2~3문장으로 작성하세요" /></div><fieldset className="editor-image-field"><legend>대표 이미지</legend><div className="field"><label htmlFor="image_alt">이미지 설명 <span className="required-text">(필수)</span></label><input id="image_alt" name="image_alt" value={form.image_alt} onChange={update} required={Boolean(form.image_url)} placeholder="이미지에 보이는 내용을 설명해 주세요" /></div><div className="upload-row"><label className="secondary-button upload-label" htmlFor="image-file"><UploadCloud size={18} />{uploading ? '업로드 중' : '이미지 업로드'}</label><input id="image-file" type="file" accept="image/jpeg,image/png,image/webp" onChange={uploadImage} disabled={uploading} /><span>JPG·PNG·WEBP, 최대 5MB</span></div><div className="field"><label htmlFor="image_url">또는 이미지 주소</label><input id="image_url" name="image_url" type="url" value={form.image_url} onChange={update} placeholder="https://" /></div>{form.image_url && <img className="editor-image-preview" src={form.image_url} alt={form.image_alt || '대표 이미지 미리보기'} />}</fieldset><div className="field"><label htmlFor="source_text">자료·출처</label><input id="source_text" name="source_text" value={form.source_text} onChange={update} placeholder="예: 보건복지부 공개 자료" /></div><div className="field"><label htmlFor="body_text">기사 본문</label><textarea id="body_text" name="body_text" value={form.body_text} onChange={update} required className="article-body-input" placeholder="문단을 나누어 작성하세요. 한 줄을 비우면 새 문단으로 저장됩니다." /></div><div className="editor-submit-actions"><button className="secondary-button" type="submit" disabled={saving}><FilePenLine size={18} />임시 저장</button><button className="primary-button" type="button" disabled={saving} onClick={() => save('review')}><Send size={18} />검수 요청</button></div></form><aside className="editor-guide"><div><ImageUp size={24} /><h2>작성 전 확인</h2><ul><li>제목과 요약은 쉬운 말로 씁니다.</li><li>대표 이미지에는 설명을 꼭 입력합니다.</li><li>건강·금융 기사는 출처를 기록합니다.</li><li>검수 요청 후 제작자가 최종 발행합니다.</li></ul></div><div><CalendarClock size={24} /><h2>발행 흐름</h2><ol><li>임시 저장</li><li>검수 요청</li><li>제작자 검토</li><li>공개 또는 수정 요청</li></ol></div></aside></section>}
  </div>;
}
