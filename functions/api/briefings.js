import { json } from './utils/auth.js';
import { activeBriefingSql, ensureBriefingTable } from './utils/briefings.js';

export async function onRequestGet(context) {
  await ensureBriefingTable(context.env);
  const result = await context.env.DB.prepare(`SELECT id,category,message,target_url FROM senior_briefings WHERE ${activeBriefingSql()} ORDER BY display_order ASC,id DESC LIMIT 5`).all();
  return json({ briefings: result.results || [] }, 200, { 'Cache-Control': 'public, max-age=60' });
}
