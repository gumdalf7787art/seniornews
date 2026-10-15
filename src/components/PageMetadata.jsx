import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { SITE_ORIGIN, pageMetadata, pageTitle, pageSchema } from '../../shared/seo.js';

export default function PageMetadata() {
  const { pathname } = useLocation();
  useEffect(() => {
    const page = pageMetadata(pathname);
    document.getElementById('public-page-schema')?.remove();
    if (!pathname.startsWith('/article/')) document.getElementById('article-schema')?.remove();
    if (!page) return;
    document.title = pageTitle(page);
    for (const [attribute, name, value] of [
      ['name', 'description', page.description],
      ['name', 'twitter:title', pageTitle(page)],
      ['name', 'twitter:description', page.description],
      ['property', 'og:title', pageTitle(page)],
      ['property', 'og:description', page.description],
      ['property', 'og:url', `${SITE_ORIGIN}${pathname}`],
      ['property', 'og:type', 'website'],
    ]) {
      let meta = document.head.querySelector(`meta[${attribute}="${name}"]`);
      if (!meta) { meta = document.createElement('meta'); meta.setAttribute(attribute, name); document.head.append(meta); }
      meta.content = value;
    }
    let canonical = document.head.querySelector('link[rel="canonical"]');
    if (!canonical) { canonical = document.createElement('link'); canonical.rel = 'canonical'; document.head.append(canonical); }
    canonical.href = `${SITE_ORIGIN}${pathname}`;
    const schema = document.createElement('script');
    schema.id = 'public-page-schema';
    schema.type = 'application/ld+json';
    schema.textContent = JSON.stringify(pageSchema(page));
    document.head.append(schema);
  }, [pathname]);
  return null;
}
