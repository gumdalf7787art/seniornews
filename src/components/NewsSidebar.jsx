import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchPublishedArticles } from '../utils/publicArticles';

export default function NewsSidebar({ excludeId, label = '추천 뉴스' }) {
  const [articles, setArticles] = useState([]);
  useEffect(() => { fetchPublishedArticles({ limit: 30 }).then(setArticles).catch(() => setArticles([])); }, []);
  const visible = useMemo(() => articles.filter((item) => item.id !== excludeId), [articles, excludeId]);
  const popularArticles = useMemo(() => [...visible].sort((a, b) => (b.views || 0) - (a.views || 0)).slice(0, 5), [visible]);
  const latestArticles = visible.slice(0, 5);
  return <aside className="article-sidebar" aria-label={label}><section className="article-sidebar-section"><h2>많이 본 뉴스</h2><div className="popular-sidebar-list">{popularArticles.map((item, index) => <Link className="popular-sidebar-item" to={`/article/${item.slug}`} key={item.id}><span className="popular-rank">{index + 1}</span><span className="popular-sidebar-title">{item.title}</span>{item.image && <img src={item.image} alt={item.imageAlt} loading="lazy" />}</Link>)}</div></section><section className="article-sidebar-section latest-sidebar-section"><h2>최신뉴스</h2><div className="latest-sidebar-list">{latestArticles.map((item) => <Link to={`/article/${item.slug}`} key={item.id}>{item.title}</Link>)}</div></section></aside>;
}
