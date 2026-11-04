import { Fragment, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Bookmark, Share2, Volume2, Square } from 'lucide-react';
import ArticleCard from '../components/ArticleCard';
import NewsSidebar from '../components/NewsSidebar';
import { categoryName } from '../data/articles';
import { fetchPublishedArticles, normalizeArticle, initialArticle, releaseInitialArticle, articlePreview } from '../utils/publicArticles';
import { saveRecentArticle } from '../utils/readerPreferences';
import { SITE_ORIGIN } from '../../shared/seo.js';

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
  return <ArticleReader key={slug} slug={slug} user={user} />;
}

function ArticleReader({ slug, user }) {
  const [seed] = useState(() => initialArticle(slug));
  const [article, setArticle] = useState(seed);
  const [related, setRelated] = useState([]);
  const [sidebarArticles, setSidebarArticles] = useState([]);
  const [banners, setBanners] = useState([]);
  const [loading, setLoading] = useState(!seed);
  const [bookmarked, setBookmarked] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [readingProgress, setReadingProgress] = useState(0);
  const speechSupported = typeof window !== 'undefined' && 'speechSynthesis' in window;

  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    const signal = controller.signal;
    if (seed) releaseInitialArticle();
    const detail = seed ? Promise.resolve(seed) : fetch(`/api/articles/${encodeURIComponent(slug)}`, { signal }).then(async r => {
      if (!r.ok) throw new Error('기사를 가져올 수 없습니다.');
      return normalizeArticle((await r.json()).article);
    });
    detail.then(loaded => {
      if (!active) return;
      setArticle(loaded);
      setLoading(false);
      saveRecentArticle(loaded);
      document.title = `${loaded.editorial?.seo_title || loaded.title} | 시니어 라이프 뉴스`;
      fetchPublishedArticles({ category: loaded.category, limit: 4 }).then(items => {
        if (active) setRelated(items.filter(item => item.slug !== slug).slice(0, 3));
      }).catch(() => {});
    }).catch(() => { if (active) { setArticle(null); setLoading(false); } });
    fetchPublishedArticles({ limit: 30 }).then(items => { if (active) setSidebarArticles(items); }).catch(() => {});
    fetch('/api/banners', { signal }).then(r => r.ok ? r.json() : {}).then(data => { if (active) setBanners(data.banners || []); }).catch(() => {});
    return () => { active = false; controller.abort(); };
  }, [slug, seed]);

  useEffect(() => () => { window.speechSynthesis?.cancel(); }, []);
  useEffect(() => {
    if (!article || article.slug !== slug) return;
    const canonicalUrl = `${SITE_ORIGIN}/article/${encodeURIComponent(slug)}`;
    for (const [attribute, name, value] of [
      ['name', 'description', article.editorial?.meta_description || article.summary],
      ['name', 'twitter:title', article.title],
      ['name', 'twitter:description', article.editorial?.meta_description || article.summary],
      ['property', 'og:title', article.title],
      ['property', 'og:description', article.editorial?.meta_description || article.summary],
      ['property', 'og:url', canonicalUrl],
      ['property', 'og:type', 'article'],
    ]) {
      let meta = document.head.querySelector(`meta[${attribute}="${name}"]`);
      if (!meta) { meta = document.createElement('meta'); meta.setAttribute(attribute, name); document.head.append(meta); }
      meta.content = value || '';
    }
    let canonical = document.head.querySelector('link[rel="canonical"]');
    if (!canonical) { canonical = document.createElement('link'); canonical.rel = 'canonical'; document.head.append(canonical); }
    canonical.href = canonicalUrl;
  }, [article, slug]);
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
  if (loading) {
    const preview = articlePreview(slug);
    return <div className="article-shell" aria-busy="true"><article className="article-wrap"><header className="article-header">
      {preview ? <><span className="eyebrow">{categoryName(preview.category)}</span><h1>{preview.title}</h1><p className="article-deck">{preview.summary}</p><div className="meta"><strong>{preview.author}</strong><time>입력 {preview.publishedAt}</time></div></> : <p role="status">기사를 불러오는 중입니다.</p>}
    </header></article></div>;
  }
  if (!article) return <div className="empty-state"><h1>기사를 찾을 수 없습니다.</h1><Link className="primary-button" to="/">홈으로 돌아가기</Link></div>;

  // Place the lead image at a section boundary near the middle, without repeating inline images.
  const hasInlineLead = article.body.some(block => block.type === 'image' && (block.url || block.attrs?.src) === article.image);
  const middle = Math.ceil(article.body.length / 2);
  const sectionBoundary = article.body.findIndex((block, index) => index >= middle && ['heading', 'sectionTitle'].includes(block.type));
  const imageIndex = sectionBoundary >= 0 ? sectionBoundary : Math.min(middle, article.body.length);
  const leadImage = article.image && !hasInlineLead ? <figure className="article-lead-figure"><img src={article.image} alt={article.imageAlt} loading="lazy" decoding="async" sizes="(max-width: 767px) 100vw, 780px" />{article.editorial?.hero_caption && <figcaption>{article.editorial.hero_caption}</figcaption>}</figure> : null;

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
        <div className="article-body">{article.body.map((block, index) => <Fragment key={block.id || index}>{index === imageIndex && leadImage}<BodyBlock block={block} /></Fragment>)}{imageIndex === article.body.length && leadImage}{['health', 'life-finance'].includes(article.category) && <p className="article-disclaimer"><strong>※ 이 기사는 일반적인 정보 제공을 목적으로 하며 개인의 의료 진단이나 금융 자문을 대신하지 않습니다.</strong></p>}</div>
        <div className="article-source">{Array.isArray(article.editorial?.source_display) ? article.editorial.source_display.map((source, i) => <p key={i}>자료: <a href={source.url} target="_blank" rel="noopener noreferrer">{source.label}</a></p>) : article.source_text && <div><strong>출처·참고자료</strong>{article.source_text.split('\n').filter(Boolean).map((line, i) => <p key={i}>{/^https?:\/\/[^\s]+$/.test(line) ? <a href={line} target="_blank" rel="noopener noreferrer">{line}</a> : line}</p>)}</div>}<p><strong>{article.author}</strong> | 공용 이메일 contact@mediproper.com</p><p>저작권자 © 시니어 라이프 뉴스 무단전재 및 재배포, AI학습 및 활용 금지</p></div>
        <NewsSidebar className="mobile-article-sidebar mobile-popular-sidebar" excludeId={article.id} showLatest={false} articles={sidebarArticles} />
        {related.length > 0 && <section className="related"><div className="section-heading"><h2>함께 읽으면 좋은 기사</h2></div><div className="news-grid">{related.map((item) => <ArticleCard key={item.id} article={item} />)}</div></section>}
        <NewsSidebar className="mobile-article-sidebar mobile-latest-sidebar" excludeId={article.id} showPopular={false} articles={sidebarArticles} />
      </article>
      <NewsSidebar className="desktop-article-sidebar" excludeId={article.id} articles={sidebarArticles} showAd banners={banners} />
    </div>
  </>;
}
