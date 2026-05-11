import test from "node:test";
import assert from "node:assert/strict";

import { scoreExpedition, scoreSites, scoreSeason } from "../src/simplified/scoring.js";

function makeExpedition(extraCards) {
  const leader = { id: "blue-guide", color: "blue", role: "guide" };
  const cards = Array.from({ length: extraCards }, (_, i) => ({
    id: `blue-card-${i}`,
    color: "blue",
    role: "botanist",
  }));
  return { leader, cards, selectedTrait: "color" };
}

function makePlayer(sitePositions, expeditions = []) {
  return {
    id: "player-1",
    name: "Ana",
    hand: [],
    expeditions,
    score: 0,
    sitePositions,
  };
}

function makeGame(players) {
  return { players };
}

function makeSitePositions(overrides = {}) {
  return { blue: 0, green: 0, red: 0, yellow: 0, purple: 0, orange: 0, ...overrides };
}

test("scoreExpedition: expedição de 1 carta vale 0 pontos", () => {
  assert.equal(scoreExpedition(makeExpedition(0)), 0);
});

test("scoreExpedition: expedição de 2 cartas vale 1 ponto", () => {
  assert.equal(scoreExpedition(makeExpedition(1)), 1);
});

test("scoreExpedition: expedição de 3 cartas vale 3 pontos", () => {
  assert.equal(scoreExpedition(makeExpedition(2)), 3);
});

test("scoreExpedition: expedição de 4 cartas vale 6 pontos", () => {
  assert.equal(scoreExpedition(makeExpedition(3)), 6);
});

test("scoreExpedition: expedição de 5 cartas vale 10 pontos", () => {
  assert.equal(scoreExpedition(makeExpedition(4)), 10);
});

test("scoreExpedition: expedição de 6 cartas vale 15 pontos", () => {
  assert.equal(scoreExpedition(makeExpedition(5)), 15);
});

test("scoreExpedition: expedição de 7+ cartas também vale 15 pontos", () => {
  assert.equal(scoreExpedition(makeExpedition(6)), 15);
  assert.equal(scoreExpedition(makeExpedition(10)), 15);
});

test("scoreSites: todas as trilhas em 0 valem 0 pontos", () => {
  const player = makePlayer(makeSitePositions());
  assert.equal(scoreSites(player), 0);
});

test("scoreSites: cada posição retorna o valor correto", () => {
  const expected = { 0: 0, 1: 2, 2: 5, 3: 9, 4: 14, 5: 20 };
  for (const [pos, pts] of Object.entries(expected)) {
    const player = makePlayer(makeSitePositions({ blue: Number(pos) }));
    assert.equal(scoreSites(player), pts, `posição ${pos} deve valer ${pts} pontos`);
  }
});

test("scoreSites: soma correta com múltiplas trilhas avançadas", () => {
  const player = makePlayer(makeSitePositions({ blue: 1, green: 2, yellow: 3 }));
  assert.equal(scoreSites(player), 16);
});

test("scoreSites: todas as trilhas na posição máxima valem 120 pontos", () => {
  const player = makePlayer(makeSitePositions({ blue: 5, green: 5, red: 5, yellow: 5, purple: 5, orange: 5 }));
  assert.equal(scoreSites(player), 120);
});

test("scoreSeason: soma expedições e trilhas ao score do jogador", () => {
  const expeditions = [makeExpedition(1), makeExpedition(2)];
  const player = makePlayer(makeSitePositions({ blue: 1, green: 2 }), expeditions);
  player.score = 10;

  const game = makeGame([player]);
  scoreSeason(game);

  assert.equal(game.players[0].score, 21);
});

test("scoreSeason: jogador sem expedições e trilhas zeradas não ganha pontos", () => {
  const player = makePlayer(
    makeSitePositions(),
    [],
  );
  player.score = 5;

  const game = makeGame([player]);
  scoreSeason(game);

  assert.equal(game.players[0].score, 5);
});

test("scoreSeason: calcula corretamente para múltiplos jogadores", () => {
  const player1 = makePlayer(makeSitePositions({ blue: 2 }), [makeExpedition(1)]);
  player1.score = 0;

  const player2 = makePlayer(makeSitePositions({ orange: 5 }), [makeExpedition(3)]);
  player2.score = 0;

  const game = makeGame([player1, player2]);
  scoreSeason(game);

  assert.equal(game.players[0].score, 6);
  assert.equal(game.players[1].score, 26);
});
