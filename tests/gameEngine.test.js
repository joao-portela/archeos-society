import test from "node:test";
import assert from "node:assert/strict";

import {
  createGame,
  getCurrentPlayer,
  getPlayableSitesForSpecialist,
  getScoreboard,
  performExpedition,
  resolveBlockedTurn,
} from "../src/engine/gameEngine.js";

const permissiveSites = [
  {
    id: "site-1",
    name: "Ruinas A",
    region: "Vale",
    allowedSpecialists: [
      "cartografo",
      "geologa",
      "linguista",
      "guardiao",
      "mergulhadora",
    ],
    artifactType: "tabuleta",
    reward: 1,
    basePoints: 2,
  },
  {
    id: "site-2",
    name: "Ruinas B",
    region: "Costa",
    allowedSpecialists: [
      "cartografo",
      "geologa",
      "linguista",
      "guardiao",
      "mergulhadora",
    ],
    artifactType: "moeda",
    reward: 1,
    basePoints: 2,
  },
  {
    id: "site-3",
    name: "Ruinas C",
    region: "Selva",
    allowedSpecialists: [
      "cartografo",
      "geologa",
      "linguista",
      "guardiao",
      "mergulhadora",
    ],
    artifactType: "idolo",
    reward: 1,
    basePoints: 2,
  },
  {
    id: "site-4",
    name: "Ruinas D",
    region: "Pantano",
    allowedSpecialists: [
      "cartografo",
      "geologa",
      "linguista",
      "guardiao",
      "mergulhadora",
    ],
    artifactType: "gema",
    reward: 1,
    basePoints: 2,
  },
  {
    id: "site-5",
    name: "Ruinas E",
    region: "Planalto",
    allowedSpecialists: [
      "cartografo",
      "geologa",
      "linguista",
      "guardiao",
      "mergulhadora",
    ],
    artifactType: "manuscrito",
    reward: 1,
    basePoints: 2,
  },
];

function fixedRng() {
  return 0.25;
}

function choosePlayableAction(game) {
  const player = getCurrentPlayer(game);

  for (const specialist of player.hand) {
    const playableSites = getPlayableSitesForSpecialist(game, specialist.key);
    if (playableSites.length > 0) {
      return {
        specialistId: specialist.id,
        siteId: playableSites[0].id,
      };
    }
  }

  throw new Error("Nenhuma jogada valida encontrada para o jogador atual.");
}

test("createGame cria uma partida valida com setup inicial", () => {
  const game = createGame(
    {
      tableName: "Mesa de teste",
      playerNames: ["Ana", "Beto", "Clara"],
      rounds: 2,
      siteTemplates: permissiveSites,
    },
    fixedRng,
  );

  assert.equal(game.status, "active");
  assert.equal(game.currentRound, 1);
  assert.equal(game.players.length, 3);
  assert.equal(game.activeSites.length, 12);
  assert.equal(game.players[0].hand.length, 4);
  assert.equal(game.players[1].hand.length, 4);
  assert.equal(game.players[2].hand.length, 4);
});

test("createGame rejeita configuracoes invalidas de jogadores", () => {
  assert.throws(() => createGame({ playerNames: ["Ana"] }, fixedRng), {
    message: "A partida precisa ter entre 2 e 5 jogadores.",
  });

  assert.throws(
    () =>
      createGame(
        {
          playerNames: ["Ana", "Beto", "Clara", "Dora", "Enzo", "Fabi"],
        },
        fixedRng,
      ),
    {
      message: "A partida precisa ter entre 2 e 5 jogadores.",
    },
  );

  assert.throws(
    () => createGame({ playerNames: ["Ana", "   "] }, fixedRng),
    {
      message: "Todos os jogadores precisam ter um nome válido.",
    },
  );
});

test("getPlayableSitesForSpecialist retorna apenas sitios abertos e compativeis", () => {
  const game = createGame(
    {
      playerNames: ["Ana", "Beto"],
      rounds: 1,
      siteTemplates: permissiveSites,
    },
    fixedRng,
  );

  game.activeSites = [
    {
      id: "site-open-allowed",
      name: "Arquivo aberto",
      status: "open",
      allowedSpecialists: ["cartografo"],
      artifactType: "tabuleta",
      reward: 1,
      basePoints: 2,
    },
    {
      id: "site-open-blocked",
      name: "Arquivo bloqueado",
      status: "open",
      allowedSpecialists: ["guardiao"],
      artifactType: "moeda",
      reward: 1,
      basePoints: 2,
    },
    {
      id: "site-claimed",
      name: "Arquivo ja ocupado",
      status: "claimed",
      claimedBy: "player-2",
      allowedSpecialists: ["cartografo"],
      artifactType: "gema",
      reward: 1,
      basePoints: 2,
    },
  ];

  assert.deepEqual(
    getPlayableSitesForSpecialist(game, "cartografo").map((site) => site.id),
    ["site-open-allowed"],
  );
});

test("performExpedition aplica recompensa, pontuacao e rotacao de turno", () => {
  const game = createGame(
    {
      playerNames: ["Ana", "Beto"],
      rounds: 1,
      siteTemplates: permissiveSites,
    },
    fixedRng,
  );

  const player = getCurrentPlayer(game);
  const action = choosePlayableAction(game);
  const site = game.activeSites.find((entry) => entry.id === action.siteId);
  const next = performExpedition(game, action, fixedRng);
  const updatedPlayer = next.players.find((entry) => entry.id === player.id);
  const claimedSite = next.activeSites.find((entry) => entry.id === action.siteId);

  assert.equal(updatedPlayer.hand.length, 3);
  assert.equal(updatedPlayer.score, site.basePoints);
  assert.equal(updatedPlayer.artifacts[site.artifactType], site.reward);
  assert.equal(claimedSite.status, "claimed");
  assert.equal(next.currentPlayerIndex, 1);
});

test("performExpedition rejeita jogadas invalidas", () => {
  const game = createGame(
    {
      playerNames: ["Ana", "Beto"],
      rounds: 1,
      siteTemplates: permissiveSites,
    },
    fixedRng,
  );

  assert.throws(
    () =>
      performExpedition(
        game,
        { specialistId: "especialista-inexistente", siteId: game.activeSites[0].id },
        fixedRng,
      ),
    {
      message: "Especialista inválido para o jogador atual.",
    },
  );

  const currentPlayer = getCurrentPlayer(game);
  const specialist = currentPlayer.hand[0];
  const blockedSpecialist = [
    "cartografo",
    "geologa",
    "linguista",
    "guardiao",
    "mergulhadora",
  ].find((key) => key !== specialist.key);

  assert.throws(
    () =>
      performExpedition(
        game,
        { specialistId: specialist.id, siteId: "site-inexistente" },
        fixedRng,
      ),
    {
      message: "Sítio arqueológico inválido.",
    },
  );

  const blockedSite = {
    ...game.activeSites[0],
    id: "blocked-site",
    status: "open",
    allowedSpecialists: [blockedSpecialist],
  };

  const invalidState = {
    ...game,
    activeSites: [blockedSite, ...game.activeSites.slice(1)],
  };

  assert.throws(
    () =>
      performExpedition(
        invalidState,
        { specialistId: specialist.id, siteId: blockedSite.id },
        fixedRng,
      ),
    {
      message: "Esse especialista não pode atuar nesse sítio.",
    },
  );
});

test("a engine prepara a rodada seguinte quando a rodada atual termina", () => {
  let game = createGame(
    {
      playerNames: ["Ana", "Beto"],
      rounds: 2,
      handSize: 1,
      siteTemplates: permissiveSites,
    },
    fixedRng,
  );

  game = performExpedition(game, choosePlayableAction(game), fixedRng);
  game = performExpedition(game, choosePlayableAction(game), fixedRng);

  assert.equal(game.status, "active");
  assert.equal(game.currentRound, 2);
  assert.equal(game.currentPlayerIndex, 0);
  assert.equal(game.players[0].hand.length, 1);
  assert.equal(game.players[1].hand.length, 1);
  assert.equal(game.players[0].expeditions.length, 0);
  assert.equal(game.players[1].expeditions.length, 0);
  assert.equal(game.activeSites.length, 2);
  assert.match(game.log.at(-1), /Rodada 2 preparada/);
});

test("performExpedition descarta a mao bloqueada do proximo jogador e evita deadlock", () => {
  const game = createGame(
    {
      playerNames: ["Ana", "Beto"],
      rounds: 1,
      siteTemplates: permissiveSites,
    },
    fixedRng,
  );

  game.currentPlayerIndex = 0;
  game.players[0].hand = [
    {
      id: "cartografo-final",
      key: "cartografo",
      name: "Cartógrafo",
    },
  ];
  game.players[1].hand = [
    {
      id: "mergulhadora-1",
      key: "mergulhadora",
      name: "Mergulhadora",
    },
    {
      id: "mergulhadora-2",
      key: "mergulhadora",
      name: "Mergulhadora",
    },
  ];
  game.activeSites = [
    {
      id: "site-cartografo",
      name: "Arquivo de Pedra",
      status: "open",
      claimedBy: null,
      allowedSpecialists: ["cartografo"],
      artifactType: "tabuleta",
      reward: 1,
      basePoints: 3,
    },
  ];

  const finished = performExpedition(
    game,
    { specialistId: "cartografo-final", siteId: "site-cartografo" },
    fixedRng,
  );

  assert.equal(finished.status, "finished");
  assert.equal(finished.players[1].hand.length, 0);
  assert.match(
    finished.log.at(-2),
    /Beto ficou sem sítios válidos e descartou 2 especialista\(s\)\./,
  );
});

test("resolveBlockedTurn recupera autosave preso em jogador sem jogadas validas", () => {
  const game = createGame(
    {
      playerNames: ["Ana", "Beto"],
      rounds: 1,
      siteTemplates: permissiveSites,
    },
    fixedRng,
  );

  game.currentPlayerIndex = 1;
  game.players[0].hand = [
    {
      id: "cartografo-pronto",
      key: "cartografo",
      name: "Cartógrafo",
    },
  ];
  game.players[1].hand = [
    {
      id: "mergulhadora-presa-1",
      key: "mergulhadora",
      name: "Mergulhadora",
    },
    {
      id: "mergulhadora-presa-2",
      key: "mergulhadora",
      name: "Mergulhadora",
    },
  ];
  game.activeSites = [
    {
      id: "site-cartografo-livre",
      name: "Mapa Antigo",
      status: "open",
      claimedBy: null,
      allowedSpecialists: ["cartografo"],
      artifactType: "tabuleta",
      reward: 1,
      basePoints: 2,
    },
  ];

  const normalized = resolveBlockedTurn(game, fixedRng);

  assert.equal(normalized.status, "active");
  assert.equal(normalized.currentPlayerIndex, 0);
  assert.equal(normalized.players[1].hand.length, 0);
  assert.match(
    normalized.log.at(-1),
    /Beto ficou sem sítios válidos e descartou 2 especialista\(s\)\./,
  );
});

test("a engine encerra a partida e calcula pontuacao final", () => {
  let game = createGame(
    {
      playerNames: ["Ana", "Beto"],
      rounds: 1,
      siteTemplates: permissiveSites,
    },
    fixedRng,
  );

  while (game.status !== "finished") {
    game = performExpedition(game, choosePlayableAction(game), fixedRng);
  }

  assert.equal(game.status, "finished");
  assert.ok(game.winnerId);
  assert.equal(
    game.players.every((player) => typeof player.finalScore === "number"),
    true,
  );
  assert.equal(
    game.players.every((player) => player.finalScore >= player.score),
    true,
  );
});

test("a pontuacao final considera os bonus dos conselheiros", () => {
  const game = createGame(
    {
      playerNames: ["Ana", "Beto"],
      rounds: 1,
      siteTemplates: permissiveSites,
    },
    fixedRng,
  );

  game.currentPlayerIndex = 0;
  game.players[0].score = 9;
  game.players[0].artifacts = {
    tabuleta: 2,
    moeda: 2,
    idolo: 1,
    gema: 1,
    manuscrito: 0,
  };
  game.players[0].hand = [
    {
      id: "cartografo-final",
      key: "cartografo",
      name: "Cartógrafo",
    },
  ];
  game.players[1].score = 4;
  game.players[1].artifacts = {
    tabuleta: 0,
    moeda: 0,
    idolo: 0,
    gema: 0,
    manuscrito: 0,
  };
  game.players[1].hand = [];
  game.activeSites = [
    {
      id: "site-final",
      name: "Arquivo Final",
      status: "open",
      claimedBy: null,
      allowedSpecialists: ["cartografo"],
      artifactType: "manuscrito",
      reward: 1,
      basePoints: 5,
    },
  ];

  const finished = performExpedition(
    game,
    { specialistId: "cartografo-final", siteId: "site-final" },
    fixedRng,
  );
  const winner = finished.players.find((player) => player.id === finished.winnerId);
  const ana = finished.players[0];

  assert.equal(finished.status, "finished");
  assert.equal(ana.score, 14);
  assert.equal(ana.finalBonus, 31);
  assert.equal(ana.finalScore, 45);
  assert.equal(
    ana.finalBreakdown.reduce((sum, item) => sum + item.points, 0),
    ana.finalBonus,
  );
  assert.equal(winner?.id, ana.id);
});

test("getScoreboard retorna uma copia dos artefatos e score final padrao", () => {
  const game = createGame(
    {
      playerNames: ["Ana", "Beto"],
      rounds: 1,
      siteTemplates: permissiveSites,
    },
    fixedRng,
  );

  const scoreboard = getScoreboard(game);
  scoreboard[0].artifacts.tabuleta = 99;

  assert.notEqual(scoreboard[0].artifacts, game.players[0].artifacts);
  assert.equal(game.players[0].artifacts.tabuleta, 0);
  assert.equal(scoreboard[0].finalBonus, 0);
  assert.equal(scoreboard[0].finalScore, scoreboard[0].score);
});
