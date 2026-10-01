import {
  readPlayer,
  json,
  corsHeaders,
} from '../../_lib/game-kv.js';

export async function onRequestOptions() {
  return new Response(null, { headers: corsHeaders() });
}

/** GET /api/game/stats?playerId=... */
export async function onRequestGet(context) {
  const { env, request } = context;
  const url = new URL(request.url);
  const playerId = url.searchParams.get('playerId')?.slice(0, 64) || '';

  if (!playerId) {
    return json({ error: 'missing playerId' }, 400);
  }

  const kv = env.GAME_KV;
  if (!kv) {
    return json(
      {
        bestScore: 0,
        maxLevel: 1,
        nickname: null,
        lifetimeEarned: 0,
        lifetimeSpent: 0,
        ownedItemIds: [],
        inventory: {},
        equippedIds: [],
        loadoutIds: [],
        kv: false,
      },
      200
    );
  }

  const saved = await readPlayer(kv, playerId);
  if (!saved) {
    return json({
      bestScore: 0,
      maxLevel: 1,
      nickname: null,
      lifetimeEarned: 0,
      lifetimeSpent: 0,
      ownedItemIds: [],
      inventory: {},
      equippedIds: [],
      loadoutIds: [],
      kv: true,
    });
  }

  return json({
    bestScore: saved.bestScore ?? 0,
    maxLevel: saved.maxLevel ?? 1,
    nickname: saved.nickname ?? null,
    lifetimeEarned: saved.lifetimeEarned ?? 0,
    lifetimeSpent: saved.lifetimeSpent ?? 0,
    ownedItemIds: saved.ownedItemIds ?? [],
    inventory: saved.inventory ?? {},
    equippedIds: saved.equippedIds ?? [],
    loadoutIds: saved.loadoutIds ?? [],
    kv: true,
  });
}
