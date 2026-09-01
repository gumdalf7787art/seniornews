import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Bookmark, Share2, Volume2, Square } from 'lucide-react';
import ArticleCard from '../components/ArticleCard';
import NewsSidebar from '../components/NewsSidebar';
import { categoryName } from '../data/articles';
import { fetchPublishedArticles, normalizeArticle } from '../utils/publicArticles';
import { saveRecentArticle } from '../utils/readerPreferences';

function safeInlineHtml(value = '') {
  if (typeof document === 'undefined') return '';
  const container = document.createElement('div');
  container.innerHTML = value;
  container.querySelectorAll('*').forEach((element) => {
    if (!['STRONG', 'B', 'BR'].includes(element.tagName)) element.replaceWith(...element.childNodes);
    else [...element.attributes].forEach((attribute) => element.removeAttribute(attribute.name));
  });
  return container.innerHTML;
}

function BodyBlock({ block }) {
  const html = safeInlineHtml(block.html || block.text || '');
  if (block.type === 'heading' || block.type === 'sectionTitle') return <h3 className={`article-section-title article-section-title-${block.attrs?.variant || block.variant || 'bar'}`} dangerouslySetInnerHTML={{ __html: html }} />;
  if (block.type === 'quote') return <blockquote dangerouslySetInnerHTML={{ __html: html }} />;
  if (block.type === 'image') {
    const url = block.url || block.attrs?.src;
    const alt = block.alt || block.attrs?.alt || '';
    const caption = block.caption || block.attrs?.caption || '';
    return url ? <figure><img src={url} alt={alt} loading="lazy" decoding="async" sizes="(max-width: 767px) calc(100vw - 32px), 780px" />{caption && <figcaption>{caption}</figcaption>}</figure> : null;
  }
  return <p dangerouslySetInnerHTML={{ __html: html }} />;
}

export default function ArticlePage({ user }) {
  const { slug } = useParams();
  const [article, setArticle] = useState(null);
  const [related, setRelated] = useState([]);
  const [sidebarArticles, setSidebarArticles] = useState([]);
  const [banners, setBanners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [bookmarked, setBookmarked] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [readingProgress, setReadingProgress] = useState(0);
  const speechSupported = typeof window !== 'undefined' && 'speechSynthesis' in window;

  useEffect(() => {
    setLoading(true);
    fetch(`/api/articles/${encodeURIComponent(slug)}`).then(async (response) => {
      const data = await response.json();
      if (!response.ok) throw new Error(data.message);
      return normalizeArticle(data.article);
    }).then((loaded) => {
      setArticle(loaded); saveRecentArticle(loaded); document.title = `${loaded.title} | 시니어 라이프 뉴스`;
      return Promise.all([
        fetchPublishedArticles({ category: loaded.category, limit: 4 }),
        fetchPublishedArticles({ limit: 30 }),
        fetch('/api/banners').then(async (response) => {
          if (!response.ok) throw new Error('광고 배너를 불러오지 못했습니다.');
          const data = await response.json();
          return data.banners || [];
        }).catch(() => []),
      ]);
    }).then(([items, allItems, activeBanners]) => { setRelated(items.filter((item) => item.slug !== slug).slice(0, 3)); setSidebarArticles(allItems); setBanners(activeBanners); }).catch(() => setArticle(null)).finally(() => setLoading(false));
    return () => { document.title = '시니어 라이프 뉴스 | 오늘을 더 정확하고 쉽게'; };
  }, [slug]);

  useEffect(() => () => { window.speechSynthesis?.cancel(); }, []);
  useEffect(() => {
    if (!article) return undefined;
    const updateProgress = () => {
      const pageHeight = document.documentElement.scrollHeight - window.innerHeight;
      setReadingProgress(pageHeight > 0 ? Math.min(100, Math.max(0, (window.scrollY / pageHeight) * 100)) : 0);
    };
    updateProgress();
    window.addEventListener('scroll', updateProgress, { passive: true });
    window.addEventListener('resize', updateProgress);
    return () => {
      window.removeEventListener('scroll', updateProgress);
      window.removeEventListener('resize', updateProgress);
    };
  }, [article]);
  const speechText = useMemo(() => article ? `${article.title}. ${article.summary}. ${article.body.map((block) => block.text || block.caption || '').join(' ')}` : '', [article]);
  if (loading) return <div className="empty-state"><p>기사를 불러오는 중입니다.</p></div>;
  if (!article) return <div className="empty-state"><h1>기사를 찾을 수 없습니다.</h1><Link className="primary-button" to="/">홈으로 돌아가기</Link></div>;

  const toggleBookmark = async () => {
    if (!user) { window.location.href = `/login?next=/article/${article.slug}`; return; }
    const next = !bookmarked;
    try { const response = await fetch(`/api/bookmarks/${article.id}`, { method: next ? 'POST' : 'DELETE', credentials: 'include', headers: { 'X-Requested-With': 'SeniorNews' } }); if (!response.ok) throw new Error(); setBookmarked(next); } catch { alert('북마크를 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.'); }
  };
  const toggleSpeech = () => { if (speaking) { window.speechSynthesis.cancel(); setSpeaking(false); return; } const utterance = new SpeechSynthesisUtterance(speechText); utterance.lang = 'ko-KR'; utterance.rate = .9; utterance.onend = () => setSpeaking(false); window.speechSynthesis.speak(utterance); setSpeaking(true); };
  const share = async () => { if (navigator.share) await navigator.share({ title: article.title, text: article.summary, url: window.location.href }); else { await navigator.clipboard.writeText(window.location.href); alert('기사 주소를 복사했습니다.'); } };

  return <>
    <div className="article-reading-progress" aria-hidden="true"><span style={{ width: `${readingProgress}%` }} /></div>
    <div className="article-shell">
      <article className="article-wrap">
        <header className="article-header"><Link className="eyebrow" to={`/category/${article.category}`}>{categoryName(article.category)}</Link><h1>{article.title}</h1><p className="article-deck">{article.summary}</p><div className="meta"><strong>{article.author}</strong><time>입력 {article.publishedAt}</time>{article.updatedAt && <time>수정 {article.updatedAt}</time>}</div></header>
        <div className="article-tools"><button className="tool-button" onClick={toggleBookmark}><Bookmark size={19} fill={bookmarked ? 'currentColor' : 'none'} /> {bookmarked ? '저장됨' : '기사 저장'}</button>{speechSupported && <button className="tool-button" onClick={toggleSpeech}>{speaking ? <Square size={18} /> : <Volume2 size={20} />} {speaking ? '읽기 멈춤' : '기사 읽어주기'}</button>}<button className="tool-button" onClick={share}><Share2 size={19} /> 공유하기</button></div>
        {article.image && <img className="hero-image" src={article.image} alt={article.imageAlt} fetchPriority="high" decoding="async" sizes="(max-width: 767px) 100vw, 780px" />}
        <div className="article-body">{article.body.map((block, index) => <BodyBlock key={block.id || index} block={block} />)}{['health', 'life-finance'].includes(article.category) && <p className="article-disclaimer"><strong>※ 이 기사는 일반적인 정보 제공을 목적으로 하며 개인의 의료 진단이나 금융 자문을 대신하지 않습니다.</strong></p>}</div>
        <div className="article-source"><p><strong>{article.author}</strong> | 공용 이메일 contact@mediproper.com</p><p>저작권자 © 시니어 라이프 뉴스 무단전재 및 재배포, AI학습 및 활용 금지</p></div>
        <NewsSidebar className="mobile-article-sidebar mobile-popular-sidebar" excludeId={article.id} showLatest={false} articles={sidebarArticles} />
        {related.length > 0 && <section className="related"><div className="section-heading"><h2>함께 읽으면 좋은 기사</h2></div><div className="news-grid">{related.map((item) => <ArticleCard key={item.id} article={item} />)}</div></section>}
        <NewsSidebar className="mobile-article-sidebar mobile-latest-sidebar" excludeId={article.id} showPopular={false} articles={sidebarArticles} />
      </article>
      <NewsSidebar className="desktop-article-sidebar" excludeId={article.id} articles={sidebarArticles} showAd banners={banners} />
    </div>
  </>;
}
