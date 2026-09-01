import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Bookmark, Clock3, Eye, Heart, LogOut, Trash2, UserRound } from 'lucide-react';
import ArticleCard from '../components/ArticleCard';
import { categories } from '../data/articles';
import {
  clearRecentArticles,
  getInterestedCategories,
  getReaderSettings,
  getRecentArticles,
  saveInterestedCategories,
  saveReaderSettings,
} from '../utils/readerPreferences';

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
  const [interests, setInterests] = useState(() => getInterestedCategories());
  const [readerSettings, setReaderSettings] = useState(() => getReaderSettings());
  const [loading, setLoading] = useState(true);

  const bookmarkedArticles = useMemo(() => bookmarks.map(asArticle), [bookmarks]);

  useEffect(() => {
    fetch('/api/bookmarks', { credentials: 'include' })
      .then((res) => res.ok ? res.json() : { bookmarks: [] })
      .then((data) => setBookmarks(data.bookmarks || []))
      .catch(() => setBookmarks([]))
      .finally(() => setLoading(false));
  }, []);

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

  const toggleInterest = (slug) => {
    const next = interests.includes(slug) ? interests.filter((item) => item !== slug) : [...interests, slug];
    setInterests(next);
    saveInterestedCategories(next);
  };

  const updateReaderSetting = (key, value) => {
    const next = { ...readerSettings, [key]: value };
    setReaderSettings(next);
    saveReaderSettings(next);
  };

  const clearRecent = () => {
    clearRecentArticles();
    setRecentArticles([]);
  };

  const tabItems = [
    { id: 'overview', label: '내 뉴스', icon: Eye },
    { id: 'bookmarks', label: '저장한 기사', icon: Bookmark },
    { id: 'recent', label: '최근 본 기사', icon: Clock3 },
    { id: 'preferences', label: '관심·읽기 설정', icon: Heart },
    { id: 'account', label: '회원정보·계정', icon: UserRound },
  ];

  const readingSettings = <div className="preference-list" aria-label="읽기 설정">
    <label className="preference-row"><span><strong>큰 글씨로 보기</strong><small>본문과 화면의 글자를 더 크게 표시합니다.</small></span><input type="checkbox" checked={readerSettings.largeText} onChange={(event) => updateReaderSetting('largeText', event.target.checked)} /></label>
    <label className="preference-row"><span><strong>고대비 화면</strong><small>글자와 배경의 대비를 높여 더 선명하게 봅니다.</small></span><input type="checkbox" checked={readerSettings.highContrast} onChange={(event) => updateReaderSetting('highContrast', event.target.checked)} /></label>
  </div>;

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
          <div className="member-stats" aria-label="내 뉴스 요약">
            <button onClick={() => setTab('bookmarks')}><Bookmark aria-hidden="true" /><strong>{loading ? '-' : bookmarkedArticles.length}</strong><span>저장한 기사</span></button>
            <button onClick={() => setTab('recent')}><Clock3 aria-hidden="true" /><strong>{recentArticles.length}</strong><span>최근 본 기사</span></button>
            <button onClick={() => setTab('preferences')}><Heart aria-hidden="true" /><strong>{interests.length}</strong><span>관심 카테고리</span></button>
          </div>
          <div className="mypage-overview-grid">
            <section><div className="subsection-heading"><h3>최근 본 기사</h3><button className="text-button" onClick={() => setTab('recent')}>전체 보기</button></div>{recentArticles.length ? <div className="mypage-list">{recentArticles.slice(0, 3).map((article) => <Link key={article.slug} to={`/article/${article.slug}`}><span>{article.title}</span><time>{article.publishedAt?.slice(0, 10)}</time></Link>)}</div> : <p className="muted-copy">아직 읽은 기사가 없습니다.</p>}</section>
            <section><div className="subsection-heading"><h3>관심 카테고리</h3><button className="text-button" onClick={() => setTab('preferences')}>설정</button></div>{interests.length ? <div className="interest-summary">{categories.filter((category) => interests.includes(category.slug)).map((category) => <Link key={category.slug} to={`/category/${category.slug}`}>{category.name}</Link>)}</div> : <p className="muted-copy">관심 있는 분야를 선택하면 나에게 맞는 뉴스를 찾기 쉬워집니다.</p>}</section>
          </div>
        </>}

        {tab === 'bookmarks' && <><div className="panel-heading"><div><h2>저장한 기사</h2><p>나중에 다시 읽고 싶은 기사를 모아보세요.</p></div><span className="count-label">{loading ? '' : `${bookmarkedArticles.length}개`}</span></div>{loading ? <p>저장한 기사를 불러오는 중입니다.</p> : bookmarkedArticles.length ? <div className="saved-article-list">{bookmarkedArticles.map((article) => <div key={article.id} className="saved-article"><ArticleCard article={article} compact /><button className="icon-text-button" onClick={() => removeBookmark(article.id)} aria-label={`${article.title} 저장 해제`}><Trash2 size={18} />저장 해제</button></div>)}</div> : <EmptyState title="아직 저장한 기사가 없습니다." description="기사 화면의 ‘기사 저장’ 버튼을 누르면 이곳에서 다시 볼 수 있습니다." action={<Link className="primary-button" to="/">뉴스 둘러보기</Link>} />}</>}

        {tab === 'recent' && <><div className="panel-heading"><div><h2>최근 본 기사</h2><p>이 기기에서 최근에 읽은 기사입니다.</p></div>{recentArticles.length > 0 && <button className="text-button" onClick={clearRecent}>기록 지우기</button>}</div>{recentArticles.length ? <div className="saved-article-list">{recentArticles.map((article) => <div key={article.slug} className="saved-article"><ArticleCard article={article} compact /><time className="viewed-date">읽은 시간 {new Date(article.viewedAt).toLocaleDateString('ko-KR')}</time></div>)}</div> : <EmptyState title="최근 본 기사가 없습니다." description="기사를 읽으면 최근 본 기사 목록에 자동으로 표시됩니다." action={<Link className="primary-button" to="/">뉴스 둘러보기</Link>} />}</>}

        {tab === 'preferences' && <><div className="panel-heading"><div><h2>관심·읽기 설정</h2><p>관심 분야와 화면 보기를 내게 맞게 조정하세요.</p></div></div><section className="settings-section"><h3>관심 카테고리</h3><p>관심 있는 분야를 선택해두면 다음 단계의 맞춤 뉴스 기능에 활용됩니다.</p><div className="interest-picker">{categories.map((category) => <button key={category.slug} className={interests.includes(category.slug) ? 'selected' : ''} aria-pressed={interests.includes(category.slug)} onClick={() => toggleInterest(category.slug)}>{category.name}</button>)}</div></section><section className="settings-section"><h3>읽기 환경</h3>{readingSettings}</section></>}

        {tab === 'account' && <><div className="panel-heading"><div><h2>회원정보·계정</h2><p>현재 로그인한 계정 정보를 확인합니다.</p></div></div><div className="account-details"><div><span>이름</span><strong>{user.name || '-'}</strong></div><div><span>이메일</span><strong>{user.email || '-'}</strong></div><div><span>회원 구분</span><strong>{ROLE_LABELS[user.role] || '일반회원'}</strong></div></div><div className="account-actions"><button className="secondary-button" onClick={logout}><LogOut size={18} />로그아웃</button><button className="danger-button" onClick={withdraw}>회원 탈퇴</button></div><p className="account-help">비밀번호 변경과 이메일 인증 기능은 메일 발송 기능을 연결하는 단계에서 추가됩니다.</p></>}
      </section>
    </div>
  </div>;
}
