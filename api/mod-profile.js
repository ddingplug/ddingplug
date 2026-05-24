import { getServerSupabase, sendJson, sendServerError, withCors, verifyModApiKey } from './_supabase.js';

const MAX_BODY_BYTES = 8 * 1024;
const MINECRAFT_ID_RE = /^[A-Za-z0-9_]{3,16}$/;

async function readBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_BODY_BYTES) {
      const error = new Error('Request body too large');
      error.statusCode = 413;
      throw error;
    }
    chunks.push(chunk);
  }
  const raw = Buffer.concat(chunks).toString('utf8');
  if (!raw) return {};
  return JSON.parse(raw);
}

function cleanText(value, max = 80) {
  return String(value || '').trim().slice(0, max);
}

function displayName(profile) {
  return profile?.korean_nickname || profile?.minecraft_id || profile?.username || null;
}

function queryMinecraftId(req) {
  const queryValue = req.query?.minecraftId || req.query?.minecraft_id;
  if (queryValue) return cleanText(queryValue, 16);
  const url = new URL(req.url || '/', 'http://localhost');
  return cleanText(url.searchParams.get('minecraftId') || url.searchParams.get('minecraft_id'), 16);
}

export default async function handler(req, res) {
  if (withCors(req, res, { allowMinecraftMod: true })) return;
  if (req.method !== 'GET' && req.method !== 'POST') {
    return sendJson(res, 405, { ok: false, error: 'Method not allowed' });
  }

  const key = verifyModApiKey(req);
  if (!key.ok) return sendJson(res, 401, { ok: false, error: key.error });

  try {
    const body = req.method === 'POST' ? await readBody(req) : {};
    const minecraftId = cleanText(body.minecraftId || body.minecraft_id || queryMinecraftId(req), 16);
    if (!minecraftId) {
      return sendJson(res, 400, { ok: false, error: 'minecraftId is required.' });
    }
    if (!MINECRAFT_ID_RE.test(minecraftId)) {
      return sendJson(res, 400, { ok: false, error: 'Invalid minecraftId.' });
    }

    const supabase = getServerSupabase({ service: true });
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('minecraft_id,korean_nickname,username,minecraft_avatar_url,avatar_url')
      .ilike('minecraft_id', minecraftId)
      .limit(1);
    if (error) throw error;

    const profile = profiles?.[0] || null;
    return sendJson(res, 200, {
      ok: true,
      minecraftId,
      registered: Boolean(profile),
      profile: profile ? {
        minecraftId: profile.minecraft_id,
        displayName: displayName(profile),
        avatarUrl: profile.minecraft_avatar_url || profile.avatar_url || null,
      } : null,
    });
  } catch (error) {
    if (error.statusCode) return sendJson(res, error.statusCode, { ok: false, error: error.message });
    if (error instanceof SyntaxError) return sendJson(res, 400, { ok: false, error: 'Invalid JSON body.' });
    return sendServerError(res, error);
  }
}
