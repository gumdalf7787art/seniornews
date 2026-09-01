import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Bookmark, Clock3, Eye, LogOut, Trash2, UserRound } from 'lucide-react';
import ArticleCard from '../components/ArticleCard';
import { clearRecentArticles, getRecentArticles } from '../utils/readerPreferences';

const ROLE_LABELS = { reader: '일반회원', editor: '기자', admin: '관리자' };

function asArticle(bookmark) {
  return {
    id: bookmark.article_id,
    slug: bookmark.slug,
    title: bookmark.title,
    summary: bookmark.summary || '',
    image: bookmark.image_url || '',
    imageAlt: bookmark.image_alt || '',
    category: bookmark.category_slug || 'health',
    author: bookmark.author_name || '시니어 라이프 뉴스',
    publishedAt: bookmark.published_at || bookmark.created_at || '',
  };
}

function EmptyState({ title, description, action, children }) {
  return <div className="empty-state mypage-empty"><h3>{title}</h3><p>{description}</p>{action}{children}</div>;
}

export default function MyPage({ user, setUser }) {
  const navigate = useNavigate();
  const [tab, setTab] = useState('overview');
  const [bookmarks, setBookmarks] = useState([]);
  const [recentArticles, setRecentArticles] = useState(() => getRecentArticles());
  const [loading, setLoading] = useState(true);
  const [accountName, setAccountName] = useState(user.name || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [accountFeedback, setAccountFeedback] = useState('');
  const [accountError, setAccountError] = useState(false);
  const [savingAccount, setSavingAccount] = useState(false);

  const bookmarkedArticles = useMemo(() => bookmarks.map(asArticle), [bookmarks]);

  useEffect(() => {
    fetch('/api/bookmarks', { credentials: 'include' })
      .then((res) => res.ok ? res.json() : { bookmarks: [] })
      .then((data) => setBookmarks(data.bookmarks || []))
      .catch(() => setBookmarks([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => setAccountName(user.name || ''), [user.name]);

  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include', headers: { 'X-Requested-With': 'SeniorNews' } });
    setUser(null);
    navigate('/');
  };

  const withdraw = async () => {
    if (!window.confirm('회원 정보를 삭제할까요? 저장한 기사도 함께 삭제되며 되돌릴 수 없습니다.')) return;
    const response = await fetch('/api/withdraw', { method: 'POST', credentials: 'include', headers: { 'X-Requested-With': 'SeniorNews' } });
    if (response.ok) { setUser(null); navigate('/'); }
    else window.alert('회원 탈퇴를 처리하지 못했습니다.');
  };

  const removeBookmark = async (articleId) => {
    try {
      const response = await fetch(`/api/bookmarks/${articleId}`, { method: 'DELETE', credentials: 'include', headers: { 'X-Requested-With': 'SeniorNews' } });
      if (!response.ok) throw new Error();
      setBookmarks((current) => current.filter((bookmark) => Number(bookmark.article_id) !== articleId));
    } catch {
      window.alert('저장한 기사를 삭제하지 못했습니다. 잠시 후 다시 시도해 주세요.');
    }
  };

  const clearRecent = () => {
    clearRecentArticles();
    setRecentArticles([]);
  };

  const updateAccount = async (payload) => {
    const response = await fetch('/api/account', {
      method: 'PATCH', credentials: 'include',
      headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'SeniorNews' },
      body: JSON.stringify(payload),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.message || '계정 정보를 변경하지 못했습니다.');
    return data;
  };

  const submitNameChange = async (event) => {
    event.preventDefault();
    const name = accountName.trim();
    if (name.length < 2) { setAccountError(true); setAccountFeedback('이름은 두 글자 이상 입력해 주세요.'); return; }
    setSavingAccount(true); setAccountFeedback('');
    try {
      const data = await updateAccount({ action: 'profile', name });
      setUser(data.user);
      setAccountError(false); setAccountFeedback('이름을 변경했습니다.');
    } catch (error) { setAccountError(true); setAccountFeedback(error.message); }
    finally { setSavingAccount(false); }
  };

  const submitPasswordChange = async (event) => {
    event.preventDefault();
    if (newPassword.length < 10) { setAccountError(true); setAccountFeedback('새 비밀번호는 10자 이상 입력해 주세요.'); return; }
    if (newPassword !== passwordConfirm) { setAccountError(true); setAccountFeedback('새 비밀번호와 확인 입력이 일치하지 않습니다.'); return; }
    setSavingAccount(true); setAccountFeedback('');
    try {
      await updateAccount({ action: 'password', currentPassword, newPassword });
      setCurrentPassword(''); setNewPassword(''); setPasswordConfirm('');
      setAccountError(false); setAccountFeedback('비밀번호를 변경했습니다. 다음 로그인부터 새 비밀번호를 사용해 주세요.');
    } catch (error) { setAccountError(true); setAccountFeedback(error.message); }
    finally { setSavingAccount(false); }
  };

  const tabItems = [
    { id: 'overview', label: '내 뉴스', icon: Eye },
    { id: 'bookmarks', label: '저장한 기사', icon: Bookmark },
    { id: 'recent', label: '최근 본 기사', icon: Clock3 },
    { id: 'account', label: '회원정보·계정', icon: UserRound },
  ];

  return <div className="container mypage">
    <div className="mypage-welcome">
      <div><p className="eyebrow">나의 시니어 라이프 뉴스</p><h1>{user.name}님, 반갑습니다.</h1><p>필요한 뉴스를 저장하고, 편한 방식으로 읽어보세요.</p></div>
      <span className="role-badge">{ROLE_LABELS[user.role] || '일반회원'}</span>
    </div>

    <div className="mypage-layout">
      <nav className="profile-nav" aria-label="마이페이지 메뉴">
        {tabItems.map(({ id, label, icon: Icon }) => <button key={id} className={tab === id ? 'active' : ''} onClick={() => setTab(id)}><Icon size={19} aria-hidden="true" />{label}</button>)}
        {user.role === 'admin' && <Link className="primary-button" to="/creator">관리자 운영센터</Link>}
        {['editor', 'admin'].includes(user.role) && <Link className="secondary-button" to="/admin">기사 관리로 이동</Link>}
      </nav>

      <section className="panel mypage-panel">
        {tab === 'overview' && <>
          <div className="panel-heading"><div><h2>내 뉴스</h2><p>저장한 기사와 최근 읽은 기사를 한눈에 확인하세요.</p></div></div>
          <div className="member-stats member-stats-two" aria-label="내 뉴스 요약">
            <button onClick={() => setTab('bookmarks')}><Bookmark aria-hidden="true" /><strong>{loading ? '-' : bookmarkedArticles.length}</strong><span>저장한 기사</span></button>
            <button onClick={() => setTab('recent')}><Clock3 aria-hidden="true" /><strong>{recentArticles.length}</strong><span>최근 본 기사</span></button>
          </div>
          <div className="mypage-overview-grid mypage-overview-single">
            <section><div className="subsection-heading"><h3>최근 본 기사</h3><button className="text-button" onClick={() => setTab('recent')}>전체 보기</button></div>{recentArticles.length ? <div className="mypage-list">{recentArticles.slice(0, 3).map((article) => <Link key={article.slug} to={`/article/${article.slug}`}><span>{article.title}</span><time>{article.publishedAt?.slice(0, 10)}</time></Link>)}</div> : <p className="muted-copy">아직 읽은 기사가 없습니다.</p>}</section>
          </div>
        </>}

        {tab === 'bookmarks' && <><div className="panel-heading"><div><h2>저장한 기사</h2><p>나중에 다시 읽고 싶은 기사를 모아보세요.</p></div><span className="count-label">{loading ? '' : `${bookmarkedArticles.length}개`}</span></div>{loading ? <p>저장한 기사를 불러오는 중입니다.</p> : bookmarkedArticles.length ? <div className="saved-article-list">{bookmarkedArticles.map((article) => <div key={article.id} className="saved-article"><ArticleCard article={article} compact /><button className="icon-text-button" onClick={() => removeBookmark(article.id)} aria-label={`${article.title} 저장 해제`}><Trash2 size={18} />저장 해제</button></div>)}</div> : <EmptyState title="아직 저장한 기사가 없습니다." description="기사 화면의 ‘기사 저장’ 버튼을 누르면 이곳에서 다시 볼 수 있습니다." action={<Link className="primary-button" to="/">뉴스 둘러보기</Link>} />}</>}

        {tab === 'recent' && <><div className="panel-heading"><div><h2>최근 본 기사</h2><p>이 기기에서 최근에 읽은 기사입니다.</p></div>{recentArticles.length > 0 && <button className="text-button" onClick={clearRecent}>기록 지우기</button>}</div>{recentArticles.length ? <div className="saved-article-list">{recentArticles.map((article) => <div key={article.slug} className="saved-article"><ArticleCard article={article} compact /><time className="viewed-date">읽은 시간 {new Date(article.viewedAt).toLocaleDateString('ko-KR')}</time></div>)}</div> : <EmptyState title="최근 본 기사가 없습니다." description="기사를 읽으면 최근 본 기사 목록에 자동으로 표시됩니다." action={<Link className="primary-button" to="/">뉴스 둘러보기</Link>} />}</>}

        {tab === 'account' && <><div className="panel-heading"><div><h2>회원정보·계정</h2><p>이름과 비밀번호를 직접 관리할 수 있습니다.</p></div></div><div className="account-details"><div><span>이메일</span><strong>{user.email || '-'}</strong></div><div><span>회원 구분</span><strong>{ROLE_LABELS[user.role] || '일반회원'}</strong></div></div><div className="account-forms"><form onSubmit={submitNameChange}><h3>이름 변경</h3><label className="field"><span>이름</span><input value={accountName} onChange={(event) => setAccountName(event.target.value)} maxLength="40" required /></label><button className="secondary-button" disabled={savingAccount}>이름 저장</button></form><form onSubmit={submitPasswordChange}><h3>비밀번호 변경</h3><label className="field"><span>현재 비밀번호</span><input type="password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} autoComplete="current-password" required /></label><label className="field"><span>새 비밀번호</span><input type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} autoComplete="new-password" minLength="10" required /></label><label className="field"><span>새 비밀번호 확인</span><input type="password" value={passwordConfirm} onChange={(event) => setPasswordConfirm(event.target.value)} autoComplete="new-password" minLength="10" required /></label><small>영문·숫자를 포함해 10자 이상 사용해 주세요.</small><button className="primary-button" disabled={savingAccount}>비밀번호 변경</button></form></div>{accountFeedback && <p className={`account-feedback ${accountError ? 'error' : ''}`} role="status">{accountFeedback}</p>}<div className="account-actions"><button className="secondary-button" onClick={logout}><LogOut size={18} />로그아웃</button><button className="danger-button" onClick={withdraw}>회원 탈퇴</button></div></>}
      </section>
    </div>
  </div>;
}
