import {
  readLeaderboard,
  json,
  corsHeaders,
} from '../../_lib/game-kv.js';

export async function onRequestOptions() {
  return new Response(null, { headers: corsHeaders() });
}

/** GET /api/game/leaderboard */
export async function onRequestGet(context) {
  const { env } = context;
  const kv = env.GAME_KV;
  if (!kv) {
    return json({ entries: [], kv: false });
  }

  const list = await readLeaderboard(kv);
  return json({
    kv: true,
    entries: list.map(({ nickname, bestScore, maxLevel }) => ({
      nickname,
      bestScore,
      maxLevel,
    })),
  });
}
