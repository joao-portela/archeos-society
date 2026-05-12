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
