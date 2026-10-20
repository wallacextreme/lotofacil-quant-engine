# 🛠️ CHANGELOG TÉCNICO & REGISTRO FORENSE DE CORREÇÃO

## MÓDULO ESTATÍSTICO AVANÇADO (CICLO, LINHAS, RELACIONAMENTOS, COBERTURA E WALK-FORWARD)
**Projeto:** LOTOFÁCIL QUANT ENGINE  
**Data:** 05 de Outubro de 2026  
**Responsável:** Engenheiro Sênior de Correção Forense  
**Status do Patch:** Concluído e Aprovado nos Quality Gates  

---

## 1. RESUMO EXECUTIVO DO PATCH

O presente patch forense controlado teve por objetivo sanar todas as 8 não-conformidades comprovadas no relatório oficial de auditoria técnica (`docs/AUDIT_MODULE_CYCLE_LINES_RELATIONSHIPS.md`), compreendendo:
- **4 problemas de severidade P1 (Alta)**: Ausência de conexão do `AbsenceDistributionOptimizer`, distorção de escala multiobjetivo no otimizador (100×), falsos positivos na classificação de casadas/brigadas e ablação assimétrica no walk-forward backtest.
- **4 problemas de severidade P2 (Média)**: Dependência de IDs consecutivos para cálculo de duração de ciclo, janelas de relacionamentos dependentes do dataset global, modo de linhas hardcoded no scoring e falta de distinção explícita entre backtest heurístico (proxy) e modo de produção.
- **1 análise de colinearidade P3 (Baixa / Informativo)**: Mapeamento de redundâncias estocásticas entre frequência, Z-Score, atraso e ciclo.

Nenhuma arquitetura existente foi descartada ou reconstruída; contratos públicos foram preservados e o validador Zero-Trust foi mantido estritamente independente.

---

## 2. PROBLEMAS ENCONTRADOS E SOLUÇÕES APLICADAS

### ISSUE-01 (P1): Ausência do AbsenceOptimizer no Laço de Seleção
- **Diagnóstico:** As funções de avaliação de matriz 25×K (`analyzePortfolioExposure`) e dispersão de dezenas ausentes não estavam ativas no fluxo de geração do portfólio.
- **Correção:**
  1. No otimizador (`optimizer.ts`), durante o laço GRASP de expansão da carteira, cada candidato viável passa a ter seu impacto na matriz de exposição avaliado via `analyzePortfolioExposure` quando `weights.exposureBalance > 0`.
  2. O `exposureGain` (correspondente ao `ExposureBalanceScore` $\in [0.0, 1.0]$) é somado à função de utilidade marginal de seleção (RCL).
  3. No portfólio completo, a pontuação global incorpora o bônus de equilíbrio de ausências proporcional a `weights.exposureBalance`.
  4. O validador Zero-Trust (`validator.ts`) audita a matriz de exposição 25×K de forma autônoma sem reaproveitar metadados do gerador, gravando `exposureAudit` no resultado.
- **Impacto:** Carteiras com peso de exposição ativo equilibram a aparição das 25 dezenas pelo volante em vez de sobrecarregar dezenas ausentes em um único jogo.

### ISSUE-02 (P1): Padronização da Escala Interna de Scoring em $[0.0, 1.0]$
- **Diagnóstico:** Em `optimizer.ts`, estratégias como `5_3_2`, `CYCLE` e `LINES` multiplicavam o score do candidato por 100, desbalanceando os objetivos de cobertura (`weights.coverage * (new/15)`) e diversidade Hamming (`weights.diversity * (dist/25)`), ambos em $[0.0, 1.0]$.
- **Correção:**
  1. Removido o fator multiplicador 100 de todas as rotas de estratégia em `optimizer.ts`.
  2. Todos os componentes do `ScoreBreakdown` operam na escala padronizada $[0.0, 1.0]$.
  3. O teste de sensibilidade garante que peso = 0 zera a influência e peso = 1.0 contribui proporcionalmente.
- **Impacto:** Equilíbrio Pareto multiobjetivo matematicamente estável e previsível.

### ISSUE-03 (P1): Eliminação de Falsos Positivos de Casadas e Brigadas
- **Diagnóstico:** `relationships.ts` continha cláusulas de fallback (`|| p.difference > 0` e `|| p.difference < 0`) em `topCasadas` e `topBrigadas`, promovendo pares não significativos ($q \ge 0.05$) à interface.
- **Correção:**
  1. Removidos os fallbacks; agora é exigido estritamente `p.isSignificant && (p.classification === 'CASADA_FORTE' || p.classification === 'CASADA_MODERADA')` (e análogo para brigadas).
  2. Na interface (`cyclesPage.ts`), se a contagem for zero, é exibido o aviso canônico `SEM EVIDÊNCIA SUFICIENTE`.
- **Impacto:** Rigor epistêmico auditável, sem induzir o usuário ao erro com falsas correlações.

### ISSUE-04 (P1): Simetrização dos Testes de Ablação Walk-Forward
- **Diagnóstico:** O benchmark `FULL MODEL` usava arquitetura 5-3-2, enquanto as ablações geravam 10 jogos monolíticos com regras distintas, quebrando a premissa de *ceteris paribus*.
- **Correção:**
  1. Em `walkForward.ts`, todas as 5 ablações (`FULL - CYCLE`, `FULL - LINES`, `FULL - PAIRS`, `FULL - DELAY`, `FULL - COVERAGE`) foram refatoradas para utilizar rigorosamente a partição 5-3-2 (5 jogos Grupo A, 3 jogos Grupo B, 2 jogos Grupo C).
  2. Em cada variante, apenas o módulo-alvo da ablação é desativado ou substituído pelo neutro correspondente.
- **Impacto:** As métricas de acertos, delta e ROI teórico medem com precisão a contribuição marginal de cada módulo.

### ISSUE-05 (P2): Duração de Ciclo Baseada em Contagem Real de Sorteios
- **Diagnóstico:** Em `cycles.ts`, `contest - cycleStartContest + 1` assumia IDs consecutivos, falhando em datasets com gaps ou filtros.
- **Correção:** Implementados contadores baseados na contagem efetiva de sorteios percorridos (`cycleDrawsCount` e `cycleLastSeenDraw`).
- **Impacto:** Cálculo de duração imune a lacunas de numeração na base.

### ISSUE-06 (P2): Isolamento Estatístico das Janelas de Relacionamento
- **Diagnóstico:** Em `relationships.ts`, as subjanelas (500, 200, 100, Ciclo) não recalculavam a tabela 2×2, Yates e Benjamini-Hochberg de forma autônoma.
- **Correção:** Cada janela extrai seu subconjunto temporal e recalcula de forma 100% independente todas as métricas, $p$-values e FDR. O ciclo atual tem seu tamanho injetado diretamente pelo `CycleTracker`.
- **Impacto:** Janelas dinâmicas verdadeiramente fiéis ao seu recorte temporal.

### ISSUE-07 (P2): Propagação do `lineMode` ao Scoring e Validação
- **Diagnóstico:** Em `scoring.ts`, `scoreCombinationLines` recebia fixamente o valor `'BALANCED'`.
- **Correção:** `lineMode` agora é aceito como argumento com fallback `'BALANCED'`, e repassado a partir de `constraints.lineMode` através de `optimizer.ts`, `validator.ts` e `generationService.ts`.
- **Impacto:** O modo de linha configurado pelo usuário (`FREE`, `BALANCED`, `STATISTICAL`, `HYBRID`) dita a pontuação e os textos de auditoria.

### ISSUE-08 (P2): Modos Explícitos de Backtest (FAST vs PRODUCTION)
- **Diagnóstico:** `walkForward.ts` utilizava um proxy sintético aleatório sem deixar clara a distinção em relação ao motor combinatório completo.
- **Correção:**
  1. Criado tipo `BacktestMode = 'FAST' | 'PRODUCTION'`.
  2. `FAST` utiliza o proxy heurístico calibrado para análises rápidas no navegador.
  3. `PRODUCTION` executa o pipeline gerador e filtros combinatórios equivalentes.
  4. Adicionado seletor na UI e campo explicativo sobre a metodologia aplicada.
- **Impacto:** Transparência total sobre a natureza do benchmark executado.

### ISSUE-09 (P3): Mapeamento de Colinearidade e Redundância Estocástica
- **Diagnóstico:** Métricas como frequência histórica, Z-Score local, atraso e ciclo possuem sobreposição conceitual.
- **Mitigação:** Documentada a correlação entre as variáveis e a independência marginal assegurada pelo teste qui-quadrado de Yates para pares. A partição 5-3-2 foi ajustada para que cada grupo de jogos privilegie subconjuntos ortogonais de sinais.

---

## 3. ARQUIVOS MODIFICADOS OU CRIADOS

| Arquivo | Tipo de Alteração | Descrição |
| :--- | :--- | :--- |
| `src/core/statistics/cycles.ts` | Correção | Substituição de aritmética de IDs por contadores de sorteios efetivos (`drawsInCycle`). |
| `src/core/statistics/relationships.ts` | Correção | Remoção de fallback espúrio de casadas/brigadas e recálculo independente de janelas temporais. |
| `src/services/analysisService.ts` | Correção | Injeção da contagem de concursos do ciclo atual na análise de relacionamentos. |
| `src/core/combinatorial/scoring.ts` | Correção | Propagação de `lineMode` para pontuação e explicações auditáveis de jogo. |
| `src/core/combinatorial/validator.ts` | Melhoria | Auditoria desacoplada de exposição de ausências e passagem de `lineMode`. |
| `src/core/combinatorial/optimizer.ts` | Correção / Integração | Normalização de escala $[0.0, 1.0]$, integração do `analyzePortfolioExposure` e passagem de `lineMode`. |
| `src/core/backtest/walkForward.ts` | Correção / Expansão | Simetrização 5-3-2 de ablações e separação entre modos `FAST` e `PRODUCTION`. |
| `src/workers/analytics.worker.ts` | Atualização | Suporte a `msg.mode` e ordenação correta de parâmetros na chamada ao worker. |
| `src/app/state.ts` | Atualização | Encaminhamento de `mode` no método `runBacktest()`. |
| `src/pages/cyclesPage.ts` | Atualização UI | Seletor de modo `FAST` / `PRODUCTION`, exibição de metodologia e badge "SEM EVIDÊNCIA SUFICIENTE". |
| `tests/unit/absenceOptimizer.test.ts` | **Novo** | Testes de matriz 25×10, dispersão de ausências e sensibilidade de pesos. |
| `tests/unit/scoring.test.ts` | **Novo** | Testes de escala $[0.0, 1.0]$, sensibilidade de pesos e modos de linha `FREE` vs `BALANCED`. |
| `tests/unit/cycles.test.ts` | Atualização | Asserção de contagem de ciclo com concursos não consecutivos (10, 20, 30). |
| `tests/unit/relationships.test.ts` | Atualização | Testes de exclusão estrita de pares sem significância e independência de janelas. |
| `tests/unit/backtest.test.ts` | Atualização | Asserções de partição 5-3-2 (50 jogos/5 pontos) para ablações e suporte a modo `PRODUCTION`. |
| `docs/AUDIT_MODULE_CYCLE_LINES_RELATIONSHIPS.md` | Documentação | Inclusão da Seção 23 com detalhamento técnico forense de cada correção. |

---

## 4. RESULTADOS DOS QUALITY GATES

Executado via comando oficial:
```bash
bun run gate
```

- **Typecheck (`tsc --noEmit`):** ✅ 0 erros
- **Linter (`biome check`):** ✅ 0 erros
- **Suíte de Testes Automatizados (`bun test`):** ✅ 38 testes passando (0 falhas) em 10 arquivos de teste (69.763 asserções)
- **Compilação de Produção (`vite build`):** ✅ Sucesso absoluto (cliente + Web Worker empacotados sem advertências de tipagem)

---

## 5. LIMITAÇÕES RESTANTES E RECOMENDAÇÕES FUTURAS

1. **Backtest em Larga Escala no Navegador:** Embora o modo `PRODUCTION` execute a cadeia combinatória real, a execução de centenas de pontos no thread principal ou worker pode sofrer limites de tempo se configurado com pool superior a 4.000 candidatos por ponto. O modo `FAST` permanece como o padrão recomendado para varreduras exploratórias no navegador.
2. **Ortogonalização Formal (PCA/Decorrelation):** Conforme apontado na ISSUE-09, os pesos estatísticos atuais funcionam harmonicamente sob a escala $[0.0, 1.0]$, mas um futuro refinamento por decomposição ortogonal ou regressão logística regularizada pode mitigar ainda mais sobreposições preditivas.
