import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarClock, CheckCircle2, FilePenLine, ImageUp, LoaderCircle, Pencil, Plus, Send, UploadCloud } from 'lucide-react';
import { categories } from '../data/articles';
import ArticleBlockEditor, { blocksFromArticle, createTextBlock, serializeBlocks } from '../components/ArticleBlockEditor';

const emptyForm = { title: '', slug: '', summary: '', category: 'health', blocks: [createTextBlock()], image_url: '', image_alt: '', source_text: '' };
const statusLabel = { draft: '작성 중', review: '발행 요청', scheduled: '예약 발행', published: '공개 중', archived: '보관됨' };

function statusClass(status) {
  return `status status-${status || 'draft'}`;
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
  const [pendingImage, setPendingImage] = useState(null);
  const [uploadingBlockId, setUploadingBlockId] = useState(null);

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
    if (form.image_url?.startsWith('blob:')) URL.revokeObjectURL(form.image_url);
    setForm(emptyForm);
    setPendingImage(null);
    setEditingId(null);
    setMessage('');
    setView('editor');
  };

  const openEditor = (article) => {
    if (form.image_url?.startsWith('blob:')) URL.revokeObjectURL(form.image_url);
    setForm({
      title: article.title || '', slug: article.slug || '', summary: article.summary || '', category: article.category_slug || 'health',
      blocks: blocksFromArticle(article), image_url: article.image_url || '', image_alt: article.image_alt || '', source_text: article.source_text || '',
    });
    setEditingId(article.id);
    setPendingImage(null);
    setMessage('');
    setView('editor');
  };

  const save = async (status) => {
    if (uploading || uploadingBlockId) {
      setMessage('이미지 업로드가 끝난 뒤 저장 또는 발행해 주세요.');
      return;
    }
    const { bodyJson, bodyText } = serializeBlocks(form.blocks);
    const payload = { ...form, slug: form.slug || makeSlug(form.title), status, body_json: bodyJson, body_text: bodyText };
    if (payload.slug !== form.slug) setForm((current) => ({ ...current, slug: payload.slug }));
    if (!payload.title.trim() || !payload.summary.trim() || !payload.body_text.trim()) {
      setMessage('제목, 요약, 본문은 꼭 입력해 주세요.');
      return;
    }
    if (payload.image_url && !payload.image_alt.trim()) {
      setMessage('대표 이미지를 사용하려면 이미지 설명을 입력해 주세요.');
      return;
    }
    if (form.blocks.some((block) => block.type === 'image' && block.url && !block.alt.trim())) {
      setMessage('본문 이미지를 사용하려면 각 이미지의 설명을 입력해 주세요.');
      return;
    }
    if (status === 'published' && !window.confirm(editingId ? '수정한 내용을 반영하고 지금 바로 발행할까요?' : '이 기사를 지금 바로 발행할까요?')) return;
    setSaving(true);
    setMessage(status === 'review' ? '발행을 요청하는 중입니다.' : status === 'published' ? '기사를 발행하는 중입니다.' : '기사를 저장하는 중입니다.');
    try {
      if (pendingImage) {
        setUploading(true);
        setMessage('대표 이미지를 저장소에 올리는 중입니다. 잠시만 기다려 주세요.');
        const imageData = new FormData();
        imageData.append('file', pendingImage);
        imageData.append('alt', form.image_alt.trim());
        const imageResponse = await fetch('/api/admin/media', { method: 'POST', credentials: 'include', headers: { 'X-Requested-With': 'SeniorNews' }, body: imageData });
        const imageResult = await imageResponse.json().catch(() => ({ message: '이미지 서버 응답을 확인하지 못했습니다.' }));
        if (!imageResponse.ok || !imageResult.url) throw new Error(imageResult.message || '이미지를 저장하지 못했습니다.');
        payload.image_url = imageResult.url;
      }
      const response = await fetch(editingId ? `/api/admin/articles/${editingId}` : '/api/admin/articles', {
        method: editingId ? 'PATCH' : 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'SeniorNews' }, body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message);
      setMessage(status === 'review' ? '발행 요청을 보냈습니다. 제작자가 바로 발행하거나 수정 후 발행할 수 있습니다.' : status === 'published' ? '기사를 바로 발행했습니다.' : '기사를 임시 저장했습니다.');
      await loadArticles();
      setView('dashboard');
      if (form.image_url?.startsWith('blob:')) URL.revokeObjectURL(form.image_url);
      setForm(emptyForm);
      setPendingImage(null);
      setEditingId(null);
    } catch (error) {
      setMessage(error.message || '기사를 저장하지 못했습니다.');
    } finally {
      setSaving(false);
      setUploading(false);
    }
  };

  const publish = async (article) => {
    if (!window.confirm(`“${article.title}” 기사를 지금 ${isCreator ? '발행' : '직접 발행'}할까요?`)) return;
    try {
      const response = await fetch(`/api/admin/articles/${article.id}/publish`, { method: 'POST', credentials: 'include', headers: { 'X-Requested-With': 'SeniorNews' } });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message);
      setMessage(isCreator ? '기사를 발행했습니다.' : '기사를 직접 발행했습니다.');
      await loadArticles();
    } catch (error) {
      setMessage(error.message || '기사를 발행하지 못했습니다.');
    }
  };

  const uploadImage = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setMessage('JPG, PNG, WEBP 이미지 파일만 첨부할 수 있습니다.');
      event.target.value = '';
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setMessage('이미지 용량은 5MB 이하로 줄여서 첨부해 주세요.');
      event.target.value = '';
      return;
    }
    if (form.image_url?.startsWith('blob:')) URL.revokeObjectURL(form.image_url);
    const previewUrl = URL.createObjectURL(file);
    setForm((current) => ({ ...current, image_url: previewUrl }));
    setPendingImage(file);
    setMessage(`“${file.name}” 이미지가 첨부되었습니다. 썸네일을 확인하고 저장 또는 발행 요청을 눌러 주세요.`);
    event.target.value = '';
  };

  const uploadInlineImage = async (block, event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    formData.append('alt', block.alt.trim() || '본문 이미지 설명 미입력');
    setUploadingBlockId(block.id);
    setMessage('본문 이미지를 업로드하는 중입니다.');
    try {
      const response = await fetch('/api/admin/media', { method: 'POST', credentials: 'include', headers: { 'X-Requested-With': 'SeniorNews' }, body: formData });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message);
      setForm((current) => ({ ...current, blocks: current.blocks.map((item) => item.id === block.id ? { ...item, url: data.url } : item) }));
      setMessage('본문 이미지 첨부가 완료되었습니다. 이미지 설명을 입력한 뒤 저장해 주세요.');
    } catch (error) {
      setMessage(error.message || '본문 이미지를 업로드하지 못했습니다.');
    } finally {
      setUploadingBlockId(null);
      event.target.value = '';
    }
  };

  return <div className="container newsroom-admin">
    <div className="admin-hero">
      <div><p className="eyebrow">{displayRole} 업무 공간</p><h1>기사 관리 센터</h1><p>{isCreator ? '발행 요청을 확인하고, 필요한 수정 후 바로 발행합니다.' : '기사를 작성해 발행 요청하거나 직접 발행할 수 있습니다.'}</p></div>
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
        <button onClick={() => setFilter('review')}><Send /><strong>{counts.review}</strong><span>발행 요청</span></button>
        <button onClick={() => setFilter('published')}><CheckCircle2 /><strong>{counts.published}</strong><span>공개 중</span></button>
      </section>
      <section className="panel admin-list-panel">
        <div className="panel-heading"><div><h2>{isCreator ? '전체 기사' : '내 기사'}</h2><p>{isCreator ? '발행 요청 기사를 바로 발행하거나 수정 후 발행할 수 있습니다.' : '임시 저장, 발행 요청, 직접 발행을 선택할 수 있습니다.'}</p></div><button className="secondary-button" onClick={loadArticles}>새로고침</button></div>
        <div className="article-filter" aria-label="기사 상태 필터">{[{ id: 'all', label: '전체' }, { id: 'draft', label: '작성 중' }, { id: 'review', label: '발행 요청' }, { id: 'published', label: '공개 중' }].map((item) => <button key={item.id} className={filter === item.id ? 'active' : ''} onClick={() => setFilter(item.id)}>{item.label}</button>)}</div>
        {loading ? <p className="admin-loading"><LoaderCircle className="spin" />기사를 불러오는 중입니다.</p> : filteredItems.length ? <div className="editor-article-list">{filteredItems.map((article) => <article key={article.id} className="editor-article-row"><div className="editor-article-copy"><div><span className={statusClass(article.status)}>{statusLabel[article.status] || article.status}</span><span className="article-category-label">{article.category_name}</span></div><h3>{article.title}</h3><p>{article.summary}</p><small>마지막 수정 {String(article.updated_at || '').slice(0, 16).replace('T', ' ') || '-' }{isCreator && ` · 작성 ${article.author_name}`}</small></div><div className="editor-row-actions"><button className="secondary-button" onClick={() => openEditor(article)}><Pencil size={17} />수정</button>{['draft', 'review', 'scheduled'].includes(article.status) && <button className="primary-button" onClick={() => publish(article)}>{isCreator ? '발행' : '직접 발행'}</button>}{article.status === 'review' && !isCreator && <span className="review-waiting">제작자 발행 대기</span>}</div></article>)}</div> : <div className="empty-state"><h3>{filter === 'all' ? '아직 작성한 기사가 없습니다.' : '해당 상태의 기사가 없습니다.'}</h3><p>새 기사를 작성해 임시 저장, 발행 요청 또는 직접 발행해 보세요.</p><button className="primary-button" onClick={openNewArticle}>새 기사 작성</button></div>}</section>
    </> : <section className="editor-layout"><form className="form-card article-editor-form" onSubmit={(event) => { event.preventDefault(); save('draft'); }}><div className="panel-heading"><div><h2>{editingId ? '기사 수정' : '새 기사 작성'}</h2><p>블록을 추가해 문단, 소제목, 인용문, 이미지를 원하는 순서로 작성하세요.</p></div><button type="button" className="text-button" onClick={() => setView('dashboard')}>목록으로</button></div><div className="field"><label htmlFor="title">기사 제목</label><input id="title" name="title" value={form.title} onChange={update} required maxLength={150} placeholder="독자가 바로 이해할 수 있는 제목을 입력하세요" /></div><div className="editor-form-grid"><div className="field"><label htmlFor="category">카테고리</label><select id="category" name="category" value={form.category} onChange={update}>{categories.map((category) => <option value={category.slug} key={category.slug}>{category.name}</option>)}</select></div><div className="field"><label htmlFor="slug">기사 주소</label><input id="slug" name="slug" value={form.slug} onChange={update} pattern="[a-z0-9-]+" placeholder="영문·숫자·하이픈 (비우면 자동 생성)" /></div></div><div className="field"><label htmlFor="summary">기사 한눈에 보기</label><textarea id="summary" name="summary" value={form.summary} onChange={update} required maxLength={300} placeholder="목록과 공유 화면에 보일 핵심 내용을 2~3문장으로 작성하세요" /></div><fieldset className="editor-image-field"><legend>대표 이미지</legend><div className="field"><label htmlFor="image_alt">이미지 설명 <span className="required-text">(이미지 사용 시 필수)</span></label><input id="image_alt" name="image_alt" value={form.image_alt} onChange={update} required={Boolean(form.image_url)} placeholder="이미지에 보이는 내용을 설명해 주세요" /></div><div className="upload-row"><label className="secondary-button upload-label" htmlFor="image-file"><UploadCloud size={18} />{uploading ? '업로드 중' : '이미지 업로드'}</label><input id="image-file" type="file" accept="image/jpeg,image/png,image/webp" onChange={uploadImage} disabled={uploading} /><span>JPG·PNG·WEBP, 최대 5MB</span></div><div className="field"><label htmlFor="image_url">또는 이미지 주소</label><input id="image_url" name="image_url" type="url" value={form.image_url} onChange={update} placeholder="https://" /></div>{form.image_url && <img className="editor-image-preview" src={form.image_url} alt={form.image_alt || '대표 이미지 미리보기'} />}</fieldset><div className="field"><label htmlFor="source_text">자료·출처</label><input id="source_text" name="source_text" value={form.source_text} onChange={update} placeholder="예: 보건복지부 공개 자료" /></div><div className="field"><label>기사 본문</label><ArticleBlockEditor blocks={form.blocks} onChange={(blocks) => setForm((current) => ({ ...current, blocks }))} onUploadImage={uploadInlineImage} uploadingBlockId={uploadingBlockId} /></div><div className="editor-submit-actions"><button className="secondary-button" type="submit" disabled={saving}><FilePenLine size={18} />임시 저장</button><button className="primary-button" type="button" disabled={saving} onClick={() => save('review')}><Send size={18} />발행 요청</button></div></form><aside className="editor-guide"><div><ImageUp size={24} /><h2>작성 전 확인</h2><ul><li>대표·본문 이미지에는 설명을 꼭 입력합니다.</li><li>본문 이미지에는 캡션을 추가할 수 있습니다.</li><li>건강·금융 기사는 출처를 기록합니다.</li><li>발행 요청 전 필수 항목을 자동 확인합니다.</li></ul></div><div><CalendarClock size={24} /><h2>발행 흐름</h2><ol><li>임시 저장</li><li>발행 요청</li><li>제작자 발행 또는 직접 발행</li></ol></div></aside></section>}
  </div>;
}
