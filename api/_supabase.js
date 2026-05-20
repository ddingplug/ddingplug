import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

export function getServerSupabase({ service = false } = {}) {
  // [SECURITY FIX] service=false는 반드시 anonKey를 사용해야 RLS가 정상 동작함
  // 이전 코드: service=false여도 serviceRoleKey가 있으면 RLS를 완전 우회했음
  const key = service ? serviceRoleKey : anonKey;
  if (!supabaseUrl || !key) {
    throw new Error(
      service
        ? 'SUPABASE_SERVICE_ROLE_KEY가 설정되지 않았습니다.'
        : 'SUPABASE_ANON_KEY 또는 VITE_SUPABASE_ANON_KEY가 설정되지 않았습니다.'
    );
  }
  return createClient(supabaseUrl, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function sendJson(res, status, payload) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(payload));
}

// [SECURITY FIX] CORS 와일드카드(*) 제거
// .env에 DDINGPLUG_ALLOWED_ORIGIN=https://your-domain.vercel.app 추가 필요
// 미설정 시 Mod API(market-report)만 localhost를 허용하고 나머지는 차단됨
const ALLOWED_ORIGIN = process.env.DDINGPLUG_ALLOWED_ORIGIN || '';

export function withCors(req, res, { allowMinecraftMod = false } = {}) {
  const origin = req.headers['origin'] || '';
  let allow = false;

  if (ALLOWED_ORIGIN && origin === ALLOWED_ORIGIN) {
    allow = true;
  } else if (allowMinecraftMod) {
    // Minecraft 모드는 origin 헤더 없이 서버→서버로 요청함 → origin 없으면 허용
    allow = !origin;
  } else if (!ALLOWED_ORIGIN && /^http:\/\/localhost(:\d+)?$/.test(origin)) {
    allow = true; // 개발 환경 fallback
  }

  if (allow || !origin) {
    res.setHeader('Access-Control-Allow-Origin', origin || '*');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-ddingplug-api-key');
  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return true;
  }
  if (!allow && origin) {
    res.statusCode = 403;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify({ ok: false, error: 'CORS: origin not allowed' }));
    return true;
  }
  return false;
}

export function normalizeCategory(category) {
  const value = String(category || '').trim().toLowerCase();
  if (value === 'craft' || value === 'cooking') return value;
  return null;
}

export function toNumber(value) {
  if (value === null || value === undefined || value === '') return NaN;
  const n = Number(String(value).replaceAll(',', '').trim());
  return Number.isFinite(n) ? n : NaN;
}

export function toPercent(price, priceMax) {
  const p = Number(price || 0);
  const max = Number(priceMax || 0);
  if (!max) return 0;
  return Math.round((p / max) * 100);
}

export function sanitizeItem(row) {
  return {
    itemKey: row.item_key,
    itemName: row.item_name,
    category: row.category,
    price: Number(row.price || 0),
    priceMax: Number(row.price_max || 0),
    percent: toPercent(row.price, row.price_max),
    updateCycle: row.update_cycle,
    checkedAt: row.checked_at,
    updatedAt: row.updated_at,
    priceChange: row.price_change === null || row.price_change === undefined ? null : Number(row.price_change),
  };
}

export function verifyModApiKey(req) {
  const expected = process.env.DDINGPLUG_MOD_API_KEY;
  if (!expected) return { ok: false, error: 'DDINGPLUG_MOD_API_KEY is not configured.' };
  const received = req.headers['x-ddingplug-api-key'];
  if (!received || received !== expected) return { ok: false, error: 'Invalid API key.' };
  return { ok: true };
}
