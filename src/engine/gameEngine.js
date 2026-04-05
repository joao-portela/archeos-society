import {
  ARTIFACT_TYPES,
  COUNSELORS,
  SITE_TEMPLATES,
  SPECIALIST_TYPES,
} from "../data/gameData.js";

const HAND_SIZE = 4;
const DEFAULT_ROUNDS = 2;

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

function drawFromDeck(deck, count, builder, rng = Math.random) {
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
      const handDraw = drawFromDeck(
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

    const siteDraw = drawFromDeck(
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
          `Rodada ${state.currentRound} preparada com ${activeSites.length} sitios ativos.`,
        ],
      };
    }

    attempts += 1;
  }

  throw new Error("Nao foi possivel preparar uma rodada jogavel.");
}

function validatePlayerNames(playerNames) {
  if (!Array.isArray(playerNames) || playerNames.length < 2 || playerNames.length > 5) {
    throw new Error("A partida precisa ter entre 2 e 5 jogadores.");
  }

  if (playerNames.some((name) => !String(name).trim())) {
    throw new Error("Todos os jogadores precisam ter um nome valido.");
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
    log: [...state.log, "Partida encerrada e pontuacao final calculada."],
  };
}

function rotateTurn(players, currentIndex) {
  return (currentIndex + 1) % players.length;
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
    tableName = "Mesa de Expedicao",
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
    log: [`Partida criada para ${playerNames.length} jogadores.`],
  };

  return prepareRound(baseState, rng);
}

export function performExpedition(state, action, rng = Math.random) {
  if (state.status !== "active") {
    throw new Error("A partida ja foi encerrada.");
  }

  const { specialistId, siteId } = action ?? {};
  const next = clone(state);
  const currentPlayer = next.players[next.currentPlayerIndex];

  const specialistIndex = currentPlayer.hand.findIndex(
    (specialist) => specialist.id === specialistId,
  );

  if (specialistIndex === -1) {
    throw new Error("Especialista invalido para o jogador atual.");
  }

  const siteIndex = next.activeSites.findIndex((site) => site.id === siteId);
  if (siteIndex === -1) {
    throw new Error("Sitio arqueologico invalido.");
  }

  const specialist = currentPlayer.hand[specialistIndex];
  const site = next.activeSites[siteIndex];

  if (!specialistPlayableOnSite(specialist.key, site)) {
    throw new Error("Esse especialista nao pode atuar nesse sitio.");
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
    `${currentPlayer.name} concluiu ${site.name} usando ${specialist.name} e recebeu ${site.reward} ${site.artifactType}.`,
  );

  const roundFinished = next.players.every((player) => player.hand.length === 0);

  if (roundFinished && next.currentRound >= next.rounds) {
    return finalizeGame(next);
  }

  if (roundFinished) {
    next.currentRound += 1;
    return prepareRound(next, rng);
  }

  next.currentPlayerIndex = rotateTurn(next.players, next.currentPlayerIndex);
  return next;
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
