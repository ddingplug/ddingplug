import { getServerSupabase, sendJson, withCors, normalizeCategory } from './_supabase.js';

function displayName(profile) {
  if (!profile) return '알 수 없음';
  return profile.korean_nickname || profile.minecraft_id || profile.username || '알 수 없음';
}

export default async function handler(req, res) {
  if (withCors(req, res)) return;
  if (req.method !== 'GET') return sendJson(res, 405, { ok: false, error: 'Method not allowed' });

  try {
    const category = normalizeCategory(req.query?.category);
    const supabase = getServerSupabase();

    let logQuery = supabase
      .from('market_price_logs')
      .select('id,item_key,item_name,category,old_price,new_price,changed_by,created_at,source,reporter_minecraft_id')
      .in('category', ['craft', 'cooking'])
      .order('created_at', { ascending: false })
      .limit(category ? 1 : 2);

    if (category) logQuery = logQuery.eq('category', category);

    const { data: logs, error: logError } = await logQuery;
    if (logError) throw logError;

    const userIds = [...new Set((logs || []).map((log) => log.changed_by).filter(Boolean))];
    let profileMap = new Map();
    if (userIds.length) {
      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('id,username,korean_nickname,minecraft_id,minecraft_avatar_url,avatar_url')
        .in('id', userIds);
      if (profileError) throw profileError;
      profileMap = new Map((profiles || []).map((profile) => [profile.id, profile]));
    }

    const latest = (logs || []).map((log) => {
      const profile = profileMap.get(log.changed_by);
      return {
        category: log.category,
        categoryLabel: log.category === 'craft' ? '공예품 시세' : '요리 시세',
        updatedAt: log.created_at,
        source: log.source || 'web',
        reporterMinecraftId: log.reporter_minecraft_id || profile?.minecraft_id || null,
        displayName: displayName(profile) || log.reporter_minecraft_id || '알 수 없음',
        avatarUrl: profile?.minecraft_avatar_url || profile?.avatar_url || null,
      };
    });

    return sendJson(res, 200, {
      ok: true,
      category: category || 'all',
      latest: category ? (latest[0] || null) : latest,
    });
  } catch (error) {
    return sendJson(res, 500, { ok: false, error: error.message || 'Internal server error' });
  }
}
