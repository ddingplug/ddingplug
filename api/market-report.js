import { getServerSupabase, sendJson, sendServerError, withCors, normalizeCategory, toNumber, verifyModApiKey } from './_supabase.js';

const MAX_BODY_BYTES = 64 * 1024;
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

function normalizeItems(body) {
  if (Array.isArray(body.items)) return body.items;
  if (body.itemKey || body.itemName || body.price) return [body];
  return [];
}

function cleanText(value, max = 80) {
  return String(value || '').trim().slice(0, max);
}

export default async function handler(req, res) {
  if (withCors(req, res, { allowMinecraftMod: true })) return;
  if (req.method !== 'POST') return sendJson(res, 405, { ok: false, error: 'Method not allowed' });

  const key = verifyModApiKey(req);
  if (!key.ok) return sendJson(res, 401, { ok: false, error: key.error });

  try {
    const body = await readBody(req);
    if (body.consentAccepted !== true) {
      return sendJson(res, 400, {
        ok: false,
        error: 'User consent is required. Send consentAccepted: true after informing the user about DDING PLUG mod/API data submission.'
      });
    }
    const category = normalizeCategory(body.category);
    if (!category) return sendJson(res, 400, { ok: false, error: 'Invalid category. category must be craft or cooking.' });

    const items = normalizeItems(body);
    if (!items.length) return sendJson(res, 400, { ok: false, error: 'items is required.' });
    if (items.length > 30) return sendJson(res, 400, { ok: false, error: 'Too many items. Maximum is 30.' });

    const minecraftId = cleanText(body.minecraftId, 16);
    if (!minecraftId) {
      return sendJson(res, 403, {
        ok: false,
        code: 'PROFILE_REQUIRED',
        error: '띵플러그 웹사이트 가입 후 마인크래프트 ID를 등록해야 시세 제보가 가능합니다.'
      });
    }
    if (minecraftId && !MINECRAFT_ID_RE.test(minecraftId)) {
      return sendJson(res, 400, { ok: false, error: 'Invalid minecraftId.' });
    }
    const source = cleanText(body.source || 'minecraft_tooltip', 40) || 'minecraft_tooltip';
    const supabase = getServerSupabase({ service: true });
    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('id,minecraft_id')
      .ilike('minecraft_id', minecraftId)
      .limit(1);
    if (profileError) throw profileError;
    const reporterProfile = profiles?.[0] || null;
    if (!reporterProfile) {
      return sendJson(res, 403, {
        ok: false,
        code: 'PROFILE_REQUIRED',
        error: '띵플러그 웹사이트 가입 후 마인크래프트 ID를 등록해야 시세 제보가 가능합니다.'
      });
    }

    const requestedKeys = [...new Set(items.map((item) => cleanText(item.itemKey, 80)).filter(Boolean))];
    const requestedNames = [...new Set(items.map((item) => cleanText(item.itemName, 120)).filter(Boolean))];

    let lookupQuery = supabase
      .from('market_prices')
      .select('item_key,item_name,category,price,price_max,price_change')
      .eq('category', category);

    if (requestedKeys.length) lookupQuery = lookupQuery.in('item_key', requestedKeys);
    else lookupQuery = lookupQuery.in('item_name', requestedNames);

    const { data: knownRows, error: lookupError } = await lookupQuery;
    if (lookupError) throw lookupError;

    let allKnownRows = knownRows || [];
    if (requestedKeys.length && requestedNames.length) {
      const knownNames = new Set(allKnownRows.map((row) => row.item_name));
      const missingNames = requestedNames.filter((name) => !knownNames.has(name));
      if (missingNames.length) {
        const { data: nameRows, error: nameLookupError } = await supabase
          .from('market_prices')
          .select('item_key,item_name,category,price,price_max,price_change')
          .eq('category', category)
          .in('item_name', missingNames);
        if (nameLookupError) throw nameLookupError;
        allKnownRows = [...allKnownRows, ...(nameRows || [])];
      }
    }

    const byKey = new Map(allKnownRows.map((row) => [row.item_key, row]));
    const byName = new Map(allKnownRows.map((row) => [row.item_name, row]));

    const accepted = [];
    const rejected = [];

    for (const input of items) {
      const inputKey = cleanText(input.itemKey, 80);
      const inputName = cleanText(input.itemName, 120);
      const row = inputKey ? byKey.get(inputKey) : byName.get(inputName);
      const price = toNumber(input.price);
      const personalPrice = input.personalPrice === undefined || input.personalPrice === null || input.personalPrice === '' ? null : toNumber(input.personalPrice);
      const priceChange = input.priceChange === undefined || input.priceChange === null || input.priceChange === '' ? null : toNumber(input.priceChange);

      if (!row) {
        rejected.push({ itemKey: inputKey || null, itemName: inputName || null, reason: 'Unknown item' });
        continue;
      }
      if (!Number.isFinite(price) || price <= 0) {
        rejected.push({ itemKey: row.item_key, itemName: row.item_name, reason: 'Invalid price' });
        continue;
      }
      if (personalPrice !== null && (!Number.isFinite(personalPrice) || personalPrice <= 0)) {
        rejected.push({ itemKey: row.item_key, itemName: row.item_name, reason: 'Invalid personalPrice' });
        continue;
      }
      if (priceChange !== null && !Number.isFinite(priceChange)) {
        rejected.push({ itemKey: row.item_key, itemName: row.item_name, reason: 'Invalid priceChange' });
        continue;
      }
      if (Number(row.price_max || 0) > 0 && price > Number(row.price_max)) {
        rejected.push({ itemKey: row.item_key, itemName: row.item_name, reason: 'Price exceeds max price' });
        continue;
      }

      const priceChanged = Number(row.price || 0) !== price;
      const oldPriceChange = row.price_change === null || row.price_change === undefined ? null : Number(row.price_change);
      const priceChangeChanged = oldPriceChange !== priceChange;

      if (priceChanged || priceChangeChanged) {
        const { error: updateError } = await supabase
          .from('market_prices')
          .update({
            price,
            price_change: priceChange,
            updated_by: reporterProfile.id,
            checked_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('item_key', row.item_key)
          .eq('category', category);
        if (updateError) throw updateError;

        const { error: logError } = await supabase.from('market_price_logs').insert({
          item_key: row.item_key,
          item_name: row.item_name,
          category,
          old_price: row.price,
          new_price: price,
          changed_by: reporterProfile.id,
          source,
          reporter_minecraft_id: reporterProfile.minecraft_id || minecraftId,
          raw_payload: {
            item: { itemKey: inputKey || null, itemName: inputName || null, price, priceChange, personalPrice },
            request: { source, consentAccepted: body.consentAccepted === true },
          },
        });
        if (logError) throw logError;
      }

      accepted.push({
        itemKey: row.item_key,
        itemName: row.item_name,
        oldPrice: Number(row.price || 0),
        newPrice: price,
        changed: priceChanged || priceChangeChanged,
        priceChanged,
        priceChangeChanged,
        priceChange,
      });
    }

    return sendJson(res, 200, {
      ok: true,
      category,
      reporter: {
        minecraftId: reporterProfile.minecraft_id || minecraftId,
        matchedProfile: true,
      },
      accepted,
      rejected,
    });
  } catch (error) {
    if (error.statusCode) return sendJson(res, error.statusCode, { ok: false, error: error.message });
    if (error instanceof SyntaxError) return sendJson(res, 400, { ok: false, error: 'Invalid JSON body.' });
    return sendServerError(res, error);
  }
}
