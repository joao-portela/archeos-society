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
  advanceSite,
  createDeck,
  getCurrentPlayer,
  playExpedition,
  setupGame,
  validateExpedition,
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
  assert.equal(MONKEY_CARDS_PER_DECK, 10);
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

test("createDeck usa 42 cartas normais e 10 macacos", () => {
  const deck = createDeck();
  const monkeyCards = deck.filter((card) => card.type === "monkey");
  const normalCards = deck.filter((card) => card.type !== "monkey");

  assert.equal(deck.length, 52);
  assert.equal(normalCards.length, NORMAL_CARDS_PER_DECK);
  assert.equal(monkeyCards.length, MONKEY_CARDS_PER_DECK);
});

test("getCurrentPlayer retorna o jogador da vez", () => {
  const game = setupGame(["Ana", "Beto"], fixedRng);

  assert.equal(getCurrentPlayer(game)?.id, game.players[game.currentPlayerIndex].id);
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
// === ETAPA 3 ===

test("validateExpedition aceita expedicao valida por cor", () => {
  const leader = { id: "blue-guide", color: "blue", role: "guide" };
  const selected = [
    { id: "blue-botanist", color: "blue", role: "botanist" },
    { id: "blue-physician", color: "blue", role: "physician" },
  ];

  assert.equal(validateExpedition(leader, selected, "color"), true);
});

test("validateExpedition aceita expedicao valida por personagem", () => {
  const leader = { id: "blue-guide", color: "blue", role: "guide" };
  const selected = [
    { id: "green-guide", color: "green", role: "guide" },
    { id: "red-guide", color: "red", role: "guide" },
  ];

  assert.equal(validateExpedition(leader, selected, "role"), true);
});

test("validateExpedition rejeita expedicao invalida por cor", () => {
  const leader = { id: "blue-guide", color: "blue", role: "guide" };
  const selected = [
    { id: "blue-botanist", color: "blue", role: "botanist" },
    { id: "green-guide", color: "green", role: "guide" },
  ];

  assert.equal(validateExpedition(leader, selected, "color"), false);
});

test("validateExpedition rejeita expedicao invalida por personagem", () => {
  const leader = { id: "blue-guide", color: "blue", role: "guide" };
  const selected = [
    { id: "green-guide", color: "green", role: "guide" },
    { id: "red-botanist", color: "red", role: "botanist" },
  ];

  assert.equal(validateExpedition(leader, selected, "role"), false);
});

test("validateExpedition aceita expedicao sem cartas selecionadas", () => {
  const leader = { id: "blue-guide", color: "blue", role: "guide" };

  assert.equal(validateExpedition(leader, [], "color"), true);
  assert.equal(validateExpedition(leader, [], "role"), true);
});

test("playExpedition rejeita lider incluido em selectedCardIds", () => {
  const game = setupGame(["Ana", "Beto"], fixedRng);
  game.players[0].hand = [
    { id: "blue-guide", color: "blue", role: "guide" },
    { id: "blue-botanist", color: "blue", role: "botanist" },
  ];

  assert.throws(
    () => playExpedition(game, "player-1", "blue-guide", "color", ["blue-guide", "blue-botanist"]),
    { message: "O líder não deve ser incluído em selectedCardIds." },
  );
});

test("playExpedition rejeita selectedTrait invalido", () => {
  const game = setupGame(["Ana", "Beto"], fixedRng);
  game.players[0].hand = [
    { id: "blue-guide", color: "blue", role: "guide" },
    { id: "blue-botanist", color: "blue", role: "botanist" },
  ];

  assert.throws(
    () => playExpedition(game, "player-1", "blue-guide", "rarity", ["blue-botanist"]),
    { message: "Traço inválido para expedição." },
  );
});

test("playExpedition rejeita IDs duplicados em selectedCardIds", () => {
  const game = setupGame(["Ana", "Beto"], fixedRng);
  game.players[0].hand = [
    { id: "blue-guide", color: "blue", role: "guide" },
    { id: "blue-botanist", color: "blue", role: "botanist" },
  ];

  assert.throws(
    () =>
      playExpedition(game, "player-1", "blue-guide", "color", [
        "blue-botanist",
        "blue-botanist",
      ]),
    { message: "Carta não encontrada na mão ou duplicada." },
  );
});

test("playExpedition por cor avanca trilha, salva expedicao e esvazia a mao", () => {
  const game = setupGame(["Ana", "Beto"], fixedRng);
  game.players[0].hand = [
    { id: "blue-guide", color: "blue", role: "guide" },
    { id: "blue-botanist", color: "blue", role: "botanist" },
    { id: "green-linguist", color: "green", role: "linguist" },
  ];

  const next = playExpedition(game, "player-1", "blue-guide", "color", ["blue-botanist"]);
  const player = next.players[0];

  assert.equal(player.hand.length, 0);
  assert.equal(player.expeditions.length, 1);
  assert.equal(player.expeditions[0].leader.id, "blue-guide");
  assert.equal(player.expeditions[0].cards.length, 1);
  assert.equal(player.expeditions[0].selectedTrait, "color");
  assert.equal(player.sitePositions.blue, 1);
});

test("playExpedition por personagem avanca trilha da cor do lider", () => {
  const game = setupGame(["Ana", "Beto"], fixedRng);
  game.players[0].hand = [
    { id: "green-guide", color: "green", role: "guide" },
    { id: "blue-guide", color: "blue", role: "guide" },
    { id: "red-guide", color: "red", role: "guide" },
  ];

  const next = playExpedition(game, "player-1", "green-guide", "role", ["blue-guide", "red-guide"]);
  const player = next.players[0];

  assert.equal(player.sitePositions.green, 1);
  assert.equal(player.sitePositions.blue, 0);
  assert.equal(player.expeditions[0].cards.length, 2);
});

test("playExpedition com apenas o lider nao avanca trilha", () => {
  const game = setupGame(["Ana", "Beto"], fixedRng);
  game.players[0].hand = [
    { id: "blue-guide", color: "blue", role: "guide" },
    { id: "green-linguist", color: "green", role: "linguist" },
  ];

  const next = playExpedition(game, "player-1", "blue-guide", "color", []);
  const player = next.players[0];

  assert.equal(player.sitePositions.blue, 0);
  assert.equal(player.expeditions.length, 1);
  assert.equal(player.expeditions[0].cards.length, 0);
});

test("playExpedition envia cartas restantes para o display", () => {
  const game = setupGame(["Ana", "Beto"], fixedRng);
  game.players[0].hand = [
    { id: "blue-guide", color: "blue", role: "guide" },
    { id: "blue-botanist", color: "blue", role: "botanist" },
    { id: "green-linguist", color: "green", role: "linguist" },
    { id: "red-patron", color: "red", role: "patron" },
  ];

  const next = playExpedition(game, "player-1", "blue-guide", "color", ["blue-botanist"]);

  assert.equal(next.display.length, 2);
  assert.ok(next.display.some((c) => c.id === "green-linguist"));
  assert.ok(next.display.some((c) => c.id === "red-patron"));
  assert.equal(next.players[0].hand.length, 0);
});

test("playExpedition rejeita carta que nao corresponde ao criterio", () => {
  const game = setupGame(["Ana", "Beto"], fixedRng);
  game.players[0].hand = [
    { id: "blue-guide", color: "blue", role: "guide" },
    { id: "green-botanist", color: "green", role: "botanist" },
  ];

  assert.throws(
    () => playExpedition(game, "player-1", "blue-guide", "color", ["green-botanist"]),
    { message: "Expedição inválida: carta não corresponde ao critério escolhido." },
  );
});

test("playExpedition rejeita carta nao encontrada na mao", () => {
  const game = setupGame(["Ana", "Beto"], fixedRng);
  game.players[0].hand = [{ id: "blue-guide", color: "blue", role: "guide" }];

  assert.throws(
    () => playExpedition(game, "player-1", "blue-guide", "color", ["carta-inexistente"]),
    { message: "Carta não encontrada na mão." },
  );
});

test("playExpedition nao muta o estado original", () => {
  const game = setupGame(["Ana", "Beto"], fixedRng);
  game.players[0].hand = [
    { id: "blue-guide", color: "blue", role: "guide" },
    { id: "blue-botanist", color: "blue", role: "botanist" },
  ];

  playExpedition(game, "player-1", "blue-guide", "color", ["blue-botanist"]);

  assert.equal(game.players[0].hand.length, 2);
  assert.equal(game.players[0].expeditions.length, 0);
});

test("advanceSite avanca a posicao na trilha correta", () => {
  const game = setupGame(["Ana", "Beto"], fixedRng);
  const expedition = {
    leader: { id: "blue-guide", color: "blue", role: "guide" },
    cards: [{ id: "blue-botanist", color: "blue", role: "botanist" }],
    selectedTrait: "color",
  };

  const next = advanceSite(game, "player-1", expedition);

  assert.equal(next.players[0].sitePositions.blue, 1);
  assert.equal(next.players[0].sitePositions.green, 0);
});

test("advanceSite nao avanca com expedicao de tamanho 1", () => {
  const game = setupGame(["Ana", "Beto"], fixedRng);
  const expedition = {
    leader: { id: "blue-guide", color: "blue", role: "guide" },
    cards: [],
    selectedTrait: "color",
  };

  const next = advanceSite(game, "player-1", expedition);

  assert.equal(next.players[0].sitePositions.blue, 0);
  assert.equal(next === game, true);
});

test("advanceSite nao ultrapassa MAX_SITE_POSITION", () => {
  const game = setupGame(["Ana", "Beto"], fixedRng);
  game.players[0].sitePositions.blue = MAX_SITE_POSITION;
  const expedition = {
    leader: { id: "blue-guide", color: "blue", role: "guide" },
    cards: [{ id: "blue-botanist", color: "blue", role: "botanist" }],
    selectedTrait: "color",
  };

  const next = advanceSite(game, "player-1", expedition);

  assert.equal(next.players[0].sitePositions.blue, MAX_SITE_POSITION);
});

test("playExpedition nao ultrapassa MAX_SITE_POSITION na trilha", () => {
  const game = setupGame(["Ana", "Beto"], fixedRng);
  game.players[0].sitePositions.blue = MAX_SITE_POSITION;
  game.players[0].hand = [
    { id: "blue-guide", color: "blue", role: "guide" },
    { id: "blue-botanist", color: "blue", role: "botanist" },
  ];

  const next = playExpedition(game, "player-1", "blue-guide", "color", ["blue-botanist"]);

  assert.equal(next.players[0].sitePositions.blue, MAX_SITE_POSITION);
});
