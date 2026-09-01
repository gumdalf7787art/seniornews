import { Link } from 'react-router-dom';
import { categoryName } from '../data/articles';

export default function ArticleCard({ article, compact = false, list = false }) {
  const imageSizes = list ? '(max-width: 767px) 118px, 250px' : compact ? '(max-width: 767px) 112px, 132px' : '(max-width: 767px) 112px, 33vw';
  return (
    <article className={list ? 'list-item' : compact ? 'side-card' : 'news-card'}>
      <Link className="article-card-image" to={`/article/${article.slug}`}>{article.image ? <img src={article.image} alt={article.imageAlt} loading="lazy" decoding="async" sizes={imageSizes} /> : <span className="article-image-placeholder" aria-hidden="true" />}</Link>
      <div>
        <span className="eyebrow">{categoryName(article.category)}</span>
        <h3><Link to={`/article/${article.slug}`}>{article.title}</Link></h3>
        {!compact && <p className="summary">{article.summary}</p>}
        <div className="meta"><span>{article.author}</span><time>{article.publishedAt?.slice(0, 10)}</time></div>
      </div>
    </article>
  );
}
