import {
  clampStats,
  readPlayer,
  writePlayer,
  upsertLeaderboard,
  json,
  corsHeaders,
} from '../../_lib/game-kv.js';

export async function onRequestOptions() {
  return new Response(null, { headers: corsHeaders() });
}

/** POST /api/game/save — 仅在过关或游戏结束时调用 */
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
  const merged = {
    playerId: data.playerId,
    nickname: data.nickname,
    bestScore: Math.max(existing.bestScore || 0, data.bestScore),
    maxLevel: Math.max(existing.maxLevel || 1, data.maxLevel),
  };

  await writePlayer(kv, merged);
  const leaderboard = await upsertLeaderboard(kv, merged);

  return json({
    ok: true,
    kv: true,
    bestScore: merged.bestScore,
    maxLevel: merged.maxLevel,
    leaderboard: leaderboard.map(({ nickname, bestScore, maxLevel }) => ({
      nickname,
      bestScore,
      maxLevel,
    })),
  });
}
