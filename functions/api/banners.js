import { json } from './utils/auth.js';
import { activeBannerSql, ensureBannerTable } from './utils/banners.js';

export async function onRequestGet(context) {
  await ensureBannerTable(context.env);
  const result = await context.env.DB.prepare(`SELECT id,name,image_url,image_alt,target_url FROM banners WHERE ${activeBannerSql()} ORDER BY display_order ASC,id DESC`).all();
  return json({ banners: result.results || [] }, 200, { 'Cache-Control': 'public, max-age=60' });
}
