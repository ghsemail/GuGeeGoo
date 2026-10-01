import {
  clampStats,
  readPlayer,
  writePlayer,
  mergePlayer,
  upsertLeaderboard,
  json,
  corsHeaders,
} from '../../_lib/game-kv.js';

export async function onRequestOptions() {
  return new Response(null, { headers: corsHeaders() });
}

/** POST /api/game/save — 过关、结束或商店兑换后调用 */
export async function onRequestPost(context) {
  const { env, request } = context;
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'invalid json' }, 400);
  }

  const data = clampStats(body);
  if (!data.playerId) {
    return json({ error: 'missing playerId' }, 400);
  }

  const kv = env.GAME_KV;
  if (!kv) {
    return json({ ok: true, kv: false, leaderboard: [] });
  }

  const existing = (await readPlayer(kv, data.playerId)) || {};
  const merged = mergePlayer(existing, data);

  await writePlayer(kv, merged);
  const leaderboard = await upsertLeaderboard(kv, merged);

  return json({
    ok: true,
    kv: true,
    bestScore: merged.bestScore,
    maxLevel: merged.maxLevel,
    lifetimeEarned: merged.lifetimeEarned,
    lifetimeSpent: merged.lifetimeSpent,
    ownedItemIds: merged.ownedItemIds,
    inventory: merged.inventory,
    equippedIds: merged.equippedIds,
    loadoutIds: merged.loadoutIds,
    equippedWeaponId: merged.equippedWeaponId,
    levelStats: merged.levelStats,
    leaderboard: leaderboard.map(({ nickname, bestScore, maxLevel }) => ({
      nickname,
      bestScore,
      maxLevel,
    })),
  });
}
