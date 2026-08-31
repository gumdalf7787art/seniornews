import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import ArticleCard from '../components/ArticleCard';
import { articles } from '../data/articles';

export default function MyPage({ user, setUser }) {
  const navigate = useNavigate();
  const [tab, setTab] = useState('bookmarks');
  const [bookmarks, setBookmarks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/bookmarks', { credentials: 'include' }).then((res) => res.ok ? res.json() : { bookmarks: [] }).then((data) => setBookmarks(data.bookmarks || [])).catch(() => setBookmarks([])).finally(() => setLoading(false));
  }, []);

  const logout = async () => { await fetch('/api/auth/logout', { method: 'POST', credentials: 'include', headers: { 'X-Requested-With': 'SeniorNews' } }); setUser(null); navigate('/'); };
  const withdraw = async () => { if (!confirm('회원 정보를 삭제할까요? 저장한 기사도 함께 삭제되며 되돌릴 수 없습니다.')) return; const response = await fetch('/api/withdraw', { method: 'POST', credentials: 'include', headers: { 'X-Requested-With': 'SeniorNews' } }); if (response.ok) { setUser(null); navigate('/'); } else alert('회원 탈퇴를 처리하지 못했습니다.'); };
  const bookmarkedArticles = bookmarks.length ? articles.filter((article) => bookmarks.some((bookmark) => Number(bookmark.article_id) === article.id)) : [];

  return <div className="container"><div className="section-heading"><h1>마이페이지</h1><span>{user.name}님, 반갑습니다.</span></div><div className="settings-grid"><nav className="profile-nav" aria-label="마이페이지 메뉴"><button className={tab === 'bookmarks' ? 'active' : ''} onClick={() => setTab('bookmarks')}>저장한 기사</button><button className={tab === 'profile' ? 'active' : ''} onClick={() => setTab('profile')}>회원정보·설정</button>{['editor', 'admin'].includes(user.role) && <Link className="primary-button" to="/admin">기사 관리로 이동</Link>}</nav><section className="panel">{tab === 'bookmarks' ? <><h2>저장한 기사</h2>{loading ? <p>불러오는 중입니다.</p> : bookmarkedArticles.length ? <div className="news-grid">{bookmarkedArticles.map((article) => <ArticleCard key={article.id} article={article} />)}</div> : <div className="empty-state"><h3>아직 저장한 기사가 없습니다.</h3><p>기사 화면의 ‘기사 저장’ 버튼을 눌러 나중에 다시 읽어보세요.</p><Link className="primary-button" to="/">뉴스 둘러보기</Link></div>}</> : <><h2>회원정보</h2><div className="field"><label>이름</label><input value={user.name || ''} readOnly /></div><div className="field"><label>이메일</label><input value={user.email || ''} readOnly /></div><p>글자 크기와 고대비 화면은 페이지 상단에서 언제든 변경할 수 있습니다.</p><div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 28 }}><button className="secondary-button" onClick={logout}>로그아웃</button><button className="danger-button" onClick={withdraw}>회원 탈퇴</button></div></>}</section></div></div>;
}
