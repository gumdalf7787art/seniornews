import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import ArticleCard from '../components/ArticleCard';
import CategoryNewsBlock from '../components/CategoryNewsBlock';
import { articles, categories, categoryName } from '../data/articles';

export default function HomePage() {
  const lead = articles[0];
  const latest = articles.slice(3, 6);
  const popular = [...articles].sort((a, b) => b.views - a.views).slice(0, 5);

  return (
    <div className="container">
      <section aria-labelledby="today-heading">
        <div className="section-heading"><h2 id="today-heading">오늘의 주요 뉴스</h2><span className="eyebrow">2026년 8월 31일 월요일</span></div>
        <div className="lead-grid">
          <article className="lead-main">
            <Link to={`/article/${lead.slug}`}><img src={lead.image} alt={lead.imageAlt} /></Link>
            <span className="eyebrow">{categoryName(lead.category)}</span>
            <h1><Link to={`/article/${lead.slug}`}>{lead.title}</Link></h1>
            <p className="summary">{lead.summary}</p>
            <div className="meta"><span>{lead.author}</span><time>{lead.publishedAt}</time></div>
          </article>
          <div className="side-news" aria-label="주요 뉴스 더보기">{articles.slice(1, 5).map((article) => <ArticleCard key={article.id} article={article} compact />)}</div>
        </div>
      </section>

      <section aria-labelledby="latest-heading">
        <div className="section-heading"><h2 id="latest-heading">최신 뉴스</h2><Link to="/search">전체 뉴스 <ArrowRight size={17} style={{ display: 'inline' }} /></Link></div>
        <div className="news-grid">{latest.map((article) => <ArticleCard key={article.id} article={article} />)}</div>
      </section>

      <div className="category-sections">
        {categories.slice(0, 4).map((category) => {
          const categoryArticles = articles.filter((item) => item.category === category.slug).slice(0, 5);
          return <CategoryNewsBlock key={category.slug} category={category} articles={categoryArticles} />;
        })}
      </div>

      <div className="popular-policy">
        <section><div className="section-heading"><h2>많이 본 뉴스</h2></div><ol className="popular-list">{popular.map((article) => <li key={article.id}><Link to={`/article/${article.slug}`}>{article.title}</Link></li>)}</ol></section>
        <aside className="policy-box"><span className="eyebrow" style={{ color: '#ffb47f' }}>생활에 바로 쓰는 정보</span><h2>복지·정책 바로가기</h2><p>자주 찾는 공공서비스의 공식 안내 페이지를 쉽게 찾을 수 있습니다.</p><div className="policy-links"><a href="https://www.bokjiro.go.kr" target="_blank" rel="noreferrer">복지로 <ArrowRight size={18} /></a><a href="https://www.gov.kr" target="_blank" rel="noreferrer">정부24 <ArrowRight size={18} /></a><a href="https://www.nps.or.kr" target="_blank" rel="noreferrer">국민연금 <ArrowRight size={18} /></a><a href="https://www.work24.go.kr" target="_blank" rel="noreferrer">고용24 <ArrowRight size={18} /></a></div></aside>
      </div>
    </div>
  );
}
