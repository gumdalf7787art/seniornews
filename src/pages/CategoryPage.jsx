import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import ArticleCard from '../components/ArticleCard';
import NewsSidebar from '../components/NewsSidebar';
import { categoryName } from '../data/articles';
import { fetchPublishedArticles } from '../utils/publicArticles';

export default function CategoryPage() {
  const { slug } = useParams();
  const [items, setItems] = useState([]);
  const [banners, setBanners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const loadItems = useCallback(() => {
    setLoading(true);
    setError('');
    Promise.all([
      fetchPublishedArticles({ category: slug, limit: 30 }),
      fetch('/api/banners').then(async (response) => {
        if (!response.ok) throw new Error('광고 배너를 불러오지 못했습니다.');
        const data = await response.json();
        return data.banners || [];
      }).catch(() => []),
    ]).then(([articles, activeBanners]) => {
      setItems(articles);
      setBanners(activeBanners);
    }).catch(() => {
      setItems([]);
      setBanners([]);
      setError('기사를 불러오지 못했습니다. 인터넷 연결을 확인하고 다시 시도해 주세요.');
    }).finally(() => setLoading(false));
  }, [slug]);
  useEffect(loadItems, [loadItems]);
  return <div className="container"><div className="section-heading mobile-list-heading"><div><h1>{categoryName(slug)}</h1>{!loading && !error && <small>{items.length}개의 기사</small>}</div><span>생활에 필요한 정보를 쉽게 전합니다</span></div><div className="list-page"><section className="article-list">{loading ? <div className="article-list-skeleton" role="status" aria-label="기사를 불러오는 중입니다">{[1, 2, 3].map((item) => <div key={item}><span /><p /><p /></div>)}</div> : error ? <div className="empty-state"><h2>뉴스를 불러오지 못했습니다.</h2><p>{error}</p><button className="primary-button" onClick={loadItems}>다시 시도</button></div> : items.length ? items.map((article) => <ArticleCard key={article.id} article={article} list />) : <div className="empty-state"><h2>등록된 기사가 없습니다.</h2><p>새로운 소식을 준비하고 있습니다.</p></div>}</section><NewsSidebar label={`${categoryName(slug)} 추천 뉴스`} showAd banners={banners} /></div></div>;
}
