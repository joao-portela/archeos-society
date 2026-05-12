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
  MAX_HAND_SIZE as SIMPLIFIED_MAX_HAND_SIZE,
  MAX_SITE_POSITION,
  MONKEYS_TO_END_SEASON,
  SITE_COLORS,
  TOTAL_SEASONS,
  drawFromDeck as simplifiedDrawFromDeck,
  getCurrentPlayer as getSimplifiedCurrentPlayer,
  playExpedition,
  setupGame,
  startSeason,
  takeFromDisplay as simplifiedTakeFromDisplay,
  validateExpedition,
} from "./simplified/simplifiedGame.js";

const STORAGE_KEYS = {
  currentGame: "archeos.currentGame",
  simplifiedCurrentGame: "archeos.simplifiedCurrentGame",
  ranking: "archeos.ranking",
};

const COLOR_LABELS = {
  blue: "Azul",
  green: "Verde",
  red: "Vermelho",
  yellow: "Amarelo",
  purple: "Roxo",
  orange: "Laranja",
};

const ROLE_LABELS = {
  guide: "Guia",
  photographer: "Fotógrafo",
  botanist: "Botânico",
  linguist: "Linguista",
  physician: "Médico",
  patron: "Patrono",
  mercenary: "Mercenário",
};

const root = document.querySelector("#screen-root");
const menuButtons = [...document.querySelectorAll(".menu-button")];
const defaultPlayers = ["Ayla", "Bruno", "Caio", "Dani", "Enzo"];
const defaultSimplifiedPlayers = ["Ayla", "Bruno", "Caio", "Dani", "Enzo", "Fabi"];

const appState = {
  screen: "home",
  tableName: "Mesa da apresentação",
  playerCount: 2,
  playerNames: defaultPlayers.slice(0, 2),
  game: loadCurrentGame(),
  ranking: loadRanking(),
  selectedSpecialistId: null,
  simplifiedTableName: "Mesa simplificada",
  simplifiedPlayerCount: 2,
  simplifiedPlayerNames: defaultSimplifiedPlayers.slice(0, 2),
  simplifiedGame: loadSimplifiedCurrentGame(),
  selectedLeaderId: null,
  selectedSupportIds: [],
  selectedTrait: "color",
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
  return savedGame ? resolveBlockedTurn(ensureCardState(savedGame)) : null;
}

function isSimplifiedGame(game) {
  return Boolean(
    game &&
      Array.isArray(game.players) &&
      Array.isArray(game.deck) &&
      Array.isArray(game.display) &&
      typeof game.currentSeason === "number" &&
      typeof game.currentPlayerIndex === "number" &&
      typeof game.phase === "string",
  );
}

function loadSimplifiedCurrentGame() {
  const savedGame = loadJson(STORAGE_KEYS.simplifiedCurrentGame, null);
  return isSimplifiedGame(savedGame) ? savedGame : null;
}

function loadRanking() {
  return loadJson(STORAGE_KEYS.ranking, []);
}

function saveCurrentGame() {
  if (appState.game) {
    saveJson(STORAGE_KEYS.currentGame, appState.game);
  }
}

function saveSimplifiedCurrentGame() {
  if (appState.simplifiedGame) {
    saveJson(STORAGE_KEYS.simplifiedCurrentGame, appState.simplifiedGame);
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
  if (!appState.game || appState.game.status !== "active") {
    return;
  }

  appState.game = resolveBlockedTurn(ensureCardState(appState.game));
  saveCurrentGame();
}

function ensurePlayerDraft() {
  while (appState.playerNames.length < appState.playerCount) {
    appState.playerNames.push(defaultPlayers[appState.playerNames.length]);
  }
  appState.playerNames = appState.playerNames.slice(0, appState.playerCount);
}

function ensureSimplifiedPlayerDraft() {
  while (appState.simplifiedPlayerNames.length < appState.simplifiedPlayerCount) {
    appState.simplifiedPlayerNames.push(
      defaultSimplifiedPlayers[appState.simplifiedPlayerNames.length],
    );
  }
  appState.simplifiedPlayerNames = appState.simplifiedPlayerNames.slice(
    0,
    appState.simplifiedPlayerCount,
  );
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

function formatDisplayCardLabel(card) {
  return `${titleCase(card.color)} / ${titleCase(card.role)}`;
}

function formatSimplifiedCardLabel(card) {
  return `${COLOR_LABELS[card.color] ?? card.color} / ${ROLE_LABELS[card.role] ?? card.role}`;
}

function getCardToneClass(card) {
  return card?.color ? `card-tone card-tone--${card.color}` : "";
}

function getSimplifiedExpeditionState(game, leaderId, supportIds, selectedTrait) {
  if (!game || game.phase !== "playing") {
    return { canPlay: false, reason: "A temporada não está em andamento." };
  }

  const currentPlayer = getSimplifiedCurrentPlayer(game);
  if (!currentPlayer) {
    return { canPlay: false, reason: "Não há jogador ativo." };
  }

  if (!leaderId) {
    return { canPlay: false, reason: "Selecione uma carta líder para iniciar a expedição." };
  }

  const leader = currentPlayer.hand.find((card) => card.id === leaderId);
  if (!leader) {
    return { canPlay: false, reason: "A carta líder selecionada não está mais na mão." };
  }

  const selectedCards = supportIds.map((cardId) => currentPlayer.hand.find((card) => card.id === cardId));
  if (selectedCards.some((card) => !card)) {
    return { canPlay: false, reason: "Há cartas de apoio inválidas na seleção." };
  }

  if (!validateExpedition(leader, selectedCards, selectedTrait)) {
    return {
      canPlay: false,
      reason:
        selectedTrait === "color"
          ? "Todas as cartas de apoio precisam ter a mesma cor do líder."
          : "Todas as cartas de apoio precisam ter o mesmo personagem do líder.",
    };
  }

  return { canPlay: true, reason: "" };
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
  if (game.status !== "finished") {
    return;
  }

  if (appState.ranking.some((entry) => entry.gameId === game.id)) {
    return;
  }

  const winner = [...game.players].sort((left, right) => {
    return right.finalScore - left.finalScore || right.score - left.score;
  })[0];

  appState.ranking = [
    {
      gameId: game.id,
      tableName: game.tableName,
      winnerName: winner?.name ?? "Sem vencedor",
      score: winner?.finalScore ?? 0,
      playedAt: new Date().toISOString(),
      playerCount: game.players.length,
    },
    ...appState.ranking,
  ].slice(0, 10);

  saveJson(STORAGE_KEYS.ranking, appState.ranking);
}

function screenHeader(title, subtitle) {
  return `
    <h2 class="screen-title">${title}</h2>
    <p class="screen-subtitle">${subtitle}</p>
  `;
}

function renderModeSelect(currentScreen) {
  const selectedMode = currentScreen === "simplified-home" ? "simplified" : "default";

  return `
    <section class="panel">
      <div class="field">
        <label for="mode-select">Modo de jogo</label>
        <select id="mode-select" data-field="modeSelect">
          <option value="default" ${selectedMode === "default" ? "selected" : ""}>
            Demo principal
          </option>
          <option value="simplified" ${selectedMode === "simplified" ? "selected" : ""}>
            Simplificado
          </option>
        </select>
      </div>
    </section>
  `;
}

function startNewGame() {
  ensurePlayerDraft();

  appState.game = createGame({
    tableName: appState.tableName.trim() || "Mesa da apresentação",
    playerNames: appState.playerNames.map((name, index) => {
      return name.trim() || `Jogador ${index + 1}`;
    }),
  });

  appState.selectedSpecialistId = null;
  saveCurrentGame();
  navigate("game");
}

function startNewSimplifiedGame() {
  ensureSimplifiedPlayerDraft();

  const baseGame = setupGame(
    appState.simplifiedPlayerNames.map((name, index) => name.trim() || `Jogador ${index + 1}`),
  );

  appState.simplifiedGame = startSeason({
    ...baseGame,
    id: `simplified-${Date.now()}`,
    tableName: appState.simplifiedTableName.trim() || "Mesa simplificada",
    createdAt: new Date().toISOString(),
  });

  clearSimplifiedSelection();
  saveSimplifiedCurrentGame();
  navigate("simplified-game");
}

function syncSelectedSpecialist() {
  if (!appState.game || appState.game.status === "finished") {
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

function clearSimplifiedSelection() {
  appState.selectedLeaderId = null;
  appState.selectedSupportIds = [];
  appState.selectedTrait = "color";
}

function syncSimplifiedSelection() {
  const currentPlayer = appState.simplifiedGame
    ? getSimplifiedCurrentPlayer(appState.simplifiedGame)
    : null;

  if (!currentPlayer) {
    clearSimplifiedSelection();
    return;
  }

  const handIds = new Set(currentPlayer.hand.map((card) => card.id));

  if (!handIds.has(appState.selectedLeaderId)) {
    appState.selectedLeaderId = null;
    appState.selectedSupportIds = [];
  }

  appState.selectedSupportIds = appState.selectedSupportIds.filter((cardId) => handIds.has(cardId));
  appState.selectedSupportIds = appState.selectedSupportIds.filter(
    (cardId) => cardId !== appState.selectedLeaderId,
  );
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

function applyGameAction(actionFn) {
  try {
    appState.game = actionFn(appState.game);
    saveCurrentGame();
    render();
  } catch (error) {
    if (appState.game) {
      appState.game.log.push(`Erro: ${error.message}`);
      saveCurrentGame();
      render();
    }
  }
}

function applySimplifiedGameAction(actionFn) {
  try {
    appState.simplifiedGame = actionFn(appState.simplifiedGame);
    syncSimplifiedSelection();
    saveSimplifiedCurrentGame();
    render();
  } catch (error) {
    window.alert(error.message);
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

function handleSimplifiedDrawFromDeck() {
  const currentPlayer = getSimplifiedCurrentPlayer(appState.simplifiedGame);
  if (!currentPlayer) {
    return;
  }

  applySimplifiedGameAction((state) => simplifiedDrawFromDeck(state, currentPlayer.id));
}

function handleSimplifiedTakeFromDisplay(cardId) {
  const currentPlayer = getSimplifiedCurrentPlayer(appState.simplifiedGame);
  if (!currentPlayer) {
    return;
  }

  applySimplifiedGameAction((state) => simplifiedTakeFromDisplay(state, currentPlayer.id, cardId));
}

function handleToggleSimplifiedHandCard(cardId) {
  const currentPlayer = getSimplifiedCurrentPlayer(appState.simplifiedGame);
  if (!currentPlayer) {
    return;
  }

  if (appState.selectedLeaderId === cardId) {
    clearSimplifiedSelection();
    render();
    return;
  }

  if (!appState.selectedLeaderId) {
    appState.selectedLeaderId = cardId;
    render();
    return;
  }

  if (appState.selectedSupportIds.includes(cardId)) {
    appState.selectedSupportIds = appState.selectedSupportIds.filter((id) => id !== cardId);
  } else {
    appState.selectedSupportIds = [...appState.selectedSupportIds, cardId];
  }

  render();
}

function handleSimplifiedPlayExpedition() {
  const currentPlayer = getSimplifiedCurrentPlayer(appState.simplifiedGame);
  if (!currentPlayer || !appState.selectedLeaderId) {
    return;
  }

  applySimplifiedGameAction((state) =>
    playExpedition(
      state,
      currentPlayer.id,
      appState.selectedLeaderId,
      appState.selectedTrait,
      appState.selectedSupportIds,
    ),
  );
}

function clearCurrentGame() {
  appState.game = null;
  appState.selectedSpecialistId = null;
  localStorage.removeItem(STORAGE_KEYS.currentGame);
  render();
}

function clearSimplifiedCurrentGame() {
  appState.simplifiedGame = null;
  clearSimplifiedSelection();
  localStorage.removeItem(STORAGE_KEYS.simplifiedCurrentGame);
  render();
}

function resetDraft() {
  appState.tableName = "Mesa da apresentação";
  appState.playerCount = 2;
  appState.playerNames = defaultPlayers.slice(0, 2);
  render();
}

function resetSimplifiedDraft() {
  appState.simplifiedTableName = "Mesa simplificada";
  appState.simplifiedPlayerCount = 2;
  appState.simplifiedPlayerNames = defaultSimplifiedPlayers.slice(0, 2);
  clearSimplifiedSelection();
  render();
}

function renderHomeScreen() {
  ensurePlayerDraft();

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
      "Monte uma mesa local com 2 a 5 jogadores. Esta entrega já executa o loop principal da partida em hot-seat."
    )}
    <div class="content-grid">
      ${renderModeSelect("home")}
      <section class="panel">
        <h3>Setup rápido</h3>
        <div class="form-grid">
          <div class="field">
            <label for="player-count">Quantidade de jogadores</label>
            <select id="player-count" data-field="playerCount">
              ${[2, 3, 4, 5]
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
          Menu principal, setup, partida local em turnos, coleta de artefatos,
          pontuação por conselheiros, ranking local e autosave por navegador.
        </p>
        ${continueHint}
      </section>
    </div>
  `;
}

function renderSimplifiedHomeScreen() {
  ensureSimplifiedPlayerDraft();

  const playerFields = appState.simplifiedPlayerNames
    .map((name, index) => {
      return `
        <div class="field">
          <label for="simplified-player-${index}">Jogador ${index + 1}</label>
          <input
            id="simplified-player-${index}"
            value="${escapeHtml(name)}"
            data-field="simplifiedPlayerName"
            data-player-index="${index}"
          />
        </div>
      `;
    })
    .join("");

  const continueHint = appState.simplifiedGame
    ? `<p class="meta">Existe uma partida do modo simplificado salva neste navegador.</p>`
    : `<p class="meta">Ainda não há partida salva do modo simplificado.</p>`;

  return `
    ${screenHeader(
      "Modo simplificado",
      "Fluxo separado do demo principal, baseado nas regras simplificadas de cartas, expedições, trilhas e temporadas."
    )}
    <div class="content-grid">
      ${renderModeSelect("simplified-home")}
      <section class="panel">
        <h3>Setup do simplificado</h3>
        <div class="form-grid">
          <div class="field">
            <label for="simplified-player-count">Quantidade de jogadores</label>
            <select id="simplified-player-count" data-field="simplifiedPlayerCount">
              ${[2, 3, 4, 5, 6]
                .map((count) => {
                  return `<option value="${count}" ${
                    appState.simplifiedPlayerCount === count ? "selected" : ""
                  }>${count} jogadores</option>`;
                })
                .join("")}
            </select>
          </div>
          <div class="field">
            <label for="simplified-table-name">Nome da mesa</label>
            <input
              id="simplified-table-name"
              value="${escapeHtml(appState.simplifiedTableName)}"
              placeholder="Mesa simplificada"
              data-field="simplifiedTableName"
            />
          </div>
        </div>
        <div class="form-grid setup-player-grid">
          ${playerFields}
        </div>
        <div class="actions">
          <button class="primary-button" data-action="start-simplified-game">
            Iniciar modo simplificado
          </button>
          ${
            appState.simplifiedGame
              ? `
                <button
                  class="secondary-button"
                  data-action="open-screen"
                  data-screen-target="simplified-game"
                >
                  Continuar simplificado
                </button>
              `
              : ""
          }
          <button class="secondary-button" data-action="reset-simplified-draft">
            Resetar setup
          </button>
        </div>
      </section>
      <section class="panel">
        <h3>Regras aplicadas</h3>
        <ul class="meta-list">
          <li>Baralho com 42 cartas normais e 10 cartas de macaco.</li>
          <li>A temporada encerra no 3º macaco revelado.</li>
          <li>Display inicial por número de jogadores e sem reposição automática.</li>
          <li>Trilhas com limite visual de 5 posições e aviso ao atingir o teto.</li>
        </ul>
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

  const winnerLabel =
    appState.game.status === "finished"
      ? `<p class="meta">Status: encerrada. Pontuação final já calculada.</p>`
      : `<p class="meta">Status: em andamento na rodada ${appState.game.currentRound}.</p>`;

  return `
    ${screenHeader(
      "Continuar partida",
      "Retome a mesa salva ou limpe o autosave para preparar outra apresentação."
    )}
    <section class="panel">
      <h3>${escapeHtml(appState.game.tableName)}</h3>
      ${winnerLabel}
      <p class="meta">Jogadores: ${appState.game.players
        .map((player) => escapeHtml(player.name))
        .join(", ")}</p>
      <div class="actions">
        <button class="primary-button" data-action="load-game">
          ${appState.game.status === "finished" ? "Rever resultado" : "Carregar partida"}
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
                <p class="meta">${escapeHtml(entry.tableName)} - ${entry.playerCount} jogadores</p>
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
  const specialistList = SPECIALIST_TYPES.map((specialist) => {
    return `<li>${specialist.name}: ${specialist.description}</li>`;
  }).join("");

  const counselorList = COUNSELORS.map((counselor) => {
    return `<li>${counselor.name}: ${counselor.summary}</li>`;
  }).join("");

  return `
    ${screenHeader(
      "Tutorial resumido",
      "A partida acontece em rodadas. Em cada turno, o jogador escolhe um especialista e um sítio compatível."
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
          <button class="secondary-button" data-action="clear-simplified-save">
            Limpar save simplificado
          </button>
          <button class="secondary-button" data-action="clear-ranking">Limpar ranking</button>
        </div>
      </section>
    </div>
  `;
}

function renderTrail(player, color) {
  const position = player.sitePositions[color] ?? 0;
  const cells = Array.from({ length: MAX_SITE_POSITION }, (_, index) => {
    const slot = index + 1;
    return `
      <span class="trail-cell ${slot <= position ? "is-filled" : ""}" aria-hidden="true">
        ${slot}
      </span>
    `;
  }).join("");

  return `
    <div class="trail-row">
      <div class="trail-row__label">
        <span class="trail-color trail-color--${color}"></span>
        <strong>${COLOR_LABELS[color]}</strong>
      </div>
      <div class="trail-track">${cells}</div>
      <span class="trail-value">${position}/${MAX_SITE_POSITION}</span>
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
        class="display-card ${getCardToneClass(card)}"
        data-action="take-display"
        data-card-id="${card.id}"
        ${!canGainCards ? "disabled" : ""}
      >
        <span>${escapeHtml(formatDisplayCardLabel(card))}</span>
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
              class="specialist-card ${isSelected ? "is-selected" : ""} ${getCardToneClass(card)}"
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

function renderSimplifiedGameScreen() {
  if (!appState.simplifiedGame) {
    return `
      ${screenHeader(
        "Nenhuma mesa simplificada ativa",
        "Configure uma nova partida simplificada para acessar esse tabuleiro."
      )}
      <section class="panel empty-state">
        <div>
          <h3>Modo simplificado ainda não iniciado</h3>
          <p class="meta">Use a opção Modo Simplificado no menu para abrir uma mesa local.</p>
          <div class="actions">
            <button
              class="primary-button"
              data-action="open-screen"
              data-screen-target="simplified-home"
            >
              Ir para o modo simplificado
            </button>
          </div>
        </div>
      </section>
    `;
  }

  syncSimplifiedSelection();

  const game = appState.simplifiedGame;
  const currentPlayer = game.phase === "playing" ? getSimplifiedCurrentPlayer(game) : null;
  const canGainCards =
    game.phase === "playing" &&
    currentPlayer &&
    currentPlayer.hand.length < SIMPLIFIED_MAX_HAND_SIZE;

  const displayCards = game.display.map((card) => {
    return `
      <button
        class="display-card"
        data-action="simplified-take-display"
        data-card-id="${card.id}"
        ${!canGainCards ? "disabled" : ""}
      >
        <strong>${escapeHtml(COLOR_LABELS[card.color] ?? card.color)}</strong>
        <span>${escapeHtml(ROLE_LABELS[card.role] ?? card.role)}</span>
      </button>
    `;
  });

  const handCards = currentPlayer
    ? currentPlayer.hand
        .map((card) => {
          const isLeader = appState.selectedLeaderId === card.id;
          const isSupport = appState.selectedSupportIds.includes(card.id);

          return `
            <button
              class="specialist-card ${getCardToneClass(card)}"
              data-action="simplified-toggle-hand-card"
              data-card-id="${card.id}"
            >
              <strong>${escapeHtml(formatSimplifiedCardLabel(card))}</strong>
              <span>${isLeader ? "Líder da expedição" : isSupport ? "Carta de apoio" : "Na mão"}</span>
            </button>
          `;
        })
        .join("")
    : "";

  const selectedLeader = currentPlayer?.hand.find((card) => card.id === appState.selectedLeaderId);
  const expeditionState = getSimplifiedExpeditionState(
    game,
    appState.selectedLeaderId,
    appState.selectedSupportIds,
    appState.selectedTrait,
  );
  const selectionSummary = selectedLeader
    ? `Líder: ${formatSimplifiedCardLabel(selectedLeader)}. Apoios: ${appState.selectedSupportIds.length}.`
    : "Selecione primeiro a carta líder da expedição.";

  const maxedTracks = game.players.flatMap((player) =>
    SITE_COLORS.filter((color) => (player.sitePositions[color] ?? 0) >= MAX_SITE_POSITION).map(
      (color) => `${player.name} - ${COLOR_LABELS[color]}`,
    ),
  );

  const playerCards = game.players
    .map((player) => {
      const expeditions = player.expeditions.length
        ? player.expeditions
            .map((expedition) => {
              const size = 1 + expedition.cards.length;
              const traitLabel = expedition.selectedTrait === "color" ? "Cor" : "Personagem";
              return `<li>${escapeHtml(formatSimplifiedCardLabel(expedition.leader))} - ${size} carta(s) - ${traitLabel}</li>`;
            })
            .join("")
        : `<li>Nenhuma expedição nesta temporada.</li>`;

      return `
        <article class="player-card">
          <h3>${escapeHtml(player.name)}</h3>
          <p class="meta">Pontuação total: <strong>${player.score}</strong></p>
          <p class="meta">Mão: ${player.hand.length} carta(s)</p>
          <div class="trail-stack">${SITE_COLORS.map((color) => renderTrail(player, color)).join("")}</div>
          <div class="limit-tags">
            ${SITE_COLORS.filter((color) => (player.sitePositions[color] ?? 0) >= MAX_SITE_POSITION)
              .map((color) => `<span class="limit-tag">Limite em ${escapeHtml(COLOR_LABELS[color])}</span>`)
              .join("")}
          </div>
          <ul class="meta-list expedition-list">${expeditions}</ul>
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
                ? "Empate entre os jogadores com maior pontuação."
                : `Vencedor: <strong>${escapeHtml(
                    game.players.find((player) => player.id === game.winnerId)?.name ?? "N/D",
                  )}</strong>`
            }
          </p>
        </section>
      `
      : `
        <div class="status-strip">
          <span class="status-pill">Temporada ${game.currentSeason}/${TOTAL_SEASONS}</span>
          <span class="status-pill">Vez de ${escapeHtml(currentPlayer.name)}</span>
          <span class="status-pill">Macacos: ${game.revealedMonkeys}/${MONKEYS_TO_END_SEASON}</span>
          <span class="status-pill">Baralho: ${game.deck.length} cartas</span>
        </div>
      `;

  return `
    ${screenHeader(
      "Mesa simplificada em andamento",
      "Fluxo separado do modo principal, com display público, expedições por cartas e trilhas arqueológicas."
    )}
    ${resultBanner}
    ${
      maxedTracks.length
        ? `
          <section class="limit-warning">
            <h3>Limite de trilha alcançado</h3>
            <p class="meta">${escapeHtml(maxedTracks.join(" | "))}</p>
          </section>
        `
        : ""
    }
    <div class="content-grid game-layout">
      <section class="panel panel-stack">
        <h3>Jogador atual</h3>
        ${
          currentPlayer
            ? `
              <p class="meta"><strong>${escapeHtml(currentPlayer.name)}</strong></p>
              <p class="meta">Mão atual: ${currentPlayer.hand.length}/${SIMPLIFIED_MAX_HAND_SIZE}</p>
              ${
                currentPlayer.hand.length >= SIMPLIFIED_MAX_HAND_SIZE
                  ? `<p class="meta warning-text">Limite de mão atingido. Jogue uma expedição para liberar espaço.</p>`
                  : ""
              }
              <div class="specialist-grid">${handCards}</div>
              <div class="trait-toggle" role="group" aria-label="Critério da expedição">
                <button
                  class="secondary-button ${appState.selectedTrait === "color" ? "is-active-filter" : ""}"
                  data-action="simplified-set-trait"
                  data-trait="color"
                >
                  Agrupar por cor
                </button>
                <button
                  class="secondary-button ${appState.selectedTrait === "role" ? "is-active-filter" : ""}"
                  data-action="simplified-set-trait"
                  data-trait="role"
                >
                  Agrupar por personagem
                </button>
              </div>
              <p class="meta">${escapeHtml(selectionSummary)}</p>
              <div class="actions">
                <span
                  class="tooltip-wrap"
                  title="${escapeHtml(
                    expeditionState.canPlay ? "Jogar expedição" : expeditionState.reason,
                  )}"
                >
                  <button
                    class="primary-button"
                    data-action="simplified-play-expedition"
                    ${!expeditionState.canPlay ? "disabled" : ""}
                  >
                    Jogar expedição
                  </button>
                </span>
                <button class="secondary-button" data-action="simplified-clear-selection">
                  Limpar seleção
                </button>
              </div>
              <div class="panel panel-stack">
                <h4>Display público</h4>
                <p class="meta">Cartas abertas: ${game.display.length}</p>
                <div class="display-grid">${displayCards.join("") || '<p class="meta">Display vazio.</p>'}</div>
                <div class="actions">
                  <button
                    class="primary-button"
                    data-action="simplified-draw-deck"
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
          <button
            class="secondary-button"
            data-action="open-screen"
            data-screen-target="simplified-home"
          >
            Voltar ao setup simplificado
          </button>
          <button class="secondary-button" data-action="clear-simplified-save">
            Encerrar mesa simplificada
          </button>
        </div>
      </section>

      <section class="panel panel-stack">
        <h3>Trilhas e expedições</h3>
        <div class="scoreboard-grid">${playerCards}</div>
      </section>
    </div>
  `;
}

function render() {
  let targetScreen = appState.screen;
  if (appState.screen === "game") {
    targetScreen = "home";
  }
  if (appState.screen === "simplified-game") {
    targetScreen = "simplified-home";
  }
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
    case "simplified-home":
      html = renderSimplifiedHomeScreen();
      break;
    case "simplified-game":
      html = renderSimplifiedGameScreen();
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

  if (action === "start-simplified-game") {
    startNewSimplifiedGame();
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

  if (action === "select-specialist" && appState.game?.status === "active") {
    appState.selectedSpecialistId = actionTarget.dataset.specialistId;
    render();
    return;
  }

  if (action === "play-site" && appState.game?.status === "active") {
    handlePlay(actionTarget.dataset.siteId);
    return;
  }

  if (action === "draw-deck" && appState.game?.status === "active") {
    handleDrawFromDeck();
    return;
  }

  if (action === "take-display" && appState.game?.status === "active") {
    handleTakeFromDisplay(actionTarget.dataset.cardId);
    return;
  }

  if (action === "simplified-toggle-hand-card" && appState.simplifiedGame?.phase === "playing") {
    handleToggleSimplifiedHandCard(actionTarget.dataset.cardId);
    return;
  }

  if (action === "simplified-set-trait" && appState.simplifiedGame?.phase === "playing") {
    appState.selectedTrait = actionTarget.dataset.trait;
    render();
    return;
  }

  if (action === "simplified-clear-selection") {
    clearSimplifiedSelection();
    render();
    return;
  }

  if (action === "simplified-play-expedition" && appState.simplifiedGame?.phase === "playing") {
    handleSimplifiedPlayExpedition();
    return;
  }

  if (action === "simplified-draw-deck" && appState.simplifiedGame?.phase === "playing") {
    handleSimplifiedDrawFromDeck();
    return;
  }

  if (action === "simplified-take-display" && appState.simplifiedGame?.phase === "playing") {
    handleSimplifiedTakeFromDisplay(actionTarget.dataset.cardId);
    return;
  }

  if (action === "clear-save") {
    clearCurrentGame();
    return;
  }

  if (action === "clear-simplified-save") {
    clearSimplifiedCurrentGame();
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
    return;
  }

  if (action === "reset-simplified-draft") {
    resetSimplifiedDraft();
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

  if (field === "simplifiedTableName") {
    appState.simplifiedTableName = fieldTarget.value;
    return;
  }

  if (field === "simplifiedPlayerName") {
    const index = Number(fieldTarget.dataset.playerIndex);
    appState.simplifiedPlayerNames[index] = fieldTarget.value;
    return;
  }

  if (field === "modeSelect") {
    navigate(fieldTarget.value === "simplified" ? "simplified-home" : "home");
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

  if (fieldTarget.dataset.field === "simplifiedPlayerCount") {
    appState.simplifiedPlayerCount = Number(fieldTarget.value);
    ensureSimplifiedPlayerDraft();
    render();
  }
});

render();
