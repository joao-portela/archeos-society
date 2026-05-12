import { scoreSeason } from "./scoring.js";

export const MAX_PLAYERS = 6;
export const MIN_PLAYERS = 2;
export const MAX_HAND_SIZE = 10;
export const TOTAL_SEASONS = 3;
export const MONKEYS_TO_END_SEASON = 3;
export const MAX_SITE_POSITION = 5;
export const NORMAL_CARDS_PER_DECK = 42;
export const MONKEY_CARDS_PER_DECK = 10;

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

const DISPLAY_SIZE_BY_PLAYERS = {
  2: 4,
  3: 5,
  4: 6,
  5: 7,
  6: 8,
};

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

function cloneGame(game) {
  if (typeof structuredClone === "function") {
    return structuredClone(game);
  }

  return JSON.parse(JSON.stringify(game));
}

function getPlayerIndex(game, playerId) {
  const index = game.players.findIndex((player) => player.id === playerId);
  if (index === -1) {
    throw new Error("Jogador inválido.");
  }
  return index;
}

function assertPlayable(game) {
  if (game.phase === "gameEnd") {
    throw new Error("Jogo já terminou.");
  }

  if (game.phase !== "playing") {
    throw new Error("A temporada já foi encerrada.");
  }
}

function assertCurrentPlayer(game, playerId) {
  const index = getPlayerIndex(game, playerId);
  if (index !== game.currentPlayerIndex) {
    throw new Error("Não é a vez deste jogador.");
  }
  return index;
}

function getDisplaySize(playerCount) {
  const size = DISPLAY_SIZE_BY_PLAYERS[playerCount];
  if (!size) {
    throw new Error("Quantidade de jogadores inválida para o display.");
  }
  return size;
}

function applyEndTurn(game) {
  game.currentPlayerIndex = (game.currentPlayerIndex + 1) % game.players.length;
  return game;
}

function applyAdvanceSite(player, expedition) {
  const size = 1 + expedition.cards.length;
  if (size < 2) {
    return;
  }

  const color = expedition.leader.color;
  const current = player.sitePositions[color] ?? 0;
  player.sitePositions[color] = Math.min(current + 1, MAX_SITE_POSITION);
}

function drawInitialDisplay(deck, playerCount, revealedMonkeys = 0) {
  const workingDeck = [...deck];
  const display = [];
  const targetSize = getDisplaySize(playerCount);

  while (display.length < targetSize) {
    if (workingDeck.length === 0) {
      throw new Error("O baralho acabou ao montar o display inicial.");
    }

    const card = workingDeck.shift();
    if (card?.type === "monkey") {
      revealedMonkeys += 1;
      if (revealedMonkeys >= MONKEYS_TO_END_SEASON) {
        break;
      }
      continue;
    }
    display.push(card);
  }

  return { deck: workingDeck, display, revealedMonkeys };
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

export function getCurrentPlayer(game) {
  return game.players[game.currentPlayerIndex] ?? null;
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

export function createDeck() {
  const cards = [];

  for (const color of SITE_COLORS) {
    for (const role of ROLES) {
      cards.push({
        id: `${color}-${role}`,
        color,
        role,
      });
    }
  }

  const monkeys = Array.from({ length: MONKEY_CARDS_PER_DECK }, (_, index) => ({
    id: `monkey-${index + 1}`,
    type: "monkey",
  }));

  return [...cards, ...monkeys];
}

export function shuffleDeck(deck, rng = Math.random) {
  const next = [...deck];

  for (let index = next.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(rng() * (index + 1));
    [next[index], next[swapIndex]] = [next[swapIndex], next[index]];
  }

  return next;
}

export function createDisplay(deck, playerCount, revealedMonkeys = 0) {
  return drawInitialDisplay(deck, playerCount, revealedMonkeys);
}

export function startSeason(game, rng = Math.random) {
  const next = cloneGame(game);
  if (next.phase === "gameEnd") {
    throw new Error("Jogo já terminou.");
  }

  next.deck = shuffleDeck(createDeck(), rng);
  next.display = [];
  next.revealedMonkeys = 0;

  const displayResult = drawInitialDisplay(
    next.deck,
    next.players.length,
    next.revealedMonkeys,
  );

  next.deck = displayResult.deck;
  next.display = displayResult.display;
  next.revealedMonkeys = displayResult.revealedMonkeys;
  next.phase = "playing";

  if (next.revealedMonkeys >= MONKEYS_TO_END_SEASON) {
    next.phase = "seasonEnd";
    return endSeason(next, next.currentPlayerIndex, rng);
  }

  return next;
}

export function takeFromDisplay(game, playerId, cardId) {
  const next = cloneGame(game);
  assertPlayable(next);

  const playerIndex = assertCurrentPlayer(next, playerId);
  const player = next.players[playerIndex];

  if (next.display.length === 0) {
    throw new Error(
      "Display vazio: ação indisponível. Compre do baralho ou jogue uma expedição.",
    );
  }

  if (player.hand.length >= MAX_HAND_SIZE) {
    throw new Error("Limite de mão atingido: descarte cartas jogando uma expedição.");
  }

  const cardIndex = next.display.findIndex((card) => card.id === cardId);
  if (cardIndex === -1) {
    throw new Error("Carta não encontrada no display.");
  }

  const [card] = next.display.splice(cardIndex, 1);
  player.hand.push(card);

  return applyEndTurn(next);
}

export function drawFromDeck(game, playerId, rng = Math.random) {
  const next = cloneGame(game);
  assertPlayable(next);

  const playerIndex = assertCurrentPlayer(next, playerId);
  const player = next.players[playerIndex];

  if (player.hand.length >= MAX_HAND_SIZE) {
    throw new Error("Limite de mão atingido: descarte cartas jogando uma expedição.");
  }

  const cardsToDraw = next.display.length === 0 ? 2 : 1;
  const availableSlots = MAX_HAND_SIZE - player.hand.length;
  const targetNormals = Math.min(cardsToDraw, availableSlots);

  if (targetNormals <= 0) {
    throw new Error("Limite de mão atingido: descarte cartas jogando uma expedição.");
  }

  let normalCardsDrawn = 0;

  while (normalCardsDrawn < targetNormals) {
    if (next.deck.length === 0) {
      throw new Error("O baralho acabou.");
    }

    const card = next.deck.shift();

    if (card?.type === "monkey") {
      next.revealedMonkeys += 1;

      if (next.revealedMonkeys >= MONKEYS_TO_END_SEASON) {
        next.phase = "seasonEnd";
        return endSeason(next, playerIndex, rng);
      }

      continue;
    }

    player.hand.push(card);
    normalCardsDrawn += 1;
  }

  return applyEndTurn(next);
}
export function playExpedition(
  game,
  playerId,
  leaderCardId,
  selectedTrait,
  selectedCardIds = [],
) {
  const next = cloneGame(game);
  assertPlayable(next);

  const playerIndex = assertCurrentPlayer(next, playerId);
  const player = next.players[playerIndex];

  if (selectedCardIds.includes(leaderCardId)) {
    throw new Error("O líder não deve ser incluído em selectedCardIds.");
  }

  if (selectedTrait !== "color" && selectedTrait !== "role") {
    throw new Error("Traço inválido para expedição.");
  }

  const leader = player.hand.find((card) => card.id === leaderCardId);
  if (!leader) {
    throw new Error("Carta não encontrada na mão.");
  }

  const uniqueSelected = new Set(selectedCardIds);
  if (uniqueSelected.size !== selectedCardIds.length) {
    throw new Error("Carta não encontrada na mão ou duplicada.");
  }

  const selectedCards = selectedCardIds.map((cardId) => {
    const card = player.hand.find((item) => item.id === cardId);
    if (!card) {
      throw new Error("Carta não encontrada na mão.");
    }
    return card;
  });

  if (!validateExpedition(leader, selectedCards, selectedTrait)) {
    throw new Error("Expedição inválida: carta não corresponde ao critério escolhido.");
  }

  const expedition = {
    leader,
    cards: selectedCards,
    selectedTrait,
  };

  const removeIds = new Set([leaderCardId, ...selectedCardIds]);
  const remainingCards = player.hand.filter((card) => !removeIds.has(card.id));

  player.hand = [];
  next.display.push(...remainingCards);
  player.expeditions.push(expedition);
  applyAdvanceSite(player, expedition);

  return applyEndTurn(next);
}

export function endTurn(game) {
  const next = cloneGame(game);
  return applyEndTurn(next);
}

export function endSeason(game, monkeyRevealerIndex, rng = Math.random) {
  const next = cloneGame(game);

  if (next.phase === "gameEnd") {
    throw new Error("Jogo já terminou.");
  }

  if (!Number.isInteger(monkeyRevealerIndex)) {
    throw new Error("Jogador revelador inválido.");
  }

  if (monkeyRevealerIndex < 0 || monkeyRevealerIndex >= next.players.length) {
    throw new Error("Jogador revelador inválido.");
  }

  while (true) {
    next.phase = "seasonEnd";
    scoreSeason(next);

    for (const player of next.players) {
      player.expeditions = [];
      player.hand = [];
    }

    next.display = [];
    next.revealedMonkeys = 0;
    next.currentSeason += 1;
    next.firstPlayerIndex = monkeyRevealerIndex;
    next.currentPlayerIndex = monkeyRevealerIndex;

    if (next.currentSeason > next.totalSeasons) {
      return endGame(next);
    }

    next.deck = shuffleDeck(createDeck(), rng);

    const displayResult = drawInitialDisplay(
      next.deck,
      next.players.length,
      next.revealedMonkeys,
    );

    next.deck = displayResult.deck;
    next.display = displayResult.display;
    next.revealedMonkeys = displayResult.revealedMonkeys;
    next.phase = "playing";

    if (next.revealedMonkeys >= MONKEYS_TO_END_SEASON) {
      continue;
    }

    return next;
  }
}

export function endGame(game) {
  const next = cloneGame(game);
  next.phase = "gameEnd";

  const scores = next.players.map((player) => player.score);
  const maxScore = scores.length ? Math.max(...scores) : -Infinity;
  const winnerIds = next.players
    .filter((player) => player.score === maxScore)
    .map((player) => player.id);

  next.winnerIds = winnerIds;
  next.winnerId = winnerIds.length === 1 ? winnerIds[0] : null;
  next.isTie = winnerIds.length > 1;

  return next;
}
