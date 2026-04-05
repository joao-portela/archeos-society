# Plano revisado para a primeira apresentação

## Direcionamento

Este plano foi refeito para atender ao que a disciplina realmente cobra na apresentação 1: coerência de gerenciamento mais uma demo parcial convincente.

## Escopo do produto para a demo

### MVP da apresentação 1

- menu principal com `Nova Partida`, `Continuar`, `Ranking`, `Tutorial` e `Configurações`;
- partida local hot-seat com `2 a 5 jogadores`;
- turno com seleção de especialista, escolha de sítio e execução da ação;
- coleta de artefatos e pontuação base por expedição;
- pontuação adicional por conselheiros ao fim do jogo;
- duas rodadas com reinicialização automática do tabuleiro;
- detecção automática de fim de jogo;
- salvamento automático local ao fim de cada turno;
- ranking local persistido no navegador;
- demo jogável em navegador sem dependência de backend.

### Backlog pós-apresentação 1

- autenticação e perfis;
- sincronização online;
- API REST;
- banco remoto;
- ranking global;
- internacionalização completa;
- pipeline de CI/CD;
- deploy público permanente.

## Escopo do projeto

O detalhamento da EAP e das estimativas está em `eap-estimativas.csv`.

Resumo consolidado:

- total estimado: `74 SP`;
- conversão adotada: `1 SP = 4h`;
- esforço estimado: `296h`;
- duração planejada: `8 semanas`;
- cadência: `4 sprints de 2 semanas`.

## Distribuição por sprint

- Sprint 1: planejamento, requisitos, riscos, wireframes, base da navegação e artefatos da apresentação 1.
- Sprint 2: engine do jogo, regras, artefatos, persistência local.
- Sprint 3: interface principal da partida, ranking local, smoke tests.
- Sprint 4: fluxo Git formalizado, automação básica, polimento final e documentação pública.

O cronograma de referência está em `cronograma.csv`.

## Estimativa de custo e orçamento

Para evitar as inconsistências do plano anterior, a base de custo foi recalculada sobre as `296h` estimadas.

| Papel | Horas | Taxa (R$/h) | Custo (R$) |
| --- | ---: | ---: | ---: |
| PM | 44h | 80 | 3.520 |
| Dev Gameplay | 92h | 95 | 8.740 |
| Dev Frontend | 76h | 85 | 6.460 |
| Designer/UX | 36h | 60 | 2.160 |
| QA/Docs | 48h | 55 | 2.640 |
| **Total pessoal** | **296h** |  | **23.520** |

Infraestrutura e ferramentas para a demo inicial:

| Item | Custo (R$) | Observação |
| --- | ---: | --- |
| GitHub / GitHub Issues | 0 | plano gratuito |
| GitHub Pages ou Netlify | 0 | deploy estático opcional |
| Figma Free | 0 | suficiente para wireframes iniciais |
| **Total infraestrutura** | **0** | MVP sem custo obrigatório |

Reserva de contingência:

- base: `10%` sobre custo de pessoal;
- valor: `R$ 2.352,00`.

Orçamento total revisado:

- subtotal: `R$ 23.520,00`;
- contingência: `R$ 2.352,00`;
- total aprovado sugerido: `R$ 25.872,00`.

## Riscos prioritários

| ID | Risco | Probabilidade | Impacto | Exposição | Resposta preventiva |
| --- | --- | ---: | ---: | ---: | --- |
| R01 | Regras subestimadas | 4 | 5 | 20 | spike técnico e protótipo cedo |
| R02 | Escopo excessivo para a primeira demo | 4 | 4 | 16 | congelar MVP e empurrar extras para backlog |
| R03 | Falta de registro de horas inviabilizar Burndown/AVA | 4 | 4 | 16 | planilha preenchida diariamente |
| R04 | Conflito com propriedade intelectual | 3 | 5 | 15 | arte própria e texto autoral |
| R05 | Interface difícil de explicar em 15 minutos | 3 | 4 | 12 | tutorial curto e fluxo de demo simples |
| R06 | Fluxo Git começar tarde demais | 3 | 3 | 9 | iniciar repositório e convenções já na sprint 1 |
| R07 | Indisponibilidade parcial de membro do grupo | 2 | 4 | 8 | documentação contínua e pareamento |

## Monitoramento e controle

Para evitar fabricação de números, a documentação desta pasta já deixa os artefatos prontos, mas com preenchimento real:

- `controle-esforco.csv`: horas previstas e realizadas por tarefa;
- `burndown-sprint1.csv`: linha ideal pronta e coluna real em aberto;
- `ava-template.csv`: base para PV, EV e AC por sprint.

Regra recomendada:

- atualizar horas diariamente;
- fechar o burndown ao fim de cada dia útil;
- fechar a AVA ao fim de cada sprint com base apenas em dados efetivos.

## Estratégia de demo

Para a apresentação 1, a demo deve mostrar este fluxo em menos de 5 minutos:

1. abrir o menu;
2. iniciar uma nova partida;
3. executar alguns turnos com dois jogadores;
4. mostrar artefatos, conselheiros e avanço de rodada;
5. carregar uma partida salva ou mostrar ranking local.

Isso reduz risco e cobre o que o professor quer ver: produto parcial, decisões de projeto e capacidade de execução.
