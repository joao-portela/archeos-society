# Archeos Society: Edicao Digital

Protótipo jogável em versão web local para a primeira apresentação da disciplina de Gerência de Projetos e Manutenção de Software.

## O que já está no repositório

- Demo web em hot-seat com 2 a 5 jogadores.
- Loop jogável com escolha de especialista, escolha de sítio, coleta de artefatos, avanço de rodada e pontuação final.
- Salvamento automático em `localStorage`.
- Ranking local para reaproveitar a demo em apresentação.
- Documentação revisada para a primeira apresentação, incluindo escopo, EAP, estimativas, cronograma, riscos e templates de monitoramento.

## Como rodar

1. Abra um terminal na pasta do projeto.
2. Execute `npm run start`.
3. Abra `http://localhost:4173`.

Como alternativa, você pode usar `python -m http.server 4173`.

## Como testar a lógica

Execute:

```bash
npm test
```

## Estrutura

- `index.html`: ponto de entrada da demo.
- `styles.css`: identidade visual da apresentação.
- `src/data/gameData.js`: especialistas, conselheiros, artefatos e templates de sítios.
- `src/engine/gameEngine.js`: regras centrais do jogo.
- `src/main.js`: interface, navegação, persistência local e ranking.
- `tests/gameEngine.test.js`: testes da engine.
- `docs/analise-critica.md`: inconsistências encontradas no plano original.
- `docs/primeira-apresentacao/`: artefatos preparados para a apresentação 1.

## Observação importante

Esta entrega está posicionada como MVP acadêmico para a primeira apresentação. A documentação revisada corta esforço desnecessário para a demo inicial, mas mantém um caminho claro para evoluir o produto nas próximas sprints.
