import test from "node:test";
import assert from "node:assert/strict";

import {
  MAX_HAND_SIZE,
  MAX_PLAYERS,
  MAX_SITE_POSITION,
  MIN_PLAYERS,
  MONKEYS_TO_END_SEASON,
  NORMAL_CARDS_PER_DECK,
  MONKEY_CARDS_PER_DECK,
  ROLES,
  SITE_COLORS,
  TOTAL_SEASONS,
  setupGame,
} from "../src/simplified/simplifiedGame.js";

function fixedRng() {
  return 0.25;
}

function highRng() {
  return 0.99;
}

test("setupGame cria a estrutura base da etapa 1", () => {
  const game = setupGame(["Ana", "Beto", "Clara"], fixedRng);

  assert.equal(MIN_PLAYERS, 2);
  assert.equal(MAX_PLAYERS, 6);
  assert.equal(MAX_HAND_SIZE, 10);
  assert.equal(TOTAL_SEASONS, 3);
  assert.equal(MONKEYS_TO_END_SEASON, 3);
  assert.equal(MAX_SITE_POSITION, 5);
  assert.equal(NORMAL_CARDS_PER_DECK, 42);
  assert.equal(MONKEY_CARDS_PER_DECK, 3);
  assert.deepEqual(SITE_COLORS, ["blue", "green", "red", "yellow", "purple", "orange"]);
  assert.deepEqual(ROLES, [
    "guide",
    "photographer",
    "botanist",
    "linguist",
    "physician",
    "patron",
    "mercenary",
  ]);

  assert.equal(game.players.length, 3);
  assert.equal(game.firstPlayerIndex, 0);
  assert.equal(game.currentPlayerIndex, game.firstPlayerIndex);
  assert.deepEqual(game.deck, []);
  assert.deepEqual(game.display, []);
  assert.equal(game.revealedMonkeys, 0);
  assert.equal(game.currentSeason, 1);
  assert.equal(game.totalSeasons, TOTAL_SEASONS);
  assert.equal(game.phase, "playing");

  for (const [index, player] of game.players.entries()) {
    assert.equal(player.id, `player-${index + 1}`);
    assert.equal(player.name, ["Ana", "Beto", "Clara"][index]);
    assert.deepEqual(player.hand, []);
    assert.deepEqual(player.expeditions, []);
    assert.equal(player.score, 0);
    assert.deepEqual(player.sitePositions, {
      blue: 0,
      green: 0,
      red: 0,
      yellow: 0,
      purple: 0,
      orange: 0,
    });
  }
});

test("setupGame aceita ate 6 jogadores e sorteia o primeiro jogador", () => {
  const game = setupGame(["Ana", "Beto", "Clara", "Dora", "Enzo", "Fabi"], highRng);

  assert.equal(game.players.length, 6);
  assert.equal(game.firstPlayerIndex, 5);
  assert.equal(game.currentPlayerIndex, 5);
});

test("setupGame rejeita configuracoes invalidas da etapa 1", () => {
  assert.throws(() => setupGame(["Ana"], fixedRng), {
    message: "A partida precisa ter entre 2 e 6 jogadores.",
  });

  assert.throws(
    () => setupGame(["Ana", "Beto", "Clara", "Dora", "Enzo", "Fabi", "Gabi"], fixedRng),
    {
      message: "A partida precisa ter entre 2 e 6 jogadores.",
    },
  );

  assert.throws(() => setupGame(["Ana", "   "], fixedRng), {
    message: "Todos os jogadores precisam ter um nome válido.",
  });
});
