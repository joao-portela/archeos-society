const EXPEDITION_SCORE = { 1: 0, 2: 1, 3: 3, 4: 6, 5: 10 };
const EXPEDITION_SCORE_MAX = 15;

const SITE_SCORE = { 0: 0, 1: 2, 2: 5, 3: 9, 4: 14, 5: 20 };

export function scoreExpedition(expedition) {
  const size = 1 + expedition.cards.length;
  if (size >= 6) return EXPEDITION_SCORE_MAX;
  return EXPEDITION_SCORE[size] ?? 0;
}

export function scoreSites(player) {
  return Object.values(player.sitePositions).reduce(
    (sum, pos) => sum + (SITE_SCORE[pos] ?? 0),
    0,
  );
}

export function scoreSeason(game) {
  for (const player of game.players) {
    const expeditionPoints = player.expeditions.reduce(
      (sum, expedition) => sum + scoreExpedition(expedition),
      0,
    );
    const sitePoints = scoreSites(player);
    player.score += expeditionPoints + sitePoints;
  }
}
