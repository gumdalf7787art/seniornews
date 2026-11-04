import { articleListSelect } from './api/utils/articleList.js';
import { PUBLIC_SITE_ORIGIN } from './api/utils/site.js';
import { categoryPages, publicPages, pageMetadata, pageTitle, pageSchema } from '../shared/seo.js';

function escapeHtml(value=''){return String(value).replace(/[&<>'"]/g,(char)=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]));}
function replaceMeta(html,name,value,property=false){const attribute=property?'property':'name';const expression=new RegExp(`<meta\\s+${attribute}=["']${name}["'][^>]*>`,'i');const tag=`<meta ${attribute}="${name}" content="${escapeHtml(value)}">`;return expression.test(html)?html.replace(expression,()=>tag):html.replace('</head>',()=>`${tag}</head>`);}

function withInitialData(html, data) {
  const json = JSON.stringify(data).replace(/</g, '\\u003c');
  return html.replace('</head>', () => `<script id="news-initial" type="application/json">${json}</script></head>`);
}

// Keep the masthead and the first headline in place while React starts.
function firstPaintShell(main) {
  const arcs = '<i></i>'.repeat(7);
  const nav = categoryPages.map(item => `<a href="${item.path}">${escapeHtml(item.name)}</a>`).join('');
  return `<div class="site-shell"><header class="site-header brand-refresh-header"><div class="brand-refresh-masthead"><div class="brand-refresh-corner-lines brand-refresh-corner-lines-left" aria-hidden="true">${arcs}</div><div class="brand-refresh-masthead-content"><p class="brand-refresh-message">오늘을 더 잘 살고<br>내일을 든든하게 준비하는 뉴스</p><a class="brand-refresh-wordmark" href="/"><strong>시니어 라이프 뉴스</strong><span>SENIOR LIFE NEWS</span><i></i></a><a class="brand-refresh-lab-button" href="/lab"><strong>시니어 라이프 연구소</strong><span>Senior Life Lab</span></a></div><div class="brand-refresh-corner-lines brand-refresh-corner-lines-right" aria-hidden="true">${arcs}</div></div><nav class="category-nav" aria-label="뉴스 카테고리"><div class="category-inner"><div class="category-main-links"><a href="/">주요뉴스</a>${nav}</div></div></nav></header><main>${main}</main></div>`;
}

async function withPageCanonical(response, pathname, env) {
  if (!response.ok || !response.headers.get('Content-Type')?.includes('text/html')) return response;
  const canonical = `${PUBLIC_SITE_ORIGIN}${pathname}`;
  let html = await response.text();
  const page = pageMetadata(pathname);
  if (page) {
    html = html.replace(/<title>.*?<\/title>/i, `<title>${escapeHtml(pageTitle(page))}</title>`);
    for (const name of ['description', 'twitter:description']) html = replaceMeta(html, name, page.description);
    html = replaceMeta(html, 'twitter:title', pageTitle(page));
    html = replaceMeta(html, 'og:title', pageTitle(page), true);
    html = replaceMeta(html, 'og:description', page.description, true);
    const schema = JSON.stringify(pageSchema(page)).replace(/</g, '\\u003c');
    html = html.replace('</head>', `<script id="public-page-schema" type="application/ld+json">${schema}</script></head>`);
    const links = publicPages.map((item) => `<a href="${item.path}">${escapeHtml(item.name)}</a>`).join(' · ');
    let articles = '';
    let leadPreview = '';
    if (env.DB && (pathname === '/' || pathname.startsWith('/category/'))) {
      const category = pathname.startsWith('/category/') ? page.slug : null;
      try {
        const select = category ? 'SELECT a.slug,a.title,a.summary FROM articles a JOIN categories c ON c.id=a.category_id' : articleListSelect;
        const result = await env.DB.prepare(`${select} WHERE a.status='published' AND a.published_at<=CURRENT_TIMESTAMP${category ? ' AND c.slug=?' : ''} ORDER BY a.published_at DESC,a.id DESC LIMIT 30`).bind(...(category ? [category] : [])).all();
        if (!category) {
          html = withInitialData(html, { path: pathname, articles: result.results });
          const lead = result.results.find(item => item.is_featured) || result.results[0];
          if (lead) {
            const img = lead.image_url ? `<img src="${escapeHtml(lead.image_url)}" alt="${escapeHtml(lead.image_alt || '')}" width="1600" height="900" fetchpriority="high">` : '';
            const href = '/article/' + encodeURIComponent(lead.slug);
            leadPreview = `<div class="section-heading"><h2>오늘의 주요 뉴스</h2></div><div class="lead-grid"><article class="lead-main"><a href="${href}">${img}</a><span class="eyebrow">${escapeHtml(lead.category_name)}</span><h1><a href="${href}">${escapeHtml(lead.title)}</a></h1><p class="summary">${escapeHtml(lead.summary)}</p></article></div>`;
          }
        }
        articles = result.results.map((item) => `<article><h2><a href="/article/${encodeURIComponent(item.slug)}">${escapeHtml(item.title)}</a></h2><p>${escapeHtml(item.summary)}</p></article>`).join('');
      } catch (error) {
        console.error('Public page article rendering failed', error);
      }
    }
    const directory = pathname === '/' ? '<section aria-label="분야별 뉴스"><dl>' + categoryPages.map(({path, name, description}) => `<dt><a href="${path}">${escapeHtml(name)}</a></dt><dd>${escapeHtml(description)}</dd>`).join('') + '</dl></section>' : '';
    const breadcrumbs = pathname === '/' ? '' : `<nav aria-label="현재 위치"><a href="/">시니어 라이프 뉴스</a> / ${escapeHtml(page.name)}</nav>`;
    const content = pathname === '/' ? firstPaintShell(`<div class="container"><p class="news-intro">${escapeHtml(page.description)}</p>${leadPreview}${directory}${articles}<nav aria-label="주요 메뉴">${links}</nav></div>`) : `<div class="container"><nav aria-label="주요 메뉴">${links}</nav><main>${breadcrumbs}<h1>${escapeHtml(page.name)}</h1><p>${escapeHtml(page.description)}</p>${articles}</main></div>`;
    html = html.replace('<div id="root"></div>', () => `<div id="root">${content}</div>`);
  }
  html = replaceMeta(html, 'og:url', canonical, true);
  html = html.replace('</head>', `<link rel="canonical" href="${escapeHtml(canonical)}"></head>`);
  const headers = new Headers(response.headers);
  headers.delete('Content-Length');
  headers.delete('ETag');
  return new Response(html, { status: response.status, headers });
}

export async function onRequest(context){
  const url=new URL(context.request.url); const match=url.pathname.match(/^\/article\/([^/]+)$/); if(!match||!context.env.DB)return withPageCanonical(await context.next(), url.pathname, context.env);
  const article=await context.env.DB.prepare("SELECT a.id,a.slug,c.slug category_slug,a.title,a.summary,a.body_json,a.body_text,a.image_url,a.image_alt,a.published_at,a.updated_at,a.source_text,c.name category_name,CASE WHEN json_valid(a.body_json) AND json_extract(a.body_json,'$.editorial.author_name')='시니어 라이프 뉴스' THEN '시니어 라이프 뉴스' ELSE u.name END author_name FROM articles a JOIN categories c ON c.id=a.category_id JOIN users u ON u.id=a.author_id WHERE a.slug=? AND a.status='published' AND a.published_at<=CURRENT_TIMESTAMP").bind(decodeURIComponent(match[1])).first();
  if(!article)return context.next();
  let editorial = {}; try { editorial = JSON.parse(article.body_json || '{}').editorial || {}; } catch { /* Legacy content */ }
  const seoTitle = editorial.seo_title || article.title; const description = editorial.meta_description || article.summary;
  const asset=await context.next(); if(!asset.headers.get('Content-Type')?.includes('text/html'))return asset;
  let html=await asset.text(); const canonical=`${PUBLIC_SITE_ORIGIN}${url.pathname}`; const defaultImage=`${PUBLIC_SITE_ORIGIN}/images/og-senior-life-news-v3.png`; const socialImage=article.image_url||defaultImage;
  let blocks;
  try { const parsed = JSON.parse(article.body_json); blocks = Array.isArray(parsed) ? parsed : parsed?.content; } catch { /* plain text fallback */ }
  const publicEditorial = Object.fromEntries(['seo_title','meta_description','hero_caption','source_display'].filter(key => editorial[key] != null).map(key => [key, editorial[key]]));
  html = withInitialData(html, { path: url.pathname, article: { ...article, body_json: JSON.stringify({ content: blocks, editorial: publicEditorial }) } });
  if (context.request.method === 'GET' && article.id && context.waitUntil) context.waitUntil(context.env.DB.prepare('INSERT INTO article_views(article_id,viewer_hash) VALUES(?,?)').bind(article.id, null).run());
  const bodyBlocks = Array.isArray(blocks) && blocks.length ? blocks : (article.body_text || '').split(/\n+/).filter(Boolean).map(text => ({text}));
  const midpoint = Math.ceil(bodyBlocks.length / 2);
  const boundary = bodyBlocks.findIndex((b, i) => i >= midpoint && ['heading', 'sectionTitle'].includes(b.type));
  const imageAt = boundary < 0 ? midpoint : boundary;
  const figure = (url, alt, caption) => url ? `<figure><img src="${escapeHtml(url)}" alt="${escapeHtml(alt || '')}" loading="lazy" decoding="async">${caption ? `<figcaption>${escapeHtml(caption)}</figcaption>` : ''}</figure>` : '';
  const lead = bodyBlocks.some(b => b.type === 'image' && (b.url || b.attrs?.src) === article.image_url) ? '' : figure(article.image_url, article.image_alt, editorial.hero_caption);
  const parts = bodyBlocks.map(b => {
    if (b.type === 'image') return figure(b.url || b.attrs?.src, b.alt || b.attrs?.alt, b.caption || b.attrs?.caption);
    const tag = ['heading', 'sectionTitle'].includes(b.type) ? 'h3' : b.type === 'quote' ? 'blockquote' : 'p';
    return `<${tag}>${escapeHtml(b.text || (b.html || '').replace(/<[^>]*>/g,''))}</${tag}>`;
  });
  parts.splice(imageAt, 0, lead);
  const serverArticle=`<div class="article-shell"><article class="article-wrap" data-server-rendered="true"><header class="article-header"><p class="eyebrow">${escapeHtml(article.category_name)}</p><h1>${escapeHtml(article.title)}</h1><p class="article-deck">${escapeHtml(article.summary)}</p><p class="meta">${escapeHtml(article.author_name)} · ${escapeHtml(article.published_at)}</p></header><div class="article-body">${parts.join('')}</div><p>${Array.isArray(editorial.source_display) ? editorial.source_display.filter(source => /^https?:\/\//.test(source.url || '')).map(source => `자료: <a href="${escapeHtml(source.url)}" rel="noopener noreferrer">${escapeHtml(source.label)}</a>`).join('') : escapeHtml(article.source_text || '')}</p></article></div>`;
  html=html.replace(/<title>.*?<\/title>/i,()=>`<title>${escapeHtml(seoTitle)} | 시니어 라이프 뉴스</title>`).replace('<div id="root"></div>',()=>`<div id="root">${firstPaintShell(serverArticle)}</div>`);
  html=replaceMeta(html,'description',description); html=replaceMeta(html,'og:title',article.title,true); html=replaceMeta(html,'og:description',description,true); html=replaceMeta(html,'og:type','article',true); html=replaceMeta(html,'og:url',canonical,true); html=replaceMeta(html,'og:image',socialImage,true); html=replaceMeta(html,'og:image:alt',article.image_alt||`${article.title} | 시니어 라이프 뉴스`,true); html=replaceMeta(html,'twitter:card','summary_large_image'); html=replaceMeta(html,'twitter:title',article.title); html=replaceMeta(html,'twitter:description',description); html=replaceMeta(html,'twitter:image',socialImage);
  const jsonLd=JSON.stringify({'@context':'https://schema.org','@type':'NewsArticle',headline:article.title,description:article.summary,image:[socialImage],datePublished:article.published_at,dateModified:article.updated_at||article.published_at,author:{'@type':article.author_name==='시니어 라이프 뉴스'?'Organization':'Person',name:article.author_name},publisher:{'@type':'Organization',name:'시니어 라이프 뉴스'},mainEntityOfPage:canonical}).replace(/</g,'\\u003c');
  html=html.replace('</head>',`<link rel="canonical" href="${escapeHtml(canonical)}"><script id="article-schema" type="application/ld+json">${jsonLd}</script></head>`);
  const headers=new Headers(asset.headers); headers.set('Content-Type','text/html; charset=utf-8'); headers.set('Cache-Control','public, max-age=60'); return new Response(html,{status:asset.status,headers});
}
