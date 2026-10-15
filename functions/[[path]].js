import { PUBLIC_SITE_ORIGIN } from './api/utils/site.js';
import { publicPages, pageMetadata, pageTitle, pageSchema } from '../shared/seo.js';

function escapeHtml(value=''){return String(value).replace(/[&<>'"]/g,(char)=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]));}
function replaceMeta(html,name,value,property=false){const attribute=property?'property':'name';const expression=new RegExp(`<meta\\s+${attribute}=["']${name}["'][^>]*>`,'i');const tag=`<meta ${attribute}="${name}" content="${escapeHtml(value)}">`;return expression.test(html)?html.replace(expression,tag):html.replace('</head>',`${tag}</head>`);}

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
    if (env.DB && (pathname === '/' || pathname.startsWith('/category/'))) {
      const category = pathname.startsWith('/category/') ? page.slug : null;
      try {
        const result = await env.DB.prepare(`SELECT a.slug,a.title,a.summary FROM articles a JOIN categories c ON c.id=a.category_id WHERE a.status='published' AND a.published_at<=CURRENT_TIMESTAMP${category ? ' AND c.slug=?' : ''} ORDER BY a.published_at DESC LIMIT 30`).bind(...(category ? [category] : [])).all();
        articles = result.results.map((item) => `<article><h2><a href="/article/${encodeURIComponent(item.slug)}">${escapeHtml(item.title)}</a></h2><p>${escapeHtml(item.summary)}</p></article>`).join('');
      } catch (error) {
        console.error('Public page article rendering failed', error);
      }
    }
    const breadcrumbs = pathname === '/' ? '' : `<nav aria-label="현재 위치"><a href="/">시니어 라이프 뉴스</a> / ${escapeHtml(page.name)}</nav>`;
    html = html.replace('<div id="root"></div>', `<div id="root"><div class="container"><nav aria-label="주요 메뉴">${links}</nav><main>${breadcrumbs}<h1>${escapeHtml(page.name)}</h1><p>${escapeHtml(page.description)}</p>${articles}</main></div></div>`);
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
  const article=await context.env.DB.prepare("SELECT a.title,a.summary,a.body_text,a.image_url,a.image_alt,a.published_at,a.updated_at,a.source_text,c.name category_name,u.name author_name FROM articles a JOIN categories c ON c.id=a.category_id JOIN users u ON u.id=a.author_id WHERE a.slug=? AND a.status='published' AND a.published_at<=CURRENT_TIMESTAMP").bind(decodeURIComponent(match[1])).first();
  if(!article)return context.next();
  const asset=await context.next(); if(!asset.headers.get('Content-Type')?.includes('text/html'))return asset;
  let html=await asset.text(); const canonical=`${PUBLIC_SITE_ORIGIN}${url.pathname}`; const defaultImage=`${PUBLIC_SITE_ORIGIN}/images/og-senior-life-news-v3.png`; const socialImage=article.image_url||defaultImage; const paragraphs=article.body_text.split(/\n+/).filter(Boolean).map((text)=>`<p>${escapeHtml(text)}</p>`).join('');
  const serverArticle=`<article data-server-rendered="true"><p>${escapeHtml(article.category_name)}</p><h1>${escapeHtml(article.title)}</h1><p>${escapeHtml(article.summary)}</p><p>${escapeHtml(article.author_name)} · ${escapeHtml(article.published_at)}</p>${article.image_url?`<img src="${escapeHtml(article.image_url)}" alt="${escapeHtml(article.image_alt||'')}">`:''}<div>${paragraphs}</div></article>`;
  html=html.replace(/<title>.*?<\/title>/i,`<title>${escapeHtml(article.title)} | 시니어 라이프 뉴스</title>`).replace('<div id="root"></div>',`<div id="root">${serverArticle}</div>`);
  html=replaceMeta(html,'description',article.summary); html=replaceMeta(html,'og:title',article.title,true); html=replaceMeta(html,'og:description',article.summary,true); html=replaceMeta(html,'og:type','article',true); html=replaceMeta(html,'og:url',canonical,true); html=replaceMeta(html,'og:image',socialImage,true); html=replaceMeta(html,'og:image:alt',article.image_alt||`${article.title} | 시니어 라이프 뉴스`,true); html=replaceMeta(html,'twitter:card','summary_large_image'); html=replaceMeta(html,'twitter:title',article.title); html=replaceMeta(html,'twitter:description',article.summary); html=replaceMeta(html,'twitter:image',socialImage);
  const jsonLd=JSON.stringify({'@context':'https://schema.org','@type':'NewsArticle',headline:article.title,description:article.summary,image:[socialImage],datePublished:article.published_at,dateModified:article.updated_at||article.published_at,author:{'@type':'Person',name:article.author_name},publisher:{'@type':'Organization',name:'시니어 라이프 뉴스'},mainEntityOfPage:canonical}).replace(/</g,'\\u003c');
  html=html.replace('</head>',`<link rel="canonical" href="${escapeHtml(canonical)}"><script id="article-schema" type="application/ld+json">${jsonLd}</script></head>`);
  const headers=new Headers(asset.headers); headers.set('Content-Type','text/html; charset=utf-8'); headers.set('Cache-Control','public, max-age=60'); return new Response(html,{status:asset.status,headers});
}
