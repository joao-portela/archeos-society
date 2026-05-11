import {
  ARTIFACT_TYPES,
  COUNSELORS,
  SITE_TEMPLATES,
  SPECIALIST_TYPES,
} from "../data/gameData.js";

const HAND_SIZE = 4;
const DEFAULT_ROUNDS = 2;
export const MAX_HAND_SIZE = 10;

export const SITE_COLORS = [
  "azul",
  "verde",
  "vermelho",
  "amarelo",
  "roxo",
  "laranja",
];
export const ROLES = [
  "guia",
  "fotografo",
  "botanico",
  "linguista",
  "medico",
  "patrono",
  "mercenario",
];
const DISPLAY_SIZES = new Map([
  [2, 4],
  [3, 5],
  [4, 6],
  [5, 7],
  [6, 8],
]);

function clone(value) {
  return structuredClone(value);
}

function shuffle(items, rng = Math.random) {
  const next = [...items];
  for (let index = next.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(rng() * (index + 1));
    [next[index], next[swapIndex]] = [next[swapIndex], next[index]];
  }
  return next;
}

function createArtifactBag() {
  return Object.fromEntries(ARTIFACT_TYPES.map((artifact) => [artifact.key, 0]));
}

function getArtifactLabel(artifactKey, count = 1) {
  const artifact = ARTIFACT_TYPES.find((item) => item.key === artifactKey);
  if (!artifact) {
    return artifactKey;
  }

  if (count <= 1) {
    return artifact.name;
  }

  if (artifact.key === "idolo") {
    return "Ídolos";
  }

  return `${artifact.name}s`;
}

function createPlayer(name, index) {
  return {
    id: `player-${index + 1}`,
    name,
    score: 0,
    artifacts: createArtifactBag(),
    hand: [],
    expeditions: [],
  };
}

function buildSpecialistDeck(rng = Math.random) {
  const deck = [];

  for (const specialist of SPECIALIST_TYPES) {
    for (let copy = 0; copy < 12; copy += 1) {
      deck.push({
        id: `${specialist.key}-${copy + 1}`,
        key: specialist.key,
        name: specialist.name,
      });
    }
  }

  return shuffle(deck, rng);
}

function buildSiteDeck(siteTemplates = SITE_TEMPLATES, rng = Math.random) {
  const expanded = [];

  for (let cycle = 0; cycle < 3; cycle += 1) {
    for (const template of siteTemplates) {
      expanded.push({
        ...template,
        deckId: `${template.id}-${cycle + 1}`,
      });
    }
  }

  return shuffle(expanded, rng);
}

function drawFromStack(deck, count, builder, rng = Math.random) {
  const workingDeck = [...deck];
  const drawn = [];

  while (drawn.length < count) {
    if (workingDeck.length === 0) {
      workingDeck.push(...builder(rng));
    }
    drawn.push(workingDeck.shift());
  }

  return { drawn, deck: workingDeck };
}

function isMonkeyCard(card) {
  return card?.type === "monkey";
}

function getDisplaySize(playerCount) {
  const size = DISPLAY_SIZES.get(playerCount);
  if (!size) {
    throw new Error("Quantidade de jogadores invalida para o display inicial.");
  }
  return size;
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

  const monkeys = [
    { id: "monkey-1", type: "monkey" },
    { id: "monkey-2", type: "monkey" },
    { id: "monkey-3", type: "monkey" },
  ];

  return [...cards, ...monkeys];
}

export function shuffleDeck(deck, rng = Math.random) {
  return shuffle(deck, rng);
}

export function createInitialDisplay(state) {
  const next = clone(state);
  const displaySize = getDisplaySize(next.players.length);
  const workingDeck = [...next.deck];
  const display = [];
  let monkeysRevealed = next.monkeysRevealed ?? 0;

  while (display.length < displaySize) {
    const card = workingDeck.shift();
    if (!card) {
      throw new Error("Baralho vazio.");
    }
    if (isMonkeyCard(card)) {
      monkeysRevealed += 1;
      continue;
    }
    display.push(card);
  }

  return {
    ...next,
    deck: workingDeck,
    display,
    monkeysRevealed,
  };
}

export function takeFromDisplay(state, playerId, cardId) {
  if (state.display.length === 0) {
    throw new Error(
      "Display vazio: ação indisponível. Compre do baralho ou jogue uma expedição.",
    );
  }

  const next = clone(state);
  const player = next.players.find((entry) => entry.id === playerId);

  if (!player) {
    throw new Error("Jogador invalido.");
  }

  if (player.hand.length >= MAX_HAND_SIZE) {
    throw new Error("Mão cheia: não é possível ganhar cartas.");
  }

  const cardIndex = next.display.findIndex((card) => card.id === cardId);
  if (cardIndex === -1) {
    throw new Error("Carta invalida no display.");
  }

  const [card] = next.display.splice(cardIndex, 1);
  player.hand.push(card);

  return next;
}

export function drawFromDeck(state, playerId) {
  const next = clone(state);
  const player = next.players.find((entry) => entry.id === playerId);

  if (!player) {
    throw new Error("Jogador invalido.");
  }

  const cardsToDraw = next.display.length === 0 ? 2 : 1;
  const availableSlots = MAX_HAND_SIZE - player.hand.length;
  const actualCardsToDraw = Math.min(cardsToDraw, availableSlots);

  if (actualCardsToDraw <= 0) {
    throw new Error("Mão cheia: não é possível ganhar cartas.");
  }

  let normalDrawn = 0;

  while (normalDrawn < actualCardsToDraw) {
    const card = next.deck.shift();
    if (!card) {
      throw new Error("Baralho vazio.");
    }

    if (isMonkeyCard(card)) {
      next.monkeysRevealed = (next.monkeysRevealed ?? 0) + 1;
      continue;
    }

    player.hand.push(card);
    normalDrawn += 1;
  }

  return next;
}

function specialistPlayableOnSite(specialistKey, site) {
  return site.status === "open" && site.allowedSpecialists.includes(specialistKey);
}

function playerHasPlayableMove(player, activeSites) {
  return player.hand.some((specialist) =>
    activeSites.some((site) => specialistPlayableOnSite(specialist.key, site)),
  );
}

function prepareRound(state, rng = Math.random) {
  let specialistDeck = [...state.specialistDeck];
  let siteDeck = [...state.siteDeck];
  let attempts = 0;

  while (attempts < 20) {
    const refreshedPlayers = state.players.map((player) => {
      const handDraw = drawFromStack(
        specialistDeck,
        state.handSize,
        buildSpecialistDeck,
        rng,
      );
      specialistDeck = handDraw.deck;

      return {
        ...player,
        hand: handDraw.drawn,
        expeditions: [],
      };
    });

    const siteDraw = drawFromStack(
      siteDeck,
      refreshedPlayers.length * state.handSize,
      () => buildSiteDeck(state.siteTemplates, rng),
      rng,
    );

    const activeSites = siteDraw.drawn.map((site, index) => ({
      ...site,
      id: `${site.deckId}-round-${state.currentRound}-slot-${index + 1}`,
      status: "open",
      claimedBy: null,
    }));

    const allPlayersPlayable = refreshedPlayers.every((player) =>
      playerHasPlayableMove(player, activeSites),
    );

    if (allPlayersPlayable) {
      return {
        ...state,
        players: refreshedPlayers,
        activeSites,
        specialistDeck,
        siteDeck: siteDraw.deck,
        currentPlayerIndex: 0,
        roundStatus: "active",
        log: [
          ...state.log,
          `Rodada ${state.currentRound} preparada com ${activeSites.length} sítios ativos.`,
        ],
      };
    }

    attempts += 1;
  }

  throw new Error("Não foi possível preparar uma rodada jogável.");
}

function validatePlayerNames(playerNames) {
  if (!Array.isArray(playerNames) || playerNames.length < 2 || playerNames.length > 5) {
    throw new Error("A partida precisa ter entre 2 e 5 jogadores.");
  }

  if (playerNames.some((name) => !String(name).trim())) {
    throw new Error("Todos os jogadores precisam ter um nome válido.");
  }
}

function computeRecipePoints(artifacts, recipe, points) {
  const possibleSets = Math.min(
    ...Object.entries(recipe).map(([artifactKey, amount]) =>
      Math.floor((artifacts[artifactKey] ?? 0) / amount),
    ),
  );

  return {
    sets: Number.isFinite(possibleSets) ? possibleSets : 0,
    points: (Number.isFinite(possibleSets) ? possibleSets : 0) * points,
  };
}

function calculateCounselorBonuses(players) {
  return players.map((player) => {
    const breakdown = COUNSELORS.map((counselor) => {
      const result = computeRecipePoints(
        player.artifacts,
        counselor.recipe,
        counselor.points,
      );

      return {
        counselorId: counselor.id,
        counselorName: counselor.name,
        sets: result.sets,
        points: result.points,
        summary: counselor.summary,
      };
    });

    return {
      playerId: player.id,
      total: breakdown.reduce((sum, item) => sum + item.points, 0),
      breakdown,
    };
  });
}

function finalizeGame(state) {
  const bonusByPlayer = calculateCounselorBonuses(state.players);

  const players = state.players.map((player) => {
    const bonus = bonusByPlayer.find((entry) => entry.playerId === player.id);

    return {
      ...player,
      finalBonus: bonus.total,
      finalBreakdown: bonus.breakdown,
      finalScore: player.score + bonus.total,
    };
  });

  const sortedPlayers = [...players].sort((left, right) => {
    return right.finalScore - left.finalScore || right.score - left.score;
  });

  return {
    ...state,
    status: "finished",
    players,
    winnerId: sortedPlayers[0]?.id ?? null,
    log: [...state.log, "Partida encerrada e pontuação final calculada."],
  };
}

function rotateTurn(players, currentIndex) {
  return (currentIndex + 1) % players.length;
}

function concludeRoundIfNeeded(state, rng = Math.random) {
  const roundFinished = state.players.every((player) => player.hand.length === 0);

  if (!roundFinished) {
    return state;
  }

  if (state.currentRound >= state.rounds) {
    return finalizeGame(state);
  }

  return prepareRound(
    {
      ...state,
      currentRound: state.currentRound + 1,
    },
    rng,
  );
}

export function resolveBlockedTurn(state, rng = Math.random) {
  if (state.status !== "active") {
    return state;
  }

  const next = clone(state);
  let rotations = 0;

  while (rotations < next.players.length) {
    const progressedState = concludeRoundIfNeeded(next, rng);
    if (progressedState !== next) {
      return progressedState;
    }

    const currentPlayer = next.players[next.currentPlayerIndex];

    if (currentPlayer.hand.length === 0) {
      next.currentPlayerIndex = rotateTurn(next.players, next.currentPlayerIndex);
      rotations += 1;
      continue;
    }

    if (playerHasPlayableMove(currentPlayer, next.activeSites)) {
      return next;
    }

    const discardedCount = currentPlayer.hand.length;
    currentPlayer.hand = [];
    next.log.push(
      `${currentPlayer.name} ficou sem sítios válidos e descartou ${discardedCount} especialista(s).`,
    );
    next.currentPlayerIndex = rotateTurn(next.players, next.currentPlayerIndex);
    rotations += 1;
  }

  return concludeRoundIfNeeded(next, rng);
}

export function getCurrentPlayer(state) {
  return state.players[state.currentPlayerIndex];
}

export function getPlayableSitesForSpecialist(state, specialistKey) {
  return state.activeSites.filter((site) => specialistPlayableOnSite(specialistKey, site));
}

export function createGame(config = {}, rng = Math.random) {
  const {
    playerNames = ["Jogadora 1", "Jogador 2"],
    tableName = "Mesa de Expedição",
    rounds = DEFAULT_ROUNDS,
    handSize = HAND_SIZE,
    siteTemplates = SITE_TEMPLATES,
  } = config;

  validatePlayerNames(playerNames);

  const baseState = {
    id: `game-${Date.now()}`,
    tableName,
    createdAt: new Date().toISOString(),
    rounds,
    handSize,
    currentRound: 1,
    currentPlayerIndex: 0,
    status: "active",
    roundStatus: "setup",
    players: playerNames.map((name, index) => createPlayer(name, index)),
    counselors: clone(COUNSELORS),
    specialistDeck: buildSpecialistDeck(rng),
    siteDeck: buildSiteDeck(siteTemplates, rng),
    siteTemplates: clone(siteTemplates),
    activeSites: [],
    deck: shuffleDeck(createDeck(), rng),
    display: [],
    monkeysRevealed: 0,
    log: [`Partida criada para ${playerNames.length} jogadores.`],
  };

  const withDisplay = createInitialDisplay(baseState);
  return resolveBlockedTurn(prepareRound(withDisplay, rng), rng);
}

export function performExpedition(state, action, rng = Math.random) {
  if (state.status !== "active") {
    throw new Error("A partida já foi encerrada.");
  }

  const { specialistId, siteId } = action ?? {};
  const next = clone(state);
  const currentPlayer = next.players[next.currentPlayerIndex];

  const specialistIndex = currentPlayer.hand.findIndex(
    (specialist) => specialist.id === specialistId,
  );

  if (specialistIndex === -1) {
    throw new Error("Especialista inválido para o jogador atual.");
  }

  const siteIndex = next.activeSites.findIndex((site) => site.id === siteId);
  if (siteIndex === -1) {
    throw new Error("Sítio arqueológico inválido.");
  }

  const specialist = currentPlayer.hand[specialistIndex];
  const site = next.activeSites[siteIndex];

  if (!specialistPlayableOnSite(specialist.key, site)) {
    throw new Error("Esse especialista não pode atuar nesse sítio.");
  }

  currentPlayer.hand.splice(specialistIndex, 1);
  currentPlayer.artifacts[site.artifactType] += site.reward;
  currentPlayer.score += site.basePoints;
  currentPlayer.expeditions.push({
    siteId: site.id,
    siteName: site.name,
    artifactType: site.artifactType,
    reward: site.reward,
    points: site.basePoints,
  });

  next.activeSites[siteIndex] = {
    ...site,
    status: "claimed",
    claimedBy: currentPlayer.id,
  };

  next.log.push(
    `${currentPlayer.name} concluiu ${site.name} usando ${specialist.name} e recebeu ${site.reward} ${getArtifactLabel(site.artifactType, site.reward)}.`,
  );

  next.currentPlayerIndex = rotateTurn(next.players, next.currentPlayerIndex);
  return resolveBlockedTurn(next, rng);
}

export function getScoreboard(state) {
  return state.players.map((player) => ({
    playerId: player.id,
    name: player.name,
    score: player.score,
    finalBonus: player.finalBonus ?? 0,
    finalScore: player.finalScore ?? player.score,
    artifacts: clone(player.artifacts),
    expeditions: player.expeditions.length,
  }));
}
