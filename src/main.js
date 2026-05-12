import { ARTIFACT_TYPES, COUNSELORS, SPECIALIST_TYPES } from "./data/gameData.js";
import {
  createDeck,
  createInitialDisplay,
  createGame,
  drawFromDeck,
  getCurrentPlayer,
  getPlayableSitesForSpecialist,
  getScoreboard,
  MAX_HAND_SIZE,
  performExpedition,
  resolveBlockedTurn,
  shuffleDeck,
  takeFromDisplay,
} from "./engine/gameEngine.js";
import {
  drawFromDeck as drawFromDeckSimplified,
  MAX_HAND_SIZE as MAX_HAND_SIZE_SIMPLIFIED,
  playExpedition as playExpeditionSimplified,
  setupGame as setupGameSimplified,
  startSeason as startSeasonSimplified,
  takeFromDisplay as takeFromDisplaySimplified,
  validateExpedition as validateExpeditionSimplified,
} from "./simplified/simplifiedGame.js";

const STORAGE_KEYS = {
  currentGame: "archeos.currentGame",
  ranking: "archeos.ranking",
};

const ENGINE_OPTIONS = {
  standard: {
    label: "Modo principal",
    maxPlayers: 5,
  },
  simplified: {
    label: "Modo simplificado",
    maxPlayers: 5,
  },
};

const COLOR_LABELS = {
  azul: "Azul",
  blue: "Azul",
  verde: "Verde",
  green: "Verde",
  vermelho: "Vermelho",
  red: "Vermelho",
  amarelo: "Amarelo",
  yellow: "Amarelo",
  roxo: "Roxo",
  purple: "Roxo",
  laranja: "Laranja",
  orange: "Laranja",
};

const ROLE_LABELS = {
  guia: "Guia",
  guide: "Guia",
  fotografo: "Fotógrafo",
  photographer: "Fotógrafo",
  botanico: "Botânico",
  botanist: "Botânico",
  linguista: "Linguista",
  linguist: "Linguista",
  medico: "Médico",
  physician: "Médico",
  patrono: "Patrono",
  patron: "Patrono",
  mercenario: "Mercenário",
  mercenary: "Mercenário",
};

const COLOR_SWATCH_CLASS = {
  azul: "is-blue",
  blue: "is-blue",
  verde: "is-green",
  green: "is-green",
  vermelho: "is-red",
  red: "is-red",
  amarelo: "is-yellow",
  yellow: "is-yellow",
  roxo: "is-purple",
  purple: "is-purple",
  laranja: "is-orange",
  orange: "is-orange",
};

const root = document.querySelector("#screen-root");
const menuButtons = [...document.querySelectorAll(".menu-button")];
const defaultPlayers = ["Ayla", "Bruno", "Caio", "Dani", "Enzo"];
const initialSavedGame = loadCurrentGame();

const appState = {
  screen: "home",
  engineType: initialSavedGame?.engineType ?? "standard",
  tableName: "Mesa da apresentação",
  playerCount: 2,
  playerNames: defaultPlayers.slice(0, 2),
  game: initialSavedGame,
  ranking: loadRanking(),
  selectedSpecialistId: null,
  selectedLeaderCardId: null,
  selectedTrait: "color",
  selectedSupportCardIds: [],
};

function loadJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (error) {
    console.warn(`Falha ao ler ${key}:`, error);
    return fallback;
  }
}

function saveJson(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function loadCurrentGame() {
  const savedGame = loadJson(STORAGE_KEYS.currentGame, null);
  if (!savedGame) {
    return null;
  }

  const savedEngineType =
    savedGame.engineType && ENGINE_OPTIONS[savedGame.engineType]
      ? savedGame.engineType
      : "standard";

  if (savedEngineType === "simplified") {
    return {
      ...savedGame,
      engineType: savedEngineType,
    };
  }

  return {
    ...resolveBlockedTurn(ensureCardState(savedGame)),
    engineType: savedEngineType,
  };
}

function loadRanking() {
  return loadJson(STORAGE_KEYS.ranking, []);
}

function saveCurrentGame() {
  if (appState.game) {
    saveJson(STORAGE_KEYS.currentGame, {
      ...appState.game,
      engineType: getEngineType(appState.game),
    });
  }
}

function ensureCardState(game) {
  if (!game) {
    return game;
  }

  if (!Array.isArray(game.deck)) {
    const baseState = {
      ...game,
      deck: shuffleDeck(createDeck()),
      display: [],
      monkeysRevealed: game.monkeysRevealed ?? 0,
    };
    return createInitialDisplay(baseState);
  }

  if (!Array.isArray(game.display)) {
    return createInitialDisplay({
      ...game,
      display: [],
      monkeysRevealed: game.monkeysRevealed ?? 0,
    });
  }

  return game;
}

function normalizeCurrentGame() {
  if (
    !appState.game ||
    !isStandardEngine(appState.game) ||
    appState.game.status !== "active"
  ) {
    return;
  }

  appState.game = resolveBlockedTurn(ensureCardState(appState.game));
  saveCurrentGame();
}

function ensurePlayerDraft() {
  const maxPlayers = ENGINE_OPTIONS[appState.engineType].maxPlayers;
  if (appState.playerCount > maxPlayers) {
    appState.playerCount = maxPlayers;
  }

  while (appState.playerNames.length < appState.playerCount) {
    appState.playerNames.push(
      defaultPlayers[appState.playerNames.length] ??
        `Jogador ${appState.playerNames.length + 1}`,
    );
  }
  appState.playerNames = appState.playerNames.slice(0, appState.playerCount);
}

function getEngineType(game = appState.game) {
  if (game?.engineType && ENGINE_OPTIONS[game.engineType]) {
    return game.engineType;
  }

  return appState.engineType;
}

function isStandardEngine(game = appState.game) {
  return getEngineType(game) === "standard";
}

function isSimplifiedEngine(game = appState.game) {
  return getEngineType(game) === "simplified";
}

function isGameFinished(game) {
  if (!game) {
    return false;
  }

  return isStandardEngine(game) ? game.status === "finished" : game.phase === "gameEnd";
}

function isGameActive(game) {
  if (!game) {
    return false;
  }

  return isStandardEngine(game) ? game.status === "active" : game.phase === "playing";
}

function getCurrentPlayerGeneric(game) {
  if (!game) {
    return null;
  }

  return isStandardEngine(game)
    ? getCurrentPlayer(game)
    : game.players[game.currentPlayerIndex] ?? null;
}

function clearSimplifiedSelection() {
  appState.selectedLeaderCardId = null;
  appState.selectedSupportCardIds = [];
  appState.selectedTrait = "color";
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => {
    return {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    }[char];
  });
}

function formatArtifactLabel(artifactKey, count) {
  const artifact = ARTIFACT_TYPES.find((item) => item.key === artifactKey);
  return `${artifact?.name ?? artifactKey}: ${count}`;
}

function titleCase(value) {
  if (!value) {
    return "";
  }
  return `${value[0].toUpperCase()}${value.slice(1)}`;
}

function formatColorLabel(color) {
  return COLOR_LABELS[color] ?? titleCase(color);
}

function formatRoleLabel(role) {
  return ROLE_LABELS[role] ?? titleCase(role);
}

function formatDisplayCardLabel(card) {
  return `${formatColorLabel(card.color)} / ${formatRoleLabel(card.role)}`;
}

function renderDisplayCardFace(card) {
  const swatchClass = COLOR_SWATCH_CLASS[card.color] ?? "";

  return `
    <span class="card-face">
      <span class="color-swatch ${swatchClass}" aria-hidden="true"></span>
      <span>${escapeHtml(formatDisplayCardLabel(card))}</span>
    </span>
  `;
}

function setActiveMenu(targetScreen) {
  for (const button of menuButtons) {
    button.classList.toggle("is-active", button.dataset.screen === targetScreen);
  }
}

function navigate(screen) {
  appState.screen = screen;
  render();
}

function registerFinishedGame(game) {
  if (!isGameFinished(game)) {
    return;
  }

  if (appState.ranking.some((entry) => entry.gameId === game.id)) {
    return;
  }

  const winner = [...game.players].sort((left, right) => {
    if (isStandardEngine(game)) {
      return right.finalScore - left.finalScore || right.score - left.score;
    }

    return right.score - left.score;
  })[0];

  appState.ranking = [
    {
      gameId: game.id,
      tableName: game.tableName,
      winnerName: winner?.name ?? "Sem vencedor",
      score: isStandardEngine(game) ? winner?.finalScore ?? 0 : winner?.score ?? 0,
      playedAt: new Date().toISOString(),
      playerCount: game.players.length,
      engineType: getEngineType(game),
    },
    ...appState.ranking,
  ].slice(0, 10);

  saveJson(STORAGE_KEYS.ranking, appState.ranking);
}

function startNewGame() {
  ensurePlayerDraft();

  const tableName = appState.tableName.trim() || "Mesa da apresentação";
  const playerNames = appState.playerNames.map((name, index) => {
    return name.trim() || `Jogador ${index + 1}`;
  });

  if (isStandardEngine()) {
    appState.game = {
      ...createGame({
        tableName,
        playerNames,
      }),
      engineType: "standard",
    };
  } else {
    const baseGame = setupGameSimplified(playerNames);
    appState.game = {
      ...startSeasonSimplified(baseGame),
      id: `game-${Date.now()}`,
      tableName,
      createdAt: new Date().toISOString(),
      engineType: "simplified",
    };
  }

  appState.selectedSpecialistId = null;
  clearSimplifiedSelection();
  saveCurrentGame();
  navigate("game");
}

function syncSelectedSpecialist() {
  if (!appState.game || !isStandardEngine() || appState.game.status === "finished") {
    appState.selectedSpecialistId = null;
    return;
  }

  const currentPlayer = getCurrentPlayer(appState.game);
  const specialistStillExists = currentPlayer.hand.some(
    (specialist) => specialist.id === appState.selectedSpecialistId,
  );

  if (specialistStillExists) {
    const playableSites = getPlayableSitesForSpecialist(
      appState.game,
      currentPlayer.hand.find(
        (specialist) => specialist.id === appState.selectedSpecialistId,
      )?.key,
    );

    if (playableSites.length > 0) {
      return;
    }
  }

  const nextChoice = currentPlayer.hand.find((specialist) => {
    return getPlayableSitesForSpecialist(appState.game, specialist.key).length > 0;
  });

  appState.selectedSpecialistId = nextChoice?.id ?? null;
}

function handlePlay(siteId) {
  const currentPlayer = getCurrentPlayer(appState.game);
  const specialist = currentPlayer.hand.find(
    (item) => item.id === appState.selectedSpecialistId,
  );

  if (!specialist) {
    return;
  }

  appState.game = performExpedition(appState.game, {
    specialistId: specialist.id,
    siteId,
  });

  registerFinishedGame(appState.game);
  saveCurrentGame();
  syncSelectedSpecialist();
  render();
}

function syncSimplifiedSelection() {
  if (!appState.game || !isSimplifiedEngine() || appState.game.phase === "gameEnd") {
    clearSimplifiedSelection();
    return;
  }

  const currentPlayer = getCurrentPlayerGeneric(appState.game);
  if (!currentPlayer) {
    clearSimplifiedSelection();
    return;
  }

  const hasLeader = currentPlayer.hand.some((card) => card.id === appState.selectedLeaderCardId);
  if (!hasLeader) {
    appState.selectedLeaderCardId = null;
  }

  const handIds = new Set(currentPlayer.hand.map((card) => card.id));
  appState.selectedSupportCardIds = appState.selectedSupportCardIds.filter((id) => {
    return id !== appState.selectedLeaderCardId && handIds.has(id);
  });
}

function handleSimplifiedDrawFromDeck() {
  const currentPlayer = getCurrentPlayerGeneric(appState.game);
  if (!currentPlayer) {
    return;
  }

  applyGameAction((state) => drawFromDeckSimplified(state, currentPlayer.id));
  syncSimplifiedSelection();
}

function handleSimplifiedTakeFromDisplay(cardId) {
  const currentPlayer = getCurrentPlayerGeneric(appState.game);
  if (!currentPlayer) {
    return;
  }

  applyGameAction((state) => takeFromDisplaySimplified(state, currentPlayer.id, cardId));
  syncSimplifiedSelection();
}

function handleSimplifiedExpedition() {
  const currentPlayer = getCurrentPlayerGeneric(appState.game);
  if (!currentPlayer || !appState.selectedLeaderCardId) {
    return;
  }

  applyGameAction((state) =>
    playExpeditionSimplified(
      state,
      currentPlayer.id,
      appState.selectedLeaderCardId,
      appState.selectedTrait,
      appState.selectedSupportCardIds,
    ),
  );
  clearSimplifiedSelection();
}

function applyGameAction(actionFn) {
  try {
    appState.game = actionFn(appState.game);
    registerFinishedGame(appState.game);
    saveCurrentGame();
    render();
  } catch (error) {
    if (appState.game) {
      if (!Array.isArray(appState.game.log)) {
        appState.game.log = [];
      }
      appState.game.log.push(`Erro: ${error.message}`);
      saveCurrentGame();
      render();
    }
  }
}

function handleDrawFromDeck() {
  const currentPlayer = getCurrentPlayer(appState.game);
  if (!currentPlayer) {
    return;
  }

  applyGameAction((state) => drawFromDeck(state, currentPlayer.id));
}

function handleTakeFromDisplay(cardId) {
  const currentPlayer = getCurrentPlayer(appState.game);
  if (!currentPlayer) {
    return;
  }

  applyGameAction((state) => takeFromDisplay(state, currentPlayer.id, cardId));
}

function clearCurrentGame() {
  appState.game = null;
  appState.selectedSpecialistId = null;
  clearSimplifiedSelection();
  localStorage.removeItem(STORAGE_KEYS.currentGame);
  render();
}

function resetDraft() {
  appState.engineType = "standard";
  appState.tableName = "Mesa da apresentação";
  appState.playerCount = 2;
  appState.playerNames = defaultPlayers.slice(0, 2);
  clearSimplifiedSelection();
  render();
}

function screenHeader(title, subtitle) {
  return `
    <h2 class="screen-title">${title}</h2>
    <p class="screen-subtitle">${subtitle}</p>
  `;
}

function renderHomeScreen() {
  ensurePlayerDraft();
  const selectedEngine = ENGINE_OPTIONS[appState.engineType];
  const playerOptions = Array.from(
    { length: selectedEngine.maxPlayers - 1 },
    (_, index) => index + 2,
  );
  const scopeText = isSimplifiedEngine(null)
    ? "Menu principal, setup com escolha de modo, partida local em temporadas, expedições por cor ou função, trilhas, ranking local e autosave por navegador."
    : "Menu principal, setup com escolha de modo, partida local em turnos, sítios ativos, coleta de artefatos, pontuação por conselheiros, ranking local e autosave por navegador.";

  const playerFields = appState.playerNames
    .map((name, index) => {
      return `
        <div class="field">
          <label for="player-${index}">Jogador ${index + 1}</label>
          <input
            id="player-${index}"
            value="${escapeHtml(name)}"
            data-field="playerName"
            data-player-index="${index}"
          />
        </div>
      `;
    })
    .join("");

  const continueHint = appState.game
    ? `<p class="meta">Existe uma partida salva pronta para continuar no menu lateral.</p>`
    : `<p class="meta">Ainda não há partida salva no navegador.</p>`;

  return `
    ${screenHeader(
      "Configurar nova partida",
      `Escolha entre dois modos de jogo e monte uma mesa local com 2 a ${selectedEngine.maxPlayers} jogadores.`
    )}
    <div class="content-grid">
      <section class="panel">
        <h3>Setup rápido</h3>
        <div class="form-grid">
          <div class="field">
            <label for="engine-type">Modo de jogo</label>
            <select id="engine-type" data-field="engineType">
              ${Object.entries(ENGINE_OPTIONS)
                .map(([engineType, config]) => {
                  return `<option value="${engineType}" ${
                    appState.engineType === engineType ? "selected" : ""
                  }>${config.label}</option>`;
                })
                .join("")}
            </select>
          </div>
          <div class="field">
            <label for="player-count">Quantidade de jogadores</label>
            <select id="player-count" data-field="playerCount">
              ${playerOptions
                .map((count) => {
                  return `<option value="${count}" ${
                    appState.playerCount === count ? "selected" : ""
                  }>${count} jogadores</option>`;
                })
                .join("")}
            </select>
          </div>
          <div class="field">
            <label for="table-name">Nome da mesa</label>
            <input
              id="table-name"
              value="${escapeHtml(appState.tableName)}"
              placeholder="Mesa da apresentação"
              data-field="tableName"
            />
          </div>
        </div>
        <div class="form-grid setup-player-grid">
          ${playerFields}
        </div>
        <div class="actions">
          <button class="primary-button" data-action="start-game">Iniciar demo</button>
          <button class="secondary-button" data-action="open-screen" data-screen-target="tutorial">
            Ver tutorial
          </button>
          <button class="secondary-button" data-action="reset-draft">Resetar setup</button>
        </div>
      </section>
      <section class="panel">
        <h3>Escopo desta demo</h3>
        <p class="meta">
          ${scopeText}
        </p>
        ${continueHint}
      </section>
    </div>
  `;
}

function renderContinueScreen() {
  if (!appState.game) {
    return `
      ${screenHeader(
        "Continuar partida",
        "O autosave fica armazenado no navegador para a demonstração."
      )}
      <section class="panel empty-state">
        <h3>Nenhuma partida salva</h3>
        <p class="meta">Inicie uma nova mesa para gerar um autosave local.</p>
      </section>
    `;
  }

  const savedEngineType = getEngineType(appState.game);
  const savedEngine = ENGINE_OPTIONS[savedEngineType] ?? ENGINE_OPTIONS.standard;
  const winnerLabel =
    isGameFinished(appState.game)
      ? `<p class="meta">Status: encerrada. Pontuação final já calculada.</p>`
      : `<p class="meta">Status: em andamento ${
          isStandardEngine(appState.game)
            ? `na rodada ${appState.game.currentRound}.`
            : `na temporada ${appState.game.currentSeason}/${appState.game.totalSeasons}.`
        }</p>`;

  return `
    ${screenHeader(
      "Continuar partida",
      "Retome a mesa salva ou limpe o autosave para preparar outra apresentação."
    )}
    <section class="panel">
      <h3>${escapeHtml(appState.game.tableName)}</h3>
      ${winnerLabel}
      <p class="meta">Modo salvo: ${escapeHtml(savedEngine.label)}</p>
      <p class="meta">Jogadores: ${appState.game.players
        .map((player) => escapeHtml(player.name))
        .join(", ")}</p>
      <div class="actions">
        <button class="primary-button" data-action="load-game">
          ${isGameFinished(appState.game) ? "Rever resultado" : "Carregar partida"}
        </button>
        <button class="secondary-button" data-action="clear-save">Limpar autosave</button>
      </div>
    </section>
  `;
}

function renderRankingScreen() {
  const listHtml = appState.ranking.length
    ? appState.ranking
        .map((entry, index) => {
          return `
            <li class="ranking-item">
              <span class="ranking-position">#${index + 1}</span>
              <div>
                <strong>${escapeHtml(entry.winnerName)}</strong>
                <p class="meta">${escapeHtml(entry.tableName)} - ${entry.playerCount} jogadores - ${
                  escapeHtml(
                    ENGINE_OPTIONS[entry.engineType]?.label ?? ENGINE_OPTIONS.standard.label,
                  )
                }</p>
              </div>
              <span class="ranking-score">${entry.score} pts</span>
            </li>
          `;
        })
        .join("")
    : `
      <li class="ranking-item">
        <div>
          <strong>Aguardando partidas</strong>
          <p class="meta">Finalize uma mesa para popular o ranking local.</p>
        </div>
      </li>
    `;

  return `
    ${screenHeader(
      "Ranking local",
      "Histórico simplificado das últimas partidas encerradas nesta máquina."
    )}
    <section class="panel">
      <ol class="ranking-list">${listHtml}</ol>
      <div class="actions">
        <button class="secondary-button" data-action="clear-ranking">Limpar ranking</button>
      </div>
    </section>
  `;
}

function renderTutorialScreen() {
  if (isSimplifiedEngine(null)) {
    return `
      ${screenHeader(
        "Tutorial do modo simplificado",
        "Neste modo, a partida acontece em temporadas. O jogador monta expedições combinando cartas por cor ou função."
      )}
      <div class="content-grid">
        <section class="panel">
          <h3>Fluxo do turno</h3>
          <ul class="meta-list">
            <li>Compre uma carta do display ou do baralho para aumentar sua mão.</li>
            <li>Escolha uma carta líder para a expedição.</li>
            <li>Defina se os apoios precisam combinar por cor ou por função.</li>
            <li>Selecione cartas de apoio compatíveis com a líder e jogue a expedição.</li>
            <li>As cartas não usadas voltam para o display e a vez passa ao próximo jogador.</li>
          </ul>
        </section>
        <section class="panel">
          <h3>Pontuação</h3>
          <ul class="meta-list">
            <li>Expedições maiores valem mais pontos no fim da temporada.</li>
            <li>Expedições com duas ou mais cartas avançam a trilha da cor da líder.</li>
            <li>A temporada termina quando o terceiro macaco é revelado.</li>
            <li>Depois de três temporadas, vence quem tiver mais pontos.</li>
          </ul>
        </section>
        <section class="panel">
          <h3>Modos de jogo</h3>
          <p class="meta">
            O setup permite alternar entre a engine principal e a engine simplificada antes de iniciar uma nova mesa.
          </p>
        </section>
      </div>
    `;
  }

  const specialistList = SPECIALIST_TYPES.map((specialist) => {
    return `<li>${specialist.name}: ${specialist.description}</li>`;
  }).join("");

  const counselorList = COUNSELORS.map((counselor) => {
    return `<li>${counselor.name}: ${counselor.summary}</li>`;
  }).join("");

  return `
    ${screenHeader(
      "Tutorial do modo principal",
      "Neste modo, a partida acontece em rodadas. Em cada turno, o jogador escolhe um especialista e um sítio compatível."
    )}
    <div class="content-grid">
      <section class="panel">
        <h3>Fluxo do turno</h3>
        <ul class="meta-list">
          <li>Escolha um especialista da mão do jogador atual.</li>
          <li>Selecione um sítio aberto compatível com esse papel.</li>
          <li>Receba artefatos e pontos imediatos da expedição.</li>
          <li>Ao fim de duas rodadas, os conselheiros calculam bônus finais.</li>
        </ul>
      </section>
      <section class="panel">
        <h3>Especialistas</h3>
        <ul class="meta-list">${specialistList}</ul>
      </section>
      <section class="panel">
        <h3>Conselheiros</h3>
        <ul class="meta-list">${counselorList}</ul>
      </section>
    </div>
  `;
}

function renderSettingsScreen() {
  const saveStatus = appState.game
    ? "Autosave disponível no navegador."
    : "Nenhum autosave armazenado no momento.";

  return `
    ${screenHeader(
      "Configurações",
      "A demo prioriza simplicidade, confiabilidade e apresentação rápida."
    )}
    <div class="content-grid">
      <section class="panel">
        <h3>Persistência</h3>
        <p class="meta">${saveStatus}</p>
      </section>
      <section class="panel">
        <h3>Idioma</h3>
        <p class="meta">PT-BR na demo atual. Inglês fica como backlog da Sprint 3.</p>
      </section>
      <section class="panel">
        <h3>Limpeza</h3>
        <div class="actions">
          <button class="secondary-button" data-action="clear-save">Limpar autosave</button>
          <button class="secondary-button" data-action="clear-ranking">Limpar ranking</button>
        </div>
      </section>
    </div>
  `;
}

function renderSimplifiedGameScreen() {
  const game = appState.game;
  if (!game) {
    return "";
  }

  syncSimplifiedSelection();

  const currentPlayer = game.phase === "playing" ? getCurrentPlayerGeneric(game) : null;
  const canGainCards =
    game.phase === "playing" &&
    currentPlayer &&
    currentPlayer.hand.length < MAX_HAND_SIZE_SIMPLIFIED;
  const leader = currentPlayer?.hand.find((card) => card.id === appState.selectedLeaderCardId);
  const supportCards = currentPlayer?.hand.filter((card) => {
    return appState.selectedSupportCardIds.includes(card.id);
  }) ?? [];
  const expeditionValid = validateExpeditionSimplified(
    leader,
    supportCards,
    appState.selectedTrait,
  );

  const displayCards = (game.display ?? [])
    .map((card) => {
      return `
        <button
          class="display-card"
          data-action="take-display-simplified"
          data-card-id="${card.id}"
          ${!canGainCards ? "disabled" : ""}
        >
          ${renderDisplayCardFace(card)}
        </button>
      `;
    })
    .join("");

  const handCards = currentPlayer
    ? currentPlayer.hand
        .map((card) => {
          const isLeader = card.id === appState.selectedLeaderCardId;
          const isSupport = appState.selectedSupportCardIds.includes(card.id);

          return `
            <article class="specialist-card ${isLeader ? "is-selected" : ""}">
              <strong>${renderDisplayCardFace(card)}</strong>
              <span>${isLeader ? "Líder atual" : isSupport ? "Apoio selecionado" : "Disponível"}</span>
              <div class="actions">
                <button
                  class="secondary-button"
                  data-action="select-leader-card"
                  data-card-id="${card.id}"
                >
                  ${isLeader ? "Líder escolhido" : "Definir líder"}
                </button>
                <button
                  class="secondary-button"
                  data-action="toggle-support-card"
                  data-card-id="${card.id}"
                  ${isLeader ? "disabled" : ""}
                >
                  ${isSupport ? "Remover apoio" : "Usar como apoio"}
                </button>
              </div>
            </article>
          `;
        })
        .join("")
    : "";

  const scoreboard = game.players
    .map((player) => {
      const siteSummary = Object.entries(player.sitePositions)
        .map(
          ([color, value]) =>
            `<span class="artifact-chip">${escapeHtml(formatColorLabel(color))}: ${value}</span>`,
        )
        .join("");

      return `
        <article class="player-card">
          <h3>${escapeHtml(player.name)}</h3>
          <p class="meta"><strong>${player.score} pts</strong></p>
          <p class="meta">Expedições na temporada: ${player.expeditions.length}</p>
          <div class="artifact-row">${siteSummary}</div>
        </article>
      `;
    })
    .join("");

  const expeditionSummary = game.players
    .map((player) => {
      const expeditions = player.expeditions.length
        ? player.expeditions
            .map((expedition) => {
              return `<li>${escapeHtml(
                `${formatDisplayCardLabel(expedition.leader)} + ${expedition.cards.length} apoio(s) por ${expedition.selectedTrait}`,
              )}</li>`;
            })
            .join("")
        : "<li>Nenhuma expedição nesta temporada.</li>";

      return `
        <article class="panel">
          <h3>${escapeHtml(player.name)}</h3>
          <ul class="meta-list">${expeditions}</ul>
        </article>
      `;
    })
    .join("");

  const resultBanner =
    game.phase === "gameEnd"
      ? `
        <section class="result-banner">
          <h3>Partida encerrada</h3>
          <p>
            ${
              game.isTie
                ? `Empate entre ${escapeHtml(
                    game.players
                      .filter((player) => game.winnerIds?.includes(player.id))
                      .map((player) => player.name)
                      .join(", "),
                  )}`
                : `Vencedor: <strong>${escapeHtml(
                    game.players.find((player) => player.id === game.winnerId)?.name ?? "N/D",
                  )}</strong>`
            }
          </p>
        </section>
      `
      : `
        <div class="status-strip">
          <span class="status-pill">Temporada ${game.currentSeason}/${game.totalSeasons}</span>
          <span class="status-pill">Vez de ${escapeHtml(currentPlayer.name)}</span>
          <span class="status-pill">Macacos: ${game.revealedMonkeys}/3</span>
        </div>
      `;

  return `
    ${screenHeader(
      "Mesa em andamento",
      "Na engine simplificada, monte expedições por cor ou função e devolva o restante da mão para o display."
    )}
    ${resultBanner}
    <div class="content-grid game-layout">
      <section class="panel panel-stack">
        <h3>Jogador atual</h3>
        ${
          currentPlayer
            ? `
              <p class="meta"><strong>${escapeHtml(currentPlayer.name)}</strong></p>
              <p class="meta">Modo: ${escapeHtml(ENGINE_OPTIONS.simplified.label)}</p>
              <div class="actions">
                <button
                  class="secondary-button"
                  data-action="set-trait"
                  data-trait="color"
                  ${appState.selectedTrait === "color" ? "disabled" : ""}
                >
                  Combinar por cor
                </button>
                <button
                  class="secondary-button"
                  data-action="set-trait"
                  data-trait="role"
                  ${appState.selectedTrait === "role" ? "disabled" : ""}
                >
                  Combinar por função
                </button>
              </div>
              <div class="specialist-grid">${handCards}</div>
              <p class="meta">
                ${
                  leader
                    ? `Líder: ${escapeHtml(formatDisplayCardLabel(leader))}. Apoios: ${supportCards.length}.`
                    : "Escolha uma carta líder para formar a expedição."
                }
              </p>
              <div class="actions">
                <button
                  class="primary-button"
                  data-action="play-expedition-simplified"
                  ${!leader || !expeditionValid ? "disabled" : ""}
                >
                  Jogar expedição
                </button>
              </div>
              <div class="panel panel-stack">
                <h4>Vitrine de cartas</h4>
                <div class="display-grid">${displayCards}</div>
                <div class="actions">
                  <button
                    class="primary-button"
                    data-action="draw-deck-simplified"
                    ${!canGainCards ? "disabled" : ""}
                  >
                    Comprar do baralho
                  </button>
                </div>
              </div>
            `
            : `<p class="meta">A partida já terminou. Revise o resultado abaixo.</p>`
        }
        <div class="actions">
          <button class="secondary-button" data-action="open-screen" data-screen-target="ranking">
            Ver ranking
          </button>
          <button class="secondary-button" data-action="clear-save">Encerrar mesa atual</button>
        </div>
      </section>

      <section class="panel panel-stack">
        <h3>Resumo da temporada</h3>
        <p class="meta">A temporada termina quando o terceiro macaco é revelado.</p>
        <div class="content-grid counselor-grid">${expeditionSummary}</div>
      </section>
    </div>

    <div class="content-grid">
      <section class="panel">
        <h3>Placar</h3>
        <div class="scoreboard-grid">${scoreboard}</div>
      </section>
    </div>
  `;
}

function renderGameScreen() {
  if (!appState.game) {
    return `
      ${screenHeader(
        "Nenhuma mesa ativa",
        "Crie uma nova partida ou carregue um autosave para acessar o tabuleiro."
      )}
      <section class="panel empty-state">
        <div>
          <h3>Jogo ainda não iniciado</h3>
          <p class="meta">Use a opção Nova Partida para abrir uma mesa local hot-seat.</p>
          <div class="actions">
            <button class="primary-button" data-action="open-screen" data-screen-target="home">
              Ir para nova partida
            </button>
          </div>
        </div>
      </section>
    `;
  }

  if (isSimplifiedEngine()) {
    return renderSimplifiedGameScreen();
  }

  normalizeCurrentGame();
  syncSelectedSpecialist();

  const game = appState.game;
  const currentPlayer = game.status === "active" ? getCurrentPlayer(game) : null;
  const selectedSpecialist = currentPlayer?.hand.find(
    (specialist) => specialist.id === appState.selectedSpecialistId,
  );
  const playableSiteIds = new Set(
    selectedSpecialist
      ? getPlayableSitesForSpecialist(game, selectedSpecialist.key).map((site) => site.id)
      : [],
  );
  const canGainCards =
    game.status === "active" && currentPlayer && currentPlayer.hand.length < MAX_HAND_SIZE;
  const displayCards = (game.display ?? []).map((card) => {
    return `
      <button
        class="display-card"
        data-action="take-display"
        data-card-id="${card.id}"
        ${!canGainCards ? "disabled" : ""}
      >
        ${renderDisplayCardFace(card)}
      </button>
    `;
  });

  const scoreboard = getScoreboard(game)
    .map((entry) => {
      const artifacts = Object.entries(entry.artifacts)
        .map(([artifactKey, count]) => {
          return `<span class="artifact-chip">${formatArtifactLabel(artifactKey, count)}</span>`;
        })
        .join("");

      return `
        <article class="player-card">
          <h3>${escapeHtml(entry.name)}</h3>
          <p class="meta">Base: ${entry.score} pts - Bônus: ${entry.finalBonus} pts</p>
          <p class="meta"><strong>Total: ${entry.finalScore} pts</strong></p>
          <div class="artifact-row">${artifacts}</div>
        </article>
      `;
    })
    .join("");

  const siteCards = game.activeSites
    .map((site) => {
      const specialistNames = site.allowedSpecialists
        .map((key) => SPECIALIST_TYPES.find((specialist) => specialist.key === key)?.name ?? key)
        .join(" - ");
      const isClaimed = site.status === "claimed";
      const isPlayable = playableSiteIds.has(site.id);
      const ownerName = isClaimed
        ? game.players.find((player) => player.id === site.claimedBy)?.name ?? "Outro jogador"
        : "Livre";

      return `
        <article class="site-card ${isClaimed ? "is-claimed" : ""} ${
          isPlayable ? "is-playable" : ""
        }">
          <div class="site-header">
            <div>
              <h3>${escapeHtml(site.name)}</h3>
              <p class="meta">${escapeHtml(site.region)}</p>
            </div>
            <span class="site-points">+${site.basePoints} pts</span>
          </div>
          <p class="meta">Especialistas: ${escapeHtml(specialistNames)}</p>
          <p class="meta">Recompensa: ${formatArtifactLabel(site.artifactType, site.reward)}</p>
          <p class="meta">Status: ${escapeHtml(ownerName)}</p>
          <div class="actions">
            <button
              class="primary-button"
              data-action="play-site"
              data-site-id="${site.id}"
              ${!isPlayable ? "disabled" : ""}
            >
              ${isClaimed ? "Expedição concluída" : "Enviar especialista"}
            </button>
          </div>
        </article>
      `;
    })
    .join("");

  const handCards = currentPlayer
    ? currentPlayer.hand
        .map((card) => {
          const isSpecialist = Boolean(card?.key);
          const isSelected = card.id === appState.selectedSpecialistId;
          const playable = isSpecialist
            ? getPlayableSitesForSpecialist(game, card.key).length > 0
            : false;
          const label = isSpecialist
            ? escapeHtml(card.name ?? "Especialista")
            : escapeHtml(formatDisplayCardLabel(card));
          const helperText = isSpecialist
            ? playable
              ? "Pode agir"
              : "Sem sítio compatível"
            : "Carta comum (usada em expedições)";

          return `
            <button
              class="specialist-card ${isSelected ? "is-selected" : ""}"
              data-action="select-specialist"
              data-specialist-id="${card.id}"
              ${!playable ? "disabled" : ""}
              title="${
                isSpecialist
                  ? ""
                  : "Cartas comuns só servem para formar expedições."
              }"
            >
              <strong>${label}</strong>
              <span>${helperText}</span>
            </button>
          `;
        })
        .join("")
    : "";

  const logItems = [...game.log]
    .slice(-6)
    .reverse()
    .map((entry) => `<li>${escapeHtml(entry)}</li>`)
    .join("");

  const resultBanner =
    game.status === "finished"
      ? `
        <section class="result-banner">
          <h3>Partida encerrada</h3>
          <p>
            Vencedor: <strong>${escapeHtml(
              game.players.find((player) => player.id === game.winnerId)?.name ?? "N/D",
            )}</strong>
          </p>
        </section>
      `
      : `
        <div class="status-strip">
          <span class="status-pill">Rodada ${game.currentRound}/${game.rounds}</span>
          <span class="status-pill">Vez de ${escapeHtml(currentPlayer.name)}</span>
          <span class="status-pill">Mesa: ${escapeHtml(game.tableName)}</span>
        </div>
      `;

  const counselorCards =
    game.status === "finished"
      ? game.players
          .map((player) => {
            const breakdown = player.finalBreakdown
              .map((item) => {
                return `<li>${escapeHtml(item.counselorName)}: ${item.points} pts</li>`;
              })
              .join("");

            return `
              <article class="panel">
                <h3>${escapeHtml(player.name)}</h3>
                <ul class="meta-list">${breakdown}</ul>
              </article>
            `;
          })
          .join("")
      : COUNSELORS.map((counselor) => {
          return `
            <article class="panel">
              <h3>${escapeHtml(counselor.name)}</h3>
              <p class="meta">${escapeHtml(counselor.summary)}</p>
            </article>
          `;
        }).join("");

  return `
    ${screenHeader(
      "Mesa em andamento",
      "Use um especialista da mão do jogador atual para ocupar um sítio aberto e acumular artefatos."
    )}
    ${resultBanner}
    <div class="content-grid game-layout">
      <section class="panel panel-stack">
        <h3>Jogador atual</h3>
        ${
          currentPlayer
            ? `
              <p class="meta"><strong>${escapeHtml(currentPlayer.name)}</strong></p>
              <div class="specialist-grid">${handCards}</div>
              <div class="panel panel-stack">
                <h4>Vitrine de cartas</h4>
                <div class="display-grid">${displayCards.join("")}</div>
                <div class="actions">
                  <button
                    class="primary-button"
                    data-action="draw-deck"
                    ${!canGainCards ? "disabled" : ""}
                  >
                    Comprar do baralho
                  </button>
                </div>
              </div>
            `
            : `<p class="meta">A partida já terminou. Revise o resultado abaixo.</p>`
        }
        <div class="actions">
          <button class="secondary-button" data-action="open-screen" data-screen-target="ranking">
            Ver ranking
          </button>
          <button class="secondary-button" data-action="clear-save">Encerrar mesa atual</button>
        </div>
      </section>

      <section class="panel panel-stack">
        <h3>Sítios ativos</h3>
        <div class="site-grid">${siteCards}</div>
      </section>
    </div>

    <div class="content-grid">
      <section class="panel">
        <h3>Placar</h3>
        <div class="scoreboard-grid">${scoreboard}</div>
      </section>
      <section class="panel">
        <h3>${game.status === "finished" ? "Resumo dos conselheiros" : "Conselheiros"}</h3>
        <div class="content-grid counselor-grid">${counselorCards}</div>
      </section>
      <section class="panel">
        <h3>Últimos eventos</h3>
        <ul class="meta-list log-list">${logItems}</ul>
      </section>
    </div>
  `;
}

function render() {
  const targetScreen = appState.screen === "game" ? "home" : appState.screen;
  setActiveMenu(targetScreen);

  let html;

  switch (appState.screen) {
    case "continue":
      html = renderContinueScreen();
      break;
    case "ranking":
      html = renderRankingScreen();
      break;
    case "tutorial":
      html = renderTutorialScreen();
      break;
    case "settings":
      html = renderSettingsScreen();
      break;
    case "game":
      html = renderGameScreen();
      break;
    case "home":
    default:
      html = renderHomeScreen();
      break;
  }

  root.innerHTML = html ?? renderHomeScreen();
}

for (const button of menuButtons) {
  button.addEventListener("click", () => navigate(button.dataset.screen));
}

root.addEventListener("click", (event) => {
  const actionTarget = event.target.closest("[data-action]");
  if (!actionTarget) {
    return;
  }

  const { action } = actionTarget.dataset;

  if (action === "start-game") {
    startNewGame();
    return;
  }

  if (action === "open-screen") {
    navigate(actionTarget.dataset.screenTarget);
    return;
  }

  if (action === "load-game" && appState.game) {
    navigate("game");
    return;
  }

  if (action === "select-specialist" && isStandardEngine() && appState.game?.status === "active") {
    appState.selectedSpecialistId = actionTarget.dataset.specialistId;
    render();
    return;
  }

  if (action === "play-site" && isStandardEngine() && appState.game?.status === "active") {
    handlePlay(actionTarget.dataset.siteId);
    return;
  }

  if (action === "draw-deck" && isStandardEngine() && appState.game?.status === "active") {
    handleDrawFromDeck();
    return;
  }

  if (action === "take-display" && isStandardEngine() && appState.game?.status === "active") {
    handleTakeFromDisplay(actionTarget.dataset.cardId);
    return;
  }

  if (action === "select-leader-card" && isSimplifiedEngine() && isGameActive(appState.game)) {
    const cardId = actionTarget.dataset.cardId;
    appState.selectedLeaderCardId = cardId;
    appState.selectedSupportCardIds = appState.selectedSupportCardIds.filter((id) => id !== cardId);
    render();
    return;
  }

  if (action === "toggle-support-card" && isSimplifiedEngine() && isGameActive(appState.game)) {
    const cardId = actionTarget.dataset.cardId;
    if (cardId === appState.selectedLeaderCardId) {
      return;
    }

    const selectedIds = new Set(appState.selectedSupportCardIds);
    if (selectedIds.has(cardId)) {
      selectedIds.delete(cardId);
    } else {
      selectedIds.add(cardId);
    }
    appState.selectedSupportCardIds = [...selectedIds];
    render();
    return;
  }

  if (action === "set-trait" && isSimplifiedEngine() && isGameActive(appState.game)) {
    appState.selectedTrait = actionTarget.dataset.trait;
    render();
    return;
  }

  if (
    action === "play-expedition-simplified" &&
    isSimplifiedEngine() &&
    isGameActive(appState.game)
  ) {
    handleSimplifiedExpedition();
    return;
  }

  if (action === "draw-deck-simplified" && isSimplifiedEngine() && isGameActive(appState.game)) {
    handleSimplifiedDrawFromDeck();
    return;
  }

  if (
    action === "take-display-simplified" &&
    isSimplifiedEngine() &&
    isGameActive(appState.game)
  ) {
    handleSimplifiedTakeFromDisplay(actionTarget.dataset.cardId);
    return;
  }

  if (action === "clear-save") {
    clearCurrentGame();
    return;
  }

  if (action === "clear-ranking") {
    appState.ranking = [];
    saveJson(STORAGE_KEYS.ranking, appState.ranking);
    render();
    return;
  }

  if (action === "reset-draft") {
    resetDraft();
  }
});

root.addEventListener("input", (event) => {
  const fieldTarget = event.target.closest("[data-field]");
  if (!fieldTarget) {
    return;
  }

  const { field } = fieldTarget.dataset;

  if (field === "tableName") {
    appState.tableName = fieldTarget.value;
    return;
  }

  if (field === "playerName") {
    const index = Number(fieldTarget.dataset.playerIndex);
    appState.playerNames[index] = fieldTarget.value;
    return;
  }
});

root.addEventListener("change", (event) => {
  const fieldTarget = event.target.closest("[data-field]");
  if (!fieldTarget) {
    return;
  }

  if (fieldTarget.dataset.field === "playerCount") {
    appState.playerCount = Number(fieldTarget.value);
    ensurePlayerDraft();
    render();
    return;
  }

  if (fieldTarget.dataset.field === "engineType") {
    appState.engineType = fieldTarget.value in ENGINE_OPTIONS ? fieldTarget.value : "standard";
    ensurePlayerDraft();
    render();
  }
});

render();
