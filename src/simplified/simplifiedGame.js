export const MAX_PLAYERS = 6;
export const MIN_PLAYERS = 2;
export const MAX_HAND_SIZE = 10;
export const TOTAL_SEASONS = 3;
export const MONKEYS_TO_END_SEASON = 3;
export const MAX_SITE_POSITION = 5;
export const NORMAL_CARDS_PER_DECK = 42;
export const MONKEY_CARDS_PER_DECK = 3;

export const SITE_COLORS = ["blue", "green", "red", "yellow", "purple", "orange"];
export const ROLES = [
  "guide",
  "photographer",
  "botanist",
  "linguist",
  "physician",
  "patron",
  "mercenary",
];

function createSitePositions() {
  return Object.fromEntries(SITE_COLORS.map((color) => [color, 0]));
}

function createPlayer(name, index) {
  return {
    id: `player-${index + 1}`,
    name: String(name).trim(),
    hand: [],
    expeditions: [],
    score: 0,
    sitePositions: createSitePositions(),
  };
}

function validatePlayerNames(playerNames) {
  if (
    !Array.isArray(playerNames) ||
    playerNames.length < MIN_PLAYERS ||
    playerNames.length > MAX_PLAYERS
  ) {
    throw new Error(`A partida precisa ter entre ${MIN_PLAYERS} e ${MAX_PLAYERS} jogadores.`);
  }

  if (playerNames.some((name) => !String(name).trim())) {
    throw new Error("Todos os jogadores precisam ter um nome válido.");
  }
}

export function setupGame(playerNames, rng = Math.random) {
  validatePlayerNames(playerNames);

  const firstPlayerIndex = Math.floor(rng() * playerNames.length);

  return {
    players: playerNames.map((name, index) => createPlayer(name, index)),
    currentPlayerIndex: firstPlayerIndex,
    firstPlayerIndex,
    deck: [],
    display: [],
    revealedMonkeys: 0,
    currentSeason: 1,
    totalSeasons: TOTAL_SEASONS,
    phase: "playing",
  };
}

// === ETAPA 3: Expedições e avanço nas trilhas ===

function clone(value) {
  return structuredClone(value);
}

export function validateExpedition(leader, selectedCards, selectedTrait) {
  if (selectedTrait === "color") {
    return selectedCards.every((card) => card.color === leader.color);
  }
  if (selectedTrait === "role") {
    return selectedCards.every((card) => card.role === leader.role);
  }
  return false;
}

export function advanceSite(game, playerId, expedition) {
  const size = 1 + expedition.cards.length;
  if (size < 2) return game;

  const next = clone(game);
  const player = next.players.find((p) => p.id === playerId);
  const leaderColor = expedition.leader.color;
  player.sitePositions[leaderColor] = Math.min(
    player.sitePositions[leaderColor] + 1,
    MAX_SITE_POSITION,
  );
  return next;
}

export function playExpedition(game, playerId, leaderCardId, selectedTrait, selectedCardIds) {
  if (selectedCardIds.includes(leaderCardId)) {
    throw new Error("O líder não deve ser incluído em selectedCardIds.");
  }

  const player = game.players.find((p) => p.id === playerId);
  if (!player) {
    throw new Error("Jogador não encontrado.");
  }

  const leader = player.hand.find((c) => c.id === leaderCardId);
  if (!leader) {
    throw new Error("Carta não encontrada na mão ou no display.");
  }

  const selectedCards = selectedCardIds.map((id) => {
    const card = player.hand.find((c) => c.id === id);
    if (!card) {
      throw new Error("Carta não encontrada na mão ou no display.");
    }
    return card;
  });

  if (!validateExpedition(leader, selectedCards, selectedTrait)) {
    throw new Error("Expedição inválida: carta não corresponde ao critério escolhido.");
  }

  const next = clone(game);
  const nextPlayer = next.players.find((p) => p.id === playerId);

  const expedition = {
    leader: clone(leader),
    cards: clone(selectedCards),
    selectedTrait,
  };

  const expeditionSize = 1 + selectedCards.length;
  if (expeditionSize >= 2) {
    nextPlayer.sitePositions[leader.color] = Math.min(
      nextPlayer.sitePositions[leader.color] + 1,
      MAX_SITE_POSITION,
    );
  }

  nextPlayer.expeditions.push(expedition);

  const expeditionCardIds = new Set([leaderCardId, ...selectedCardIds]);
  const remainingCards = nextPlayer.hand.filter((c) => !expeditionCardIds.has(c.id));
  next.display.push(...remainingCards);
  nextPlayer.hand = [];

  return next;
}
