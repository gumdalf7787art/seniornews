export async function ensureBriefingTable(env) {
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS senior_briefings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category TEXT NOT NULL DEFAULT '생활',
    message TEXT NOT NULL,
    target_url TEXT NOT NULL,
    display_order INTEGER NOT NULL DEFAULT 0,
    is_active INTEGER NOT NULL DEFAULT 1,
    starts_at TEXT,
    ends_at TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`).run();
  await env.DB.prepare('CREATE INDEX IF NOT EXISTS idx_senior_briefings_active ON senior_briefings(is_active, display_order)').run();
}

export function validateBriefing(data) {
  const category = String(data.category || '').trim();
  const message = String(data.message || '').trim();
  const targetUrl = String(data.target_url || '').trim();
  if (!category || !message || !targetUrl) return '분류, 알림 문구, 연결 주소를 모두 입력해 주세요.';
  if (message.length > 120) return '알림 문구는 120자 이내로 입력해 주세요.';
  try {
    const url = new URL(targetUrl, 'https://seniorlifenews.pages.dev');
    if (!['http:', 'https:'].includes(url.protocol)) throw new Error();
  } catch {
    return '연결 주소를 확인해 주세요.';
  }
  return null;
}

export function activeBriefingSql() {
  return "is_active=1 AND (starts_at IS NULL OR starts_at='' OR starts_at<=CURRENT_TIMESTAMP) AND (ends_at IS NULL OR ends_at='' OR ends_at>=CURRENT_TIMESTAMP)";
}
