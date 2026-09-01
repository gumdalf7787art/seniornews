import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, LoaderCircle } from 'lucide-react';
import ArticleCard from '../components/ArticleCard';
import CategoryNewsBlock from '../components/CategoryNewsBlock';
import HeroAdBanner from '../components/HeroAdBanner';
import SeniorBriefingBar from '../components/SeniorBriefingBar';
import { categories, categoryName } from '../data/articles';
import { fetchPublishedArticles } from '../utils/publicArticles';

export default function HomePage() {
  const [articles, setArticles] = useState([]);
  const [banners, setBanners] = useState([]);
  const [briefings, setBriefings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([
      fetchPublishedArticles({ limit: 30 }),
      fetch('/api/banners').then(async (response) => {
        if (!response.ok) throw new Error('광고 배너를 불러오지 못했습니다.');
        const data = await response.json();
        return data.banners || [];
      }).catch(() => []),
      fetch('/api/briefings').then(async (response) => {
        if (!response.ok) throw new Error('오늘의 알림을 불러오지 못했습니다.');
        const data = await response.json();
        return data.briefings || [];
      }).catch(() => []),
    ])
      .then(([publishedArticles, activeBanners, activeBriefings]) => {
        setArticles(publishedArticles);
        setBanners(activeBanners);
        setBriefings(activeBriefings);
      })
      .catch((requestError) => setError(requestError.message || '기사를 불러오지 못했습니다.'))
      .finally(() => setLoading(false));
  }, []);

  const lead = articles.find((article) => article.is_featured) || articles[0];
  const side = useMemo(() => articles.filter((article) => article.id !== lead?.id).slice(0, 3), [articles, lead]);
  const latest = articles.slice(0, 3);
  const popular = useMemo(() => [...articles].sort((a, b) => (b.views || 0) - (a.views || 0)).slice(0, 5), [articles]);

  if (loading) return <div className="container admin-loading"><LoaderCircle className="spin" />공개 기사를 불러오는 중입니다.</div>;
  if (error) return <div className="container empty-state"><h1>뉴스를 불러오지 못했습니다.</h1><p>{error}</p></div>;
  if (!lead) return <div className="container empty-state"><h1>아직 공개된 기사가 없습니다.</h1><p>관리 페이지에서 기사를 발행하면 이곳에 실제 기사로 표시됩니다.</p></div>;

  return (
    <div className="container">
      <section aria-labelledby="today-heading">
        <div className="section-heading"><h2 id="today-heading">오늘의 주요 뉴스</h2><span className="eyebrow">{lead.publishedAt?.slice(0, 10)}</span></div>
        <div className="lead-grid">
          <article className="lead-main">
            <Link to={`/article/${lead.slug}`}>{lead.image && <img src={lead.image} alt={lead.imageAlt} fetchPriority="high" decoding="async" width="1600" height="900" sizes="(max-width: 767px) calc(100vw - 32px), 760px" />}</Link>
            <span className="eyebrow">{categoryName(lead.category)}</span>
            <h1><Link to={`/article/${lead.slug}`}>{lead.title}</Link></h1>
            <p className="summary">{lead.summary}</p>
            <div className="meta"><span>{lead.author}</span><time>{lead.publishedAt}</time></div>
          </article>
          <div className="hero-side-column">
            <div className="side-news" aria-label="주요 뉴스 더보기">{side.map((article) => <ArticleCard key={article.id} article={article} compact />)}</div>
            <HeroAdBanner banners={banners} />
          </div>
        </div>
      </section>

      <section aria-labelledby="latest-heading">
        <div className="section-heading"><h2 id="latest-heading">최신 뉴스</h2><Link to="/search">전체 뉴스 <ArrowRight size={17} style={{ display: 'inline' }} /></Link></div>
        <div className="news-grid latest-news-grid">{latest.map((article) => <ArticleCard key={article.id} article={article} />)}</div>
      </section>

      <SeniorBriefingBar briefings={briefings} />

      <div className="category-sections">
        {categories.map((category) => <CategoryNewsBlock key={category.slug} category={category} articles={articles.filter((article) => article.category === category.slug).slice(0, 5)} />)}
      </div>

      <div className="popular-policy">
        <section><div className="section-heading"><h2>많이 본 뉴스</h2></div><ol className="popular-list">{popular.map((article) => <li key={article.id}><Link to={`/article/${article.slug}`}>{article.title}</Link></li>)}</ol></section>
        <aside className="policy-box"><span className="eyebrow" style={{ color: '#ffb47f' }}>생활에 바로 쓰는 정보</span><h2>복지·정책 바로가기</h2><p>자주 찾는 공공서비스의 공식 안내 페이지를 쉽게 찾을 수 있습니다.</p><div className="policy-links"><a href="https://www.bokjiro.go.kr" target="_blank" rel="noreferrer">복지로 <ArrowRight size={18} /></a><a href="https://www.gov.kr" target="_blank" rel="noreferrer">정부24 <ArrowRight size={18} /></a><a href="https://www.nps.or.kr" target="_blank" rel="noreferrer">국민연금 <ArrowRight size={18} /></a><a href="https://www.work24.go.kr" target="_blank" rel="noreferrer">고용24 <ArrowRight size={18} /></a></div></aside>
      </div>
    </div>
  );
}
