import { Link } from 'react-router-dom';

export default function CategoryNewsBlock({ category, articles }) {
  const [featured, ...secondary] = articles;

  if (!featured) return null;

  return (
    <section className="category-block" aria-labelledby={`category-${category.slug}`}>
      <div className="section-heading">
        <h2 id={`category-${category.slug}`}>{category.name}</h2>
        <Link to={`/category/${category.slug}`}>더보기</Link>
      </div>

      <article className="category-featured">
        <Link className="category-featured-image" to={`/article/${featured.slug}`}>
          {featured.image && <img src={featured.image} alt={featured.imageAlt} />}
        </Link>
        <div className="category-featured-copy">
          <h3><Link to={`/article/${featured.slug}`}>{featured.title}</Link></h3>
          <p className="summary">{featured.summary}</p>
          <div className="meta"><span>{featured.author}</span><time>{featured.publishedAt?.split(' ')[0]}</time></div>
        </div>
      </article>

      <div className="category-mini-grid" aria-label={`${category.name} 뉴스 더보기`}>
        {secondary.slice(0, 4).map((article) => (
          <article className="category-mini-card" key={article.id}>
            <Link to={`/article/${article.slug}`}>
              {article.image && <img src={article.image} alt={article.imageAlt} />}
            </Link>
            <div>
              <h3><Link to={`/article/${article.slug}`}>{article.title}</Link></h3>
              <div className="category-mini-meta"><span>{article.author}</span><time>{article.publishedAt?.split(' ')[0]}</time></div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
