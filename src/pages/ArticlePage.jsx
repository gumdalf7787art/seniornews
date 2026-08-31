import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Bookmark, Share2, Volume2, Square } from 'lucide-react';
import ArticleCard from '../components/ArticleCard';
import NewsSidebar from '../components/NewsSidebar';
import { articles, categoryName, getArticle } from '../data/articles';

export default function ArticlePage({ user }) {
  const { slug } = useParams();
  const article = getArticle(slug);
  const [bookmarked, setBookmarked] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const speechSupported = typeof window !== 'undefined' && 'speechSynthesis' in window;
  const related = useMemo(() => articles.filter((item) => item.category === article?.category && item.id !== article?.id).slice(0, 3), [article]);

  useEffect(() => {
    if (!article) return;
    document.title = `${article.title} | 시니어 뉴스`;
    const description = document.querySelector('meta[name="description"]');
    if (description) description.setAttribute('content', article.summary);
    return () => { document.title = '시니어 뉴스 | 오늘을 더 정확하고 쉽게'; };
  }, [article]);

  useEffect(() => {
    return () => {
      window.speechSynthesis?.cancel();
    };
  }, []);

  if (!article) return <div className="empty-state"><h1>기사를 찾을 수 없습니다.</h1><Link className="primary-button" to="/">홈으로 돌아가기</Link></div>;

  const toggleBookmark = async () => {
    if (!user) { window.location.href = `/login?next=/article/${article.slug}`; return; }
    const next = !bookmarked;
    try {
      const response = await fetch(`/api/bookmarks/${article.id}`, { method: next ? 'POST' : 'DELETE', credentials: 'include', headers: { 'X-Requested-With': 'SeniorNews' } });
      if (!response.ok) throw new Error();
      setBookmarked(next);
    } catch { alert('북마크를 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.'); }
  };

  const toggleSpeech = () => {
    if (speaking) { window.speechSynthesis.cancel(); setSpeaking(false); return; }
    const utterance = new SpeechSynthesisUtterance(`${article.title}. ${article.summary}. ${article.body.join(' ')}`);
    utterance.lang = 'ko-KR'; utterance.rate = .9; utterance.onend = () => setSpeaking(false);
    window.speechSynthesis.speak(utterance); setSpeaking(true);
  };

  const share = async () => {
    if (navigator.share) await navigator.share({ title: article.title, text: article.summary, url: window.location.href });
    else { await navigator.clipboard.writeText(window.location.href); alert('기사 주소를 복사했습니다.'); }
  };

  return (
    <div className="article-shell">
      <article className="article-wrap">
        <header className="article-header">
          <Link className="eyebrow" to={`/category/${article.category}`}>{categoryName(article.category)}</Link>
          <h1>{article.title}</h1>
          <p className="article-deck">{article.summary}</p>
          <div className="meta">
            <strong>{article.author}</strong>
            <time>입력 {article.publishedAt}</time>
            {article.updatedAt && <time>수정 {article.updatedAt}</time>}
          </div>
        </header>
        <div className="article-tools">
          <button className="tool-button" onClick={toggleBookmark}><Bookmark size={19} fill={bookmarked ? 'currentColor' : 'none'} /> {bookmarked ? '저장됨' : '기사 저장'}</button>
          {speechSupported && <button className="tool-button" onClick={toggleSpeech}>{speaking ? <Square size={18} /> : <Volume2 size={20} />} {speaking ? '읽기 멈춤' : '기사 읽어주기'}</button>}
          <button className="tool-button" onClick={share}><Share2 size={19} /> 공유하기</button>
        </div>
        <img className="hero-image" src={article.image} alt={article.imageAlt} />
        <div className="article-body">
          {article.body.map((paragraph, index) => <p key={index}>{paragraph}</p>)}
          {['health', 'life-finance'].includes(article.category) && <p><strong>※ 이 기사는 일반적인 정보 제공을 목적으로 하며 개인의 의료 진단이나 금융 자문을 대신하지 않습니다.</strong></p>}
        </div>
        <div className="article-source">
          <p><strong>{article.author}</strong> | 공용 이메일 contact@mediproper.com</p>
          <p>저작권자 © 시니어 라이프 뉴스 무단전재 및 재배포, AI학습 및 활용 금지</p>
        </div>
        {related.length > 0 && <section className="related"><div className="section-heading"><h2>함께 읽으면 좋은 기사</h2></div><div className="news-grid">{related.map((item) => <ArticleCard key={item.id} article={item} />)}</div></section>}
      </article>
      <NewsSidebar excludeId={article.id} />
    </div>
  );
}
