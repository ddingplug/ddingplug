import { getServerSupabase, sendJson, withCors, normalizeCategory, toNumber, verifyModApiKey } from './_supabase.js';

async function readBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString('utf8');
  if (!raw) return {};
  return JSON.parse(raw);
}

function normalizeItems(body) {
  if (Array.isArray(body.items)) return body.items;
  if (body.itemKey || body.itemName || body.price) return [body];
  return [];
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

    const supabase = getServerSupabase({ service: true });
    const requestedKeys = [...new Set(items.map((item) => item.itemKey).filter(Boolean))];
    const requestedNames = [...new Set(items.map((item) => item.itemName).filter(Boolean))];

    let lookupQuery = supabase
      .from('market_prices')
      .select('item_key,item_name,category,price,price_max,price_change')
      .eq('category', category);

    if (requestedKeys.length) lookupQuery = lookupQuery.in('item_key', requestedKeys);
    else lookupQuery = lookupQuery.in('item_name', requestedNames);

    const { data: knownRows, error: lookupError } = await lookupQuery;
    if (lookupError) throw lookupError;

    const byKey = new Map((knownRows || []).map((row) => [row.item_key, row]));
    const byName = new Map((knownRows || []).map((row) => [row.item_name, row]));

    let reporterProfile = null;
    const minecraftId = String(body.minecraftId || '').trim();
    if (minecraftId) {
      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('id,minecraft_id')
        .ilike('minecraft_id', minecraftId)
        .limit(1);
      if (!profileError && profiles?.length) reporterProfile = profiles[0];
    }

    const accepted = [];
    const rejected = [];

    for (const input of items) {
      const row = input.itemKey ? byKey.get(input.itemKey) : byName.get(input.itemName);
      const price = toNumber(input.price);
      const personalPrice = input.personalPrice === undefined || input.personalPrice === null || input.personalPrice === '' ? null : toNumber(input.personalPrice);
      const priceChange = input.priceChange === undefined || input.priceChange === null || input.priceChange === '' ? null : toNumber(input.priceChange);

      if (!row) {
        rejected.push({ itemKey: input.itemKey || null, itemName: input.itemName || null, reason: 'Unknown item' });
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

      if (Number(row.price || 0) !== price || (row.price_change ?? null) !== priceChange) {
        const { error: updateError } = await supabase
          .from('market_prices')
          .update({
            price,
            price_change: priceChange,
            updated_by: reporterProfile?.id || null,
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
          changed_by: reporterProfile?.id || null,
          source: body.source || 'minecraft_tooltip',
          reporter_minecraft_id: minecraftId || null,
          raw_payload: { item: input, request: { source: body.source || 'minecraft_tooltip', consentAccepted: body.consentAccepted === true }, priceChange, personalPrice },
        });
        if (logError) throw logError;
      }

      accepted.push({
        itemKey: row.item_key,
        itemName: row.item_name,
        oldPrice: Number(row.price || 0),
        newPrice: price,
        changed: Number(row.price || 0) !== price,
        priceChange,
      });
    }

    return sendJson(res, 200, {
      ok: true,
      category,
      reporter: {
        minecraftId: minecraftId || null,
        matchedProfile: Boolean(reporterProfile),
      },
      accepted,
      rejected,
    });
  } catch (error) {
    return sendJson(res, 500, { ok: false, error: error.message || 'Internal server error' });
  }
}
