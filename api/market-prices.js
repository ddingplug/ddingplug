import { getServerSupabase, sendJson, sendServerError, withCors, normalizeCategory, sanitizeItem } from './_supabase.js';

export default async function handler(req, res) {
  if (withCors(req, res)) return;
  if (req.method !== 'GET') return sendJson(res, 405, { ok: false, error: 'Method not allowed' });

  try {
    const category = normalizeCategory(req.query?.category);
    const supabase = getServerSupabase();
    let query = supabase
      .from('market_prices')
      .select('item_key,item_name,category,price,price_max,price_change,update_cycle,checked_at,updated_at')
      .in('category', ['craft', 'cooking'])
      .order('category', { ascending: true })
      .order('id', { ascending: true });

    if (category) query = query.eq('category', category);

    const { data, error } = await query;
    if (error) throw error;

    return sendJson(res, 200, {
      ok: true,
      category: category || 'all',
      count: data.length,
      items: data.map(sanitizeItem),
    });
  } catch (error) {
    return sendServerError(res, error);
  }
}
