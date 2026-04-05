import test from "node:test";
import assert from "node:assert/strict";

import {
  createGame,
  getCurrentPlayer,
  getPlayableSitesForSpecialist,
  performExpedition,
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
