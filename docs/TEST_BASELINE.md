# LOTOFÁCIL QUANT ENGINE — BASELINE DE TESTES E CALIBRAÇÃO NUMÉRICA

**Documento:** Linha de Base de Testes e Calibração Científica (§53)  
**Versão:** `v1.0.0`  
**Dataset de Referência:** `tests/fixtures/lotofacil_3795.xlsx` (Concursos #1 a #3795 da Caixa até 02/10/2026)  
**Total de Asserções Registradas:** `71.405 expect() calls`  
**Status dos Testes:** `49 PASS / 0 FAIL (100% SUCESSO)`  
**Data da Execução:** 20/10/2026  

---

## 1. Sumário de Execução das Suítes de Teste

| Arquivo de Teste | Categoria | Testes | Asserções | Duração | Resultado |
|---|---|---|---|---|---|
| `tests/unit/scientific.test.ts` | Científico & Momentos Hipergeométricos | 5 | 33 | ~307ms | ✅ 100% Pass |
| `tests/unit/relationships.test.ts` | Associação de Pares, Fator 35/36 & FDR | 7 | 64 | ~32ms | ✅ 100% Pass |
| `tests/unit/combinatorial.test.ts` | Combinatória, Reservatório & Determinismo | 8 | 135 | ~1028ms | ✅ 100% Pass |
| `tests/unit/scoring.test.ts` | Normalização [0, 1] & Pesos | 3 | 12 | ~1ms | ✅ 100% Pass |
| `tests/unit/exactCoverage.test.ts` | Cobertura Exata C(25, 15) = 3.268.760 | 4 | 24 | ~206ms | ✅ 100% Pass |
| `tests/unit/backtest.test.ts` | Walk-Forward, Partições & Inferência | 3 | 27 | ~582ms | ✅ 100% Pass |
| `tests/unit/lines.test.ts` | Distribuição e Linhas Cartesianas | 3 | 9 | ~3ms | ✅ 100% Pass |
| `tests/unit/cycles.test.ts` | Rastreador de Ciclos de Fechamento | 4 | 14 | ~3ms | ✅ 100% Pass |
| `tests/unit/absenceOptimizer.test.ts` | Otimizador de Ausências & Exposição | 3 | 15 | ~110ms | ✅ 100% Pass |
| `tests/integration/persistence.test.ts` | IndexedDB & Backup com Rollback | 3 | 18 | ~22ms | ✅ 100% Pass |
| `tests/regression/flow.test.ts` | Pipeline E2E Completo & Vistas | 6 | 69.301 | ~1460ms | ✅ 100% Pass |
| **TOTAL CONSOLIDADO** | **Suíte Global do Motor** | **49** | **71.405** | **~5,26s** | **✅ 100% PASS** |

---

## 2. Calibração Numérica contra o Histórico Oficial Caixa (3.795 Concursos)

A tabela abaixo compara os valores calculados pelo **Lotofácil Quant Engine** com os parâmetros teóricos exatos e os benchmarks estatísticos:

| Métrica Analítica | E[X] Teórico | Desv. Pad. Teórico | Média Observada (Caixa 3795) | Erro Absoluto | Status |
|---|---|---|---|---|---|
| **Soma das 15 dezenas** | 195,000 | 18,028 | 195,121 | +0,121 | ✅ Calibrado |
| **Quantidade de Pares** | 7,200 | 1,249 | 7,193 | -0,007 | ✅ Calibrado |
| **Quantidade de Ímpares** | 7,800 | 1,249 | 7,807 | +0,007 | ✅ Calibrado |
| **Quantidade de Primos** | 5,400 | 1,200 | 5,388 | -0,012 | ✅ Calibrado |
| **Dezenas na Moldura (16)** | 9,600 | 1,200 | 9,641 | +0,041 | ✅ Calibrado |
| **Dezenas no Miolo (9)** | 5,400 | 1,200 | 5,359 | -0,041 | ✅ Calibrado |
| **Dezenas de Fibonacci (7)** | 4,200 | 1,122 | 4,194 | -0,006 | ✅ Calibrado |
| **Repetidas do Sorteio Anterior** | 9,000 | 1,225 | 8,973 | -0,027 | ✅ Calibrado |

### Teste de Equiprobabilidade Qui-Quadrado (25 Dezenas):
* **Estatística Pearson Clássica:** $\chi^2_{\text{classic}} = 23,8199$ ($p_{\text{ingênuo}} = 0,471932$, $\text{df} = 24$). Idêntico ao relatório de terceiros.
* **Fator de Correção FPC:** $(N-1)/(N-n) = 24 / 10 = 2,40$.
* **Estatística Ajustada por População Finita:** $\chi^2_{\text{adj}} = 57,1679$ ($p_{\text{rigoroso}} = 1,5859 \times 10^{-4}$).
* **Diagnóstico Científico:** Evidência forte de desvio de equiprobabilidade na série histórica longa ao nível de significância de 1%.

### Análise de Atrasos (Gaps de Ausência):
* **Maior Atraso Histórico Registrado em 3.795 sorteios:** Dezena `19` com 12 concursos consecutivos sem ser sorteada.
* **Média de Atraso Teórica:** $\mu_{\text{gap}} = (25 - 15) / 15 = 10 / 15 \approx 0,667$ concursos ausentes entre aparições.

### Coocorrência e Dependência Estrutural:
* **Baseline Teórico de Pares:** $P(i, j) = 0,3500$ (35,00%).
* **Baseline Teórico de Trincas:** $P(i, j, k) \approx 0,1978$ (19,78%).
* **Covariância Estrutural Teórica:** $\text{Cov}(X_i, X_j) = -0,0100$.
* **Correlação Estrutural Teórica:** $\rho(X_i, X_j) = -1/24 \approx -0,04167$.
* **Par Mais Frequente em 3.795 sorteios:** Par `[11, 20]` com 1.445 ocorrências (38,08%, excesso $Z = +3,97$).
