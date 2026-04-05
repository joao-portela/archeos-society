# Estrategia de Git, branches e revisao

## Fluxo recomendado

- `main` guarda sempre a versao demonstravel do projeto.
- cada trabalho novo nasce em branch curta a partir de `main`.
- convencao sugerida de branch:
  - `feature/nome-curto`
  - `fix/nome-curto`
  - `docs/nome-curto`

## Relacao com as issues

- toda branch deve nascer de uma issue;
- o titulo do PR deve mencionar a issue;
- o merge so deve acontecer depois de review por outro membro do grupo.

## Tamanho dos PRs

- preferir PRs pequenos, de uma responsabilidade so;
- evitar misturar documentacao, refactor e feature no mesmo PR;
- manter cada PR revisavel em poucos minutos.

## Checklist minimo para aprovar PR

- objetivo claro;
- evidencias de validacao manual ou `npm test`;
- nenhum arquivo irrelevante misturado;
- impacto na demo conhecido.

## Sugestao de apresentacao para o professor

Na segunda apresentacao, mostrem:

- o historico dos commits pequenos;
- as issues que deram origem ao trabalho;
- um PR com checklist preenchido;
- o workflow do GitHub Actions executando os testes.
