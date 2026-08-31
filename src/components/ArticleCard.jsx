import { Link } from 'react-router-dom';
import { categoryName } from '../data/articles';

export default function ArticleCard({ article, compact = false, list = false }) {
  return (
    <article className={list ? 'list-item' : compact ? 'side-card' : 'news-card'}>
      <Link to={`/article/${article.slug}`}>{article.image && <img src={article.image} alt={article.imageAlt} loading="lazy" />}</Link>
      <div>
        <span className="eyebrow">{categoryName(article.category)}</span>
        <h3><Link to={`/article/${article.slug}`}>{article.title}</Link></h3>
        {!compact && <p className="summary">{article.summary}</p>}
        <div className="meta"><span>{article.author}</span><time>{article.publishedAt?.slice(0, 10)}</time></div>
      </div>
    </article>
  );
}
