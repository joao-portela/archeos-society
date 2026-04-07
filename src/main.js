import { ARTIFACT_TYPES, COUNSELORS, SPECIALIST_TYPES } from "./data/gameData.js";
import {
  createGame,
  getCurrentPlayer,
  getPlayableSitesForSpecialist,
  getScoreboard,
  performExpedition,
  resolveBlockedTurn,
} from "./engine/gameEngine.js";

const STORAGE_KEYS = {
  currentGame: "archeos.currentGame",
  ranking: "archeos.ranking",
};

const root = document.querySelector("#screen-root");
const menuButtons = [...document.querySelectorAll(".menu-button")];
const defaultPlayers = ["Ayla", "Bruno", "Caio", "Dani", "Enzo"];

const appState = {
  screen: "home",
  tableName: "Mesa da apresentação",
  playerCount: 2,
  playerNames: defaultPlayers.slice(0, 2),
  game: loadCurrentGame(),
  ranking: loadRanking(),
  selectedSpecialistId: null,
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
  return savedGame ? resolveBlockedTurn(savedGame) : null;
}

function loadRanking() {
  return loadJson(STORAGE_KEYS.ranking, []);
}

function saveCurrentGame() {
  if (appState.game) {
    saveJson(STORAGE_KEYS.currentGame, appState.game);
  }
}

function normalizeCurrentGame() {
  if (!appState.game || appState.game.status !== "active") {
    return;
  }

  appState.game = resolveBlockedTurn(appState.game);
  saveCurrentGame();
}

function ensurePlayerDraft() {
  while (appState.playerNames.length < appState.playerCount) {
    appState.playerNames.push(defaultPlayers[appState.playerNames.length]);
  }
  appState.playerNames = appState.playerNames.slice(0, appState.playerCount);
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

function clearCurrentGame() {
  appState.game = null;
  appState.selectedSpecialistId = null;
  localStorage.removeItem(STORAGE_KEYS.currentGame);
  render();
}

function resetDraft() {
  appState.tableName = "Mesa da apresentação";
  appState.playerCount = 2;
  appState.playerNames = defaultPlayers.slice(0, 2);
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
          <button class="secondary-button" data-action="clear-ranking">Limpar ranking</button>
        </div>
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
        .map((specialist) => {
          const isSelected = specialist.id === appState.selectedSpecialistId;
          const playable = getPlayableSitesForSpecialist(game, specialist.key).length > 0;

          return `
            <button
              class="specialist-card ${isSelected ? "is-selected" : ""}"
              data-action="select-specialist"
              data-specialist-id="${specialist.id}"
              ${!playable ? "disabled" : ""}
            >
              <strong>${escapeHtml(specialist.name)}</strong>
              <span>${playable ? "Pode agir" : "Sem sítio compatível"}</span>
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

  if (action === "select-specialist" && appState.game?.status === "active") {
    appState.selectedSpecialistId = actionTarget.dataset.specialistId;
    render();
    return;
  }

  if (action === "play-site" && appState.game?.status === "active") {
    handlePlay(actionTarget.dataset.siteId);
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
  }
});

render();
