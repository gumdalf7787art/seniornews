import { useParams } from 'react-router-dom';
import ArticleCard from '../components/ArticleCard';
import NewsSidebar from '../components/NewsSidebar';
import { articles, categoryName } from '../data/articles';

export default function CategoryPage() {
  const { slug } = useParams();
  const items = articles.filter((article) => article.category === slug);
  return <div className="container"><div className="section-heading"><h1>{categoryName(slug)}</h1><span>생활에 필요한 정보를 쉽게 전합니다</span></div><div className="list-page"><section className="article-list">{items.length ? items.map((article) => <ArticleCard key={article.id} article={article} list />) : <div className="empty-state"><h2>등록된 기사가 없습니다.</h2><p>새로운 소식을 준비하고 있습니다.</p></div>}</section><NewsSidebar label={`${categoryName(slug)} 추천 뉴스`} /></div></div>;
}
