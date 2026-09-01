export async function ensureBannerTable(env) {
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS banners (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    image_url TEXT NOT NULL,
    image_alt TEXT NOT NULL,
    target_url TEXT NOT NULL,
    display_order INTEGER NOT NULL DEFAULT 0,
    is_active INTEGER NOT NULL DEFAULT 1,
    starts_at TEXT,
    ends_at TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`).run();
  await env.DB.prepare('CREATE INDEX IF NOT EXISTS idx_banners_active ON banners(is_active, display_order)').run();
}

export function validateBanner(data) {
  const name = String(data.name || '').trim();
  const imageUrl = String(data.image_url || '').trim();
  const imageAlt = String(data.image_alt || '').trim();
  const targetUrl = String(data.target_url || '').trim();
  if (!name || !imageUrl || !imageAlt || !targetUrl) return '광고명, 배너 이미지, 이미지 설명, 연결 주소를 모두 입력해 주세요.';
  try {
    const url = new URL(targetUrl);
    if (!['http:', 'https:'].includes(url.protocol)) throw new Error();
  } catch {
    return '연결 주소는 https:// 또는 http://로 시작하는 올바른 주소여야 합니다.';
  }
  return null;
}

export function activeBannerSql() {
  return "is_active=1 AND (starts_at IS NULL OR starts_at='' OR starts_at<=CURRENT_TIMESTAMP) AND (ends_at IS NULL OR ends_at='' OR ends_at>=CURRENT_TIMESTAMP)";
}
