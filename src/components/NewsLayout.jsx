import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Contrast, Grid2X2, Home, Search, SlidersHorizontal, UserRound, X, ZoomIn } from 'lucide-react';
import { categories } from '../data/articles';
import { getReaderSettings, saveReaderSettings, SETTINGS_EVENT } from '../utils/readerPreferences';

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
  const location = useLocation();
  const [query, setQuery] = useState('');
  const [largeText, setLargeText] = useState(() => getReaderSettings().largeText);
  const [highContrast, setHighContrast] = useState(() => getReaderSettings().highContrast);
  const [mobilePanel, setMobilePanel] = useState('');
  const mobilePanelRef = useRef(null);
  const mobilePanelOpenerRef = useRef(null);

  useEffect(() => {
    document.body.classList.toggle('large-text', largeText);
    saveSetting('largeText', largeText);
  }, [largeText]);

  useEffect(() => {
    document.body.classList.toggle('high-contrast', highContrast);
    saveSetting('highContrast', highContrast);
  }, [highContrast]);

  useEffect(() => {
    const syncSettings = (event) => {
      setLargeText(event.detail?.largeText ?? readSetting('largeText'));
      setHighContrast(event.detail?.highContrast ?? readSetting('highContrast'));
    };
    window.addEventListener(SETTINGS_EVENT, syncSettings);
    return () => window.removeEventListener(SETTINGS_EVENT, syncSettings);
  }, []);

  const toggleLargeText = () => {
    const next = !largeText;
    saveReaderSettings({ largeText: next, highContrast });
  };

  const toggleHighContrast = () => {
    const next = !highContrast;
    saveReaderSettings({ largeText, highContrast: next });
  };

  const search = (event) => {
    event.preventDefault();
    if (query.trim()) {
      navigate(`/search?q=${encodeURIComponent(query.trim())}`);
      setMobilePanel('');
    }
  };

  const openMobilePanel = (panel, event) => {
    mobilePanelOpenerRef.current = event?.currentTarget || document.activeElement;
    setMobilePanel(panel);
  };

  const closeMobilePanel = () => setMobilePanel('');

  useEffect(() => {
    if (!mobilePanel) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const panel = mobilePanelRef.current;
    const focusableSelector = 'button:not([disabled]), a[href], input:not([disabled])';
    window.requestAnimationFrame(() => (panel?.querySelector('[data-autofocus]') || panel?.querySelector(focusableSelector))?.focus());
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeMobilePanel();
        return;
      }
      if (event.key !== 'Tab' || !panel) return;
      const focusable = [...panel.querySelectorAll(focusableSelector)];
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable.at(-1);
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
      mobilePanelOpenerRef.current?.focus?.();
    };
  }, [mobilePanel]);

  useEffect(() => setMobilePanel(''), [location.pathname]);

  const isWorkRoute = ['/admin', '/creator'].includes(location.pathname);
  const myPageTarget = user ? '/mypage' : '/login?next=/mypage';

  return (
    <div className={`site-shell ${isWorkRoute ? 'work-shell' : ''}`}>
      <a className="skip-link" href="#main-content">본문으로 바로가기</a>
      <div className="top-utility">
        <div className="utility-inner">
          <span>시니어의 오늘을 더 정확하고 쉽게 전합니다.</span>
          <div className="utility-actions" aria-label="화면 보기 설정">
            <button type="button" onClick={toggleLargeText} aria-pressed={largeText} title="글자 크기 전환"><ZoomIn size={17} /> 가+</button>
            <button type="button" onClick={toggleHighContrast} aria-pressed={highContrast} title="고대비 화면 전환"><Contrast size={17} /></button>
          </div>
        </div>
      </div>
      <header className="site-header brand-refresh-header">
        <div className="brand-refresh-masthead">
          <div className="brand-refresh-tools">
            <form className="brand-refresh-search" role="search" onSubmit={search}>
              <label className="sr-only" htmlFor="brand-refresh-search">뉴스 검색</label>
              <input id="brand-refresh-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="뉴스 검색" />
              <button type="submit"><Search size={15} /><span>검색</span></button>
            </form>
            <div className="brand-refresh-account-links">
              <button type="button" onClick={toggleLargeText} aria-pressed={largeText} title="글자 크기 전환"><ZoomIn size={15} /></button>
              <button type="button" onClick={toggleHighContrast} aria-pressed={highContrast} title="고대비 화면 전환"><Contrast size={15} /></button>
              <Link to={user ? '/mypage' : '/login'}>{user ? user.name : '로그인'}</Link>
              {!user && <Link className="brand-refresh-signup" to="/signup">회원가입</Link>}
            </div>
          </div>
          <div className="brand-refresh-corner-lines brand-refresh-corner-lines-left" aria-hidden="true">
            {Array.from({ length: 7 }, (_, index) => <i key={index} />)}
          </div>
          <div className="brand-refresh-masthead-content">
            <p className="brand-refresh-message">오늘을 더 잘 살고<br />내일을 든든하게 준비하는 뉴스</p>
            <Link className="brand-refresh-wordmark" to="/" aria-label="시니어 라이프 뉴스 홈">
              <strong>시니어 라이프 뉴스</strong>
              <span>SENIOR LIFE NEWS</span>
              <i aria-hidden="true" />
            </Link>
            <Link className="brand-refresh-lab-button" to="/about">
              <strong>시니어 라이프 연구소</strong>
              <span>Senior Life Lab</span>
            </Link>
          </div>
          <div className="brand-refresh-corner-lines brand-refresh-corner-lines-right" aria-hidden="true">
            {Array.from({ length: 7 }, (_, index) => <i key={index} />)}
          </div>
        </div>
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
          <button type="button" className="mobile-view-settings" onClick={(event) => openMobilePanel('settings', event)} aria-label="보기 설정 열기"><SlidersHorizontal size={22} /></button>
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
            <div className="footer-meta desktop-footer-meta">
              <p>법인명: (주)메디프라퍼 | 주소: 서울특별시 동대문구 망우로 60, 6층 (휘경동, 금자탑빌딩) | 대표전화: 02-1234-1234 | 대표이메일: contact@mediproper.com | 팩스: 02-5678-5678</p>
              <p>청소년보호책임자: 민성기 | 제호: 시니어 라이프 뉴스 | 등록번호: 서울 아 ***** | 등록일: 2026-00-00 | 최초발행일: 2026-09-16 | 발행인: 민성기 | 편집인: 이재현</p>
            </div>
            <details className="mobile-footer-details">
              <summary>사업자·매체 정보 보기</summary>
              <div className="footer-meta">
                <p>법인명: (주)메디프라퍼 | 주소: 서울특별시 동대문구 망우로 60, 6층 (휘경동, 금자탑빌딩) | 대표전화: 02-1234-1234 | 대표이메일: contact@mediproper.com | 팩스: 02-5678-5678</p>
                <p>청소년보호책임자: 민성기 | 제호: 시니어 라이프 뉴스 | 등록번호: 서울 아 ***** | 등록일: 2026-00-00 | 최초발행일: 2026-09-16 | 발행인: 민성기 | 편집인: 이재현</p>
              </div>
            </details>
            <p className="footer-note">© 2026 Senior Life News. All rights reserved.</p>
          </div>
        </div>
      </footer>
      {!isWorkRoute && <nav className="mobile-bottom-nav" aria-label="모바일 주요 메뉴">
        <Link to="/" className={location.pathname === '/' ? 'active' : ''}><Home size={21} /><span>홈</span></Link>
        <button type="button" className={location.pathname.startsWith('/category/') ? 'active' : ''} onClick={(event) => openMobilePanel('categories', event)}><Grid2X2 size={21} /><span>카테고리</span></button>
        <button type="button" className={location.pathname === '/search' ? 'active' : ''} onClick={(event) => openMobilePanel('search', event)}><Search size={21} /><span>검색</span></button>
        <Link to={myPageTarget} className={location.pathname === '/mypage' ? 'active' : ''}><UserRound size={21} /><span>마이페이지</span></Link>
      </nav>}
      {mobilePanel && <div className="mobile-sheet-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) closeMobilePanel(); }}>
        <section ref={mobilePanelRef} className="mobile-sheet" role="dialog" aria-modal="true" aria-labelledby={`mobile-${mobilePanel}-title`}>
          <div className="mobile-sheet-handle" aria-hidden="true" />
          <div className="mobile-sheet-heading">
            <h2 id={`mobile-${mobilePanel}-title`}>{mobilePanel === 'categories' ? '뉴스 카테고리' : mobilePanel === 'search' ? '뉴스 검색' : '보기 설정'}</h2>
            <button type="button" onClick={closeMobilePanel} aria-label="닫기"><X size={23} /></button>
          </div>
          {mobilePanel === 'categories' && <div className="mobile-category-grid">
            <Link to="/" onClick={closeMobilePanel}>주요뉴스</Link>
            {categories.map((category) => <Link key={category.slug} to={`/category/${category.slug}`} onClick={closeMobilePanel}>{category.name}</Link>)}
          </div>}
          {mobilePanel === 'search' && <form className="mobile-search-form" role="search" onSubmit={search}>
            <label htmlFor="mobile-site-search">궁금한 뉴스 검색</label>
            <div><input data-autofocus id="mobile-site-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="검색어를 입력하세요" /><button className="primary-button" aria-label="검색"><Search size={21} />검색</button></div>
          </form>}
          {mobilePanel === 'settings' && <div className="mobile-view-options">
            <button type="button" aria-pressed={largeText} onClick={toggleLargeText}><span><ZoomIn size={22} /><strong>큰 글자로 보기</strong></span><span className="mobile-toggle" aria-hidden="true" /></button>
            <button type="button" aria-pressed={highContrast} onClick={toggleHighContrast}><span><Contrast size={22} /><strong>고대비 화면</strong></span><span className="mobile-toggle" aria-hidden="true" /></button>
          </div>}
        </section>
      </div>}
    </div>
  );
}
