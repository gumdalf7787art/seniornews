import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import ArticleCard from '../components/ArticleCard';
import { fetchPublishedArticles } from '../utils/publicArticles';

export default function SearchPage() {
  const [params] = useSearchParams();
  const query = params.get('q')?.trim() || '';
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { setLoading(true); fetchPublishedArticles({ q: query, limit: 30 }).then(setResults).catch(() => setResults([])).finally(() => setLoading(false)); }, [query]);
  return <div className="container"><h1 className="search-title">{query ? `“${query}” 검색 결과` : '전체 뉴스'}</h1><p>{loading ? '기사를 찾는 중입니다.' : `${results.length}개의 기사를 찾았습니다.`}</p><div className="search-results"><section className="article-list">{results.length ? results.map((article) => <ArticleCard key={article.id} article={article} list />) : !loading && <div className="empty-state"><h2>검색 결과가 없습니다.</h2><p>단어를 줄이거나 다른 검색어를 입력해 보세요.</p></div>}</section></div></div>;
}
