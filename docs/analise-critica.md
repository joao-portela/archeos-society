# Análise crítica do enunciado e do plano original

## O que o professor pede de fato na primeira apresentação

Para a primeira apresentação, o grupo precisa mostrar:

- escopo do produto com requisitos;
- escopo do projeto com EAP;
- estimativas de esforço;
- custo, orçamento e cronograma;
- análise de riscos;
- monitoramento e controle do projeto;
- uma versão parcial do produto em demo.

Isso significa que a apresentação 1 precisa de coerência de gestão e de um MVP demonstrável. Não precisa de um produto final completo nem de uma arquitetura superdimensionada.

## Inconsistências identificadas no DOCX

1. O orçamento aprovado aparece com dois valores diferentes.
   No texto introdutório consta `R$ 63.480,00`, enquanto a seção de orçamento fecha em `R$ 63.965,00`.

2. A EAP e o Gantt não falam a mesma língua.
   A EAP lista até `1.3.4 API REST`, mas o Gantt introduz `1.3.3 Sistema de IA`, `1.3.5 API REST` e telas que não existem na EAP, como ranking, tutorial e configurações.

3. As velocidades por sprint não batem com a estimativa total.
   O documento estima `111 SP`, mas o cronograma distribui `38 + 56 + 49 + 35 = 178 SP`.

4. A seção de APF está numericamente inconsistente.
   A soma dos ILFs apresentados dá `49 PF`. A soma das transações listadas dá `42 PF`. O texto, porém, alterna entre `41`, `52`, `56`, `91` e `108`, e ainda calcula `100,1 PF` a partir de um valor-base incompatível.

5. O esforço total não fecha com o custo de pessoal.
   Planning Poker aponta `444h`, APF aponta `520h`, a média adotada é `482h`, mas a alocação de pessoas soma `650h`.

6. Os planos de contingência contradizem as restrições do projeto.
   O documento proíbe contratações externas, mas em riscos como atraso de assets e rotatividade da equipe aparece contratação de freelancer como contingência.

7. Burndown e AVA aparecem como se o projeto já tivesse terminado.
   Para a apresentação 1 isso é um problema: esses dados precisam ser reais até a data da apresentação, não "preenchidos de futuro".

8. Existe esforço excessivo para o estágio atual do trabalho.
   Para uma demo inicial, autenticação, servidor dedicado, API REST, banco gerenciado, domínio, SSL, testes de carga e ranking global são itens que elevam muito o risco e pouco ajudam na primeira entrega.

9. Há risco jurídico desnecessário se o grupo usar arte oficial ou reproduzir o jogo de forma literal.
   O professor permite variações do sistema Ethnos/Archeos Society. Para reduzir risco, a demo deve usar visual original do grupo e textos próprios, ainda que mantenha a inspiração mecânica.

10. A numeração dos requisitos sugere recortes não limpos.
    Começar em `RF03` e `RNF03` não é um erro fatal, mas passa a impressão de documento reaproveitado sem revisão final.

## Recomendações para corrigir antes de continuar

- Replanejar o projeto com foco em MVP de apresentação, não em produto final completo.
- Tratar backend remoto, autenticação e infraestrutura paga como backlog posterior, não como obrigação da demo.
- Consolidar uma EAP única e fazer o Gantt nascer dela, e não o contrário.
- Refazer custo e esforço com uma única linha de raciocínio consistente.
- Usar templates de Burndown e AVA agora, preenchendo apenas dados reais conforme o projeto avançar.
- Posicionar a entrega atual como "vertical slice" jogável, em hot-seat local, com persistência local.

## Escopo recomendado para a demo da primeira apresentação

### Deve entrar agora

- menu principal;
- nova partida com 2 a 5 jogadores locais;
- tabuleiro com sítios ativos;
- escolha de especialista e execução do turno;
- coleta de artefatos;
- pontuação por conselheiros;
- fim de rodada e fim de jogo;
- salvamento automático local;
- ranking local;
- documentação e métricas-base do projeto.

### Deve ficar para depois

- autenticação;
- API REST;
- banco remoto;
- multiplayer online;
- deploy com infraestrutura paga;
- CI/CD completo;
- i18n completa;
- tutorial avançado;
- refinamentos visuais finais.
