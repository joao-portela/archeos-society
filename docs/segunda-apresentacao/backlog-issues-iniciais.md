# Backlog inicial para virar GitHub Issues

Use este arquivo como seed quando o repositorio remoto estiver criado. A ideia e abrir issues pequenas, com labels e criterio de aceite claro.

## Labels recomendados

- `type:feature`
- `type:bug`
- `type:docs`
- `area:frontend`
- `area:gameplay`
- `area:processo`
- `priority:high`
- `priority:medium`
- `presentation:1`
- `presentation:2`

## Issues sugeridas

### 1. Refinar feedback visual dos sitios jogaveis

- Labels: `type:feature`, `area:frontend`, `priority:high`, `presentation:1`
- Objetivo: destacar melhor qual sitio pode receber o especialista selecionado.
- Criterios:
  - o sitio jogavel precisa ficar visualmente distinto;
  - o estado desabilitado precisa continuar legivel;
  - validacao manual em desktop.

### 2. Registrar horas reais por tarefa da Sprint 1

- Labels: `type:docs`, `area:processo`, `priority:high`, `presentation:1`
- Objetivo: alimentar `controle-esforco.csv` com dados reais do grupo.
- Criterios:
  - todas as tarefas da Sprint 1 com responsavel;
  - horas previstas e realizadas preenchidas;
  - observacoes de desvios registradas.

### 3. Gerar grafico de burndown com dados reais

- Labels: `type:docs`, `area:processo`, `priority:high`, `presentation:1`
- Objetivo: converter o template de burndown em artefato pronto para slide.
- Criterios:
  - coluna real preenchida;
  - grafico exportado para imagem ou slide;
  - fonte dos dados documentada.

### 4. Adicionar resumo final de conselheiros por jogador

- Labels: `type:feature`, `area:gameplay`, `priority:medium`, `presentation:1`
- Objetivo: deixar o fechamento da partida mais facil de explicar na demo.
- Criterios:
  - cada jogador mostra bonus por conselheiro;
  - total final aparece de forma destacada;
  - `npm test` continua verde.

### 5. Criar workflow de deploy estatico

- Labels: `type:feature`, `area:processo`, `priority:medium`, `presentation:2`
- Objetivo: publicar a demo automaticamente em GitHub Pages.
- Criterios:
  - deploy em push para `main`;
  - URL documentada no README;
  - fallback local continua funcionando.

### 6. Formalizar estrategia de branch e revisao

- Labels: `type:docs`, `area:processo`, `priority:high`, `presentation:2`
- Objetivo: transformar a estrategia de Git em regra do time.
- Criterios:
  - convencao de branch publicada;
  - template de PR adotado;
  - definicao de aprovacao registrada.

### 7. Cobrir cenarios de autosave e ranking em teste

- Labels: `type:feature`, `area:frontend`, `priority:medium`, `presentation:2`
- Objetivo: ampliar a confiabilidade da demo.
- Criterios:
  - teste para carga de partida salva;
  - teste para gravacao de ranking;
  - casos de dados vazios cobertos.
