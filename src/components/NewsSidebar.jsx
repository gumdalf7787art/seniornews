import { Link } from 'react-router-dom';
import { articles } from '../data/articles';

export default function NewsSidebar({ excludeId, label = '추천 뉴스' }) {
  const popularArticles = articles
    .filter((item) => item.id !== excludeId)
    .sort((a, b) => (b.views || 0) - (a.views || 0))
    .slice(0, 5);
  const latestArticles = articles
    .filter((item) => item.id !== excludeId)
    .sort((a, b) => new Date(b.publishedAt.replace(' ', 'T')) - new Date(a.publishedAt.replace(' ', 'T')))
    .slice(0, 5);

  return (
    <aside className="article-sidebar" aria-label={label}>
      <section className="article-sidebar-section">
        <h2>많이 본 뉴스</h2>
        <div className="popular-sidebar-list">
          {popularArticles.map((item, index) => (
            <Link className="popular-sidebar-item" to={`/article/${item.slug}`} key={item.id}>
              <span className="popular-rank">{index + 1}</span>
              <span className="popular-sidebar-title">{item.title}</span>
              <img src={item.image} alt={item.imageAlt} loading="lazy" />
            </Link>
          ))}
        </div>
      </section>
      <section className="article-sidebar-section latest-sidebar-section">
        <h2>최신뉴스</h2>
        <div className="latest-sidebar-list">
          {latestArticles.map((item) => (
            <Link to={`/article/${item.slug}`} key={item.id}>{item.title}</Link>
          ))}
        </div>
      </section>
    </aside>
  );
}
