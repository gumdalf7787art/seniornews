import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

const categories = [
  ['주요뉴스', '/'], ['건강', '/category/health'], ['복지·정책', '/category/welfare'],
  ['생활·금융', '/category/living-finance'], ['일자리', '/category/jobs'], ['디지털', '/category/digital'], ['문화·여가', '/category/culture'],
];

export default function BrandHeaderPreviewPage({ user }) {
  const [query, setQuery] = useState('');
  const navigate = useNavigate();
  const submitSearch = (event) => {
    event.preventDefault();
    const keyword = query.trim();
    if (keyword) navigate(`/search?q=${encodeURIComponent(keyword)}`);
  };

  return (
    <main className="brand-header-preview-page">
      <p className="brand-header-preview-label">HEADER CONCEPT · 01</p>
      <header className="life-lab-header">
        <div className="life-lab-header-lines" aria-hidden="true">
          {Array.from({ length: 8 }, (_, index) => <i key={index} />)}
        </div>
        <div className="life-lab-header-inner">
          <p className="life-lab-message">오늘을 더 잘 살고<br />내일을 든든하게 준비하는 뉴스</p>
          <div className="life-lab-name">
            <strong>시니어 라이프 연구소</strong>
            <span>Senior Life Lab</span>
          </div>
        </div>
      </header>

      <div className="life-lab-controls">
        <div className="life-lab-controls-inner">
          <Link className="life-lab-home-link" to="/">시니어 라이프 뉴스</Link>
          <form className="life-lab-search" onSubmit={submitSearch}>
            <label className="sr-only" htmlFor="brand-preview-search">뉴스 검색</label>
            <input id="brand-preview-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="궁금한 뉴스를 검색하세요" />
            <button type="submit">검색</button>
          </form>
          <Link className="life-lab-login" to={user ? '/mypage' : '/login'}>{user ? user.name : '로그인'}</Link>
        </div>
      </div>

      <nav className="life-lab-category-nav" aria-label="뉴스 카테고리">
        <div>{categories.map(([label, href]) => <Link key={href} to={href}>{label}</Link>)}</div>
      </nav>

      <section className="brand-header-preview-canvas">
        <p className="eyebrow">New header preview</p>
        <h1>로고 없이도 브랜드의 첫인상을 만드는 헤더</h1>
        <p>왼쪽에는 독자에게 전할 약속을, 오른쪽에는 콘텐츠를 연구하는 조직의 정체성을 두었습니다. 검색과 로그인은 별도의 흰 보조 줄로 옮겨 정보와 기능의 위계를 분리했습니다.</p>
        <div className="brand-header-preview-placeholder">
          <span>이 아래부터 기존 메인 뉴스 콘텐츠가 이어집니다.</span>
        </div>
      </section>
    </main>
  );
}
