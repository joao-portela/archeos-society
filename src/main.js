const root = document.querySelector("#screen-root");
const menuButtons = [...document.querySelectorAll(".menu-button")];

const screenTemplates = {
  home: `
    <h2 class="screen-title">Configurar nova partida</h2>
    <p class="screen-subtitle">
      Prepare uma mesa local com 2 a 5 jogadores. Nesta primeira camada da
      demo, ja deixamos o fluxo de navegacao pronto para receber a engine.
    </p>
    <div class="content-grid">
      <section class="panel">
        <h3>Setup rapido</h3>
        <div class="form-grid">
          <div class="field">
            <label for="player-count">Quantidade de jogadores</label>
            <select id="player-count">
              <option>2 jogadores</option>
              <option>3 jogadores</option>
              <option>4 jogadores</option>
              <option>5 jogadores</option>
            </select>
          </div>
          <div class="field">
            <label for="table-name">Nome da mesa</label>
            <input id="table-name" placeholder="Mesa da apresentacao" />
          </div>
        </div>
        <div class="actions">
          <button class="primary-button" disabled>Iniciar demo</button>
          <button class="secondary-button" data-screen-link="tutorial">
            Ver tutorial
          </button>
        </div>
      </section>
      <section class="panel">
        <h3>Escopo desta sprint</h3>
        <p class="meta">
          Menu principal, estrutura da partida, tela de apoio e base visual para
          o tabuleiro digital. As regras entram no proximo commit.
        </p>
      </section>
    </div>
  `,
  continue: `
    <h2 class="screen-title">Continuar partida</h2>
    <p class="screen-subtitle">
      O autosave local sera conectado quando a engine estiver integrada. Esta
      tela ja prepara o fluxo que vamos demonstrar mais adiante.
    </p>
    <section class="panel">
      <h3>Estado atual</h3>
      <p class="meta">Nenhuma partida salva encontrada nesta estrutura inicial.</p>
    </section>
  `,
  ranking: `
    <h2 class="screen-title">Ranking local</h2>
    <p class="screen-subtitle">
      Aqui vamos manter o historico de partidas encerradas da apresentacao,
      diretamente no navegador.
    </p>
    <section class="panel">
      <h3>Classificacao</h3>
      <p class="meta">O ranking sera habilitado junto com o fim de jogo.</p>
    </section>
  `,
  tutorial: `
    <h2 class="screen-title">Tutorial resumido</h2>
    <p class="screen-subtitle">
      Cada jogador escolhe um especialista da propria mao, envia esse membro
      para um sitio arqueologico e coleta artefatos para pontuar com os
      conselheiros ao fim da partida.
    </p>
    <div class="content-grid">
      <section class="panel">
        <h3>Passo 1</h3>
        <p class="meta">Escolha um especialista disponivel.</p>
      </section>
      <section class="panel">
        <h3>Passo 2</h3>
        <p class="meta">Selecione um sitio compativel e execute a expedicao.</p>
      </section>
      <section class="panel">
        <h3>Passo 3</h3>
        <p class="meta">Acumule artefatos e maximize a pontuacao final.</p>
      </section>
    </div>
  `,
  settings: `
    <h2 class="screen-title">Configuracoes</h2>
    <p class="screen-subtitle">
      A demo inicial prioriza simplicidade. Idioma e refinamentos visuais ficam
      registrados aqui como backlog.
    </p>
    <div class="content-grid">
      <section class="panel">
        <h3>Idioma alvo</h3>
        <p class="meta">Portugues (PT-BR) na entrega atual.</p>
      </section>
      <section class="panel">
        <h3>Persistencia</h3>
        <p class="meta">Salvamento local no navegador.</p>
      </section>
    </div>
  `,
};

function setActiveMenu(targetScreen) {
  for (const button of menuButtons) {
    button.classList.toggle("is-active", button.dataset.screen === targetScreen);
  }
}

function renderScreen(screen) {
  root.innerHTML = screenTemplates[screen] ?? screenTemplates.home;
  setActiveMenu(screen);

  for (const link of root.querySelectorAll("[data-screen-link]")) {
    link.addEventListener("click", () => renderScreen(link.dataset.screenLink));
  }
}

for (const button of menuButtons) {
  button.addEventListener("click", () => renderScreen(button.dataset.screen));
}

renderScreen("home");
