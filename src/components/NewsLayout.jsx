import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { Search, UserRound, Contrast, ZoomIn } from 'lucide-react';
import { categories } from '../data/articles';

function readSetting(key) {
  try { return window.localStorage.getItem(key) === 'true'; }
  catch { return false; }
}

function saveSetting(key, value) {
  try { window.localStorage.setItem(key, String(value)); }
  catch { /* 일부 내장 브라우저에서는 로컬 저장소가 제한될 수 있습니다. */ }
}

export default function NewsLayout({ user }) {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [largeText, setLargeText] = useState(() => readSetting('largeText'));
  const [highContrast, setHighContrast] = useState(() => readSetting('highContrast'));

  useEffect(() => {
    document.body.classList.toggle('large-text', largeText);
    saveSetting('largeText', largeText);
  }, [largeText]);

  useEffect(() => {
    document.body.classList.toggle('high-contrast', highContrast);
    saveSetting('highContrast', highContrast);
  }, [highContrast]);

  const search = (event) => {
    event.preventDefault();
    if (query.trim()) navigate(`/search?q=${encodeURIComponent(query.trim())}`);
  };

  return (
    <div className="site-shell">
      <a className="skip-link" href="#main-content">본문으로 바로가기</a>
      <div className="top-utility">
        <div className="utility-inner">
          <span>시니어의 오늘을 더 정확하고 쉽게 전합니다.</span>
          <div className="utility-actions" aria-label="화면 보기 설정">
            <button type="button" onClick={() => setLargeText((value) => !value)} aria-pressed={largeText} title="글자 크기 전환"><ZoomIn size={17} /> 가+</button>
            <button type="button" onClick={() => setHighContrast((value) => !value)} aria-pressed={highContrast} title="고대비 화면 전환"><Contrast size={17} /></button>
          </div>
        </div>
      </div>
      <header className="site-header">
        <div className="header-inner">
          <Link className="brand" to="/" aria-label="시니어 라이프 뉴스 홈">
            <span className="brand-mark" aria-hidden="true">시</span><strong>시니어 라이프 뉴스</strong>
          </Link>
          <form className="header-search" role="search" onSubmit={search}>
            <label className="sr-only" htmlFor="site-search">뉴스 검색</label>
            <input id="site-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="궁금한 뉴스를 검색하세요" />
            <button aria-label="검색"><Search size={20} /></button>
          </form>
          <Link className="header-account" to={user ? '/mypage' : '/login'}><UserRound size={20} /><span>{user ? user.name : '로그인'}</span></Link>
        </div>
        <nav className="category-nav" aria-label="뉴스 카테고리">
          <div className="category-inner">
            <NavLink to="/" end>주요뉴스</NavLink>
            {categories.map((category) => <NavLink key={category.slug} to={`/category/${category.slug}`}>{category.name}</NavLink>)}
          </div>
        </nav>
      </header>
      <main id="main-content"><Outlet /></main>
      <footer className="site-footer">
        <div className="container footer-grid" style={{ paddingBlock: 0 }}>
          <div>
            <div className="brand">
              <span className="brand-mark">시</span>
              <strong style={{ color: 'white' }}>시니어 라이프 뉴스</strong>
            </div>
            <p className="footer-note">시니어의 삶에 필요한 뉴스를 정확하고 이해하기 쉽게 전하겠습니다.</p>
          </div>
          <div>
            <div className="footer-links">
              <Link to="/about">매체 소개</Link>
              <Link to="/editorial-policy">편집 원칙</Link>
              <Link to="/corrections">정정·반론 정책</Link>
              <Link to="/privacy">개인정보처리방침</Link>
              <Link to="/terms">이용약관</Link>
              <Link to="/contact">문의</Link>
            </div>
            <div className="footer-meta">
              <p>법인명: (주)메디프라퍼 | 주소: 서울특별시 동대문구 망우로 60, 6층 (휘경동, 금자탑빌딩) | 대표전화: 02-1234-1234 | 대표이메일: contact@mediproper.com | 팩스: 02-5678-5678</p>
              <p>청소년보호책임자: 민성기 | 제호: 시니어 라이프 뉴스 | 등록번호: 서울 아 ***** | 등록일: 2026-00-00 | 최초발행일: 2026-09-16 | 발행인: 민성기 | 편집인: 이재현</p>
            </div>
            <p className="footer-note">© 2026 Senior Life News. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
