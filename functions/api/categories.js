import { json } from './utils/auth.js';
export async function onRequestGet(context) { const result = await context.env.DB.prepare('SELECT id,name,slug,display_order FROM categories WHERE is_active=1 ORDER BY display_order,name').all(); return json({ categories: result.results }, 200, { 'Cache-Control': 'public, max-age=300' }); }
