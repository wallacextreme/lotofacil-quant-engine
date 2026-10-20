/**
 * Teste Qui-Quadrado de Aderência para equiprobabilidade das 25 dezenas.
 *
 * H0: Cada dezena tem probabilidade p_i = n / N = 15 / 25 = 0,60 de ser sorteada em cada concurso.
 *
 * NOTA METODOLÓGICA IMPORTANTE (§10 e docs/PHASE_0_AUDIT.md):
 * A estatística de Pearson clássica é:
 *   χ²_pearson = ∑_{i=1}^{25} (O_i - E_i)² / E_i
 * onde E_i = T * 0,60.
 *
 * Contudo, como cada concurso sorteia 15 dezenas SEM REPOSIÇÃO, as contagens O_i têm:
 *   Var(O_i) = T * 0,60 * 0,40 = 0,24 * T
 *   Cov(O_i, O_j) = -0,01 * T  (pois ∑ O_i = 15 * T é constante)
 * O valor esperado da soma clássica sob H0 é:
 *   E[χ²_pearson] = (N - n) / (N - 1) * df = (10 / 24) * 24 = 10,0 (não 24!).
 *
 * Por isso, fornecemos:
 * 1. `statistic` (Pearson clássico) para auditabilidade e comparação direta com relatórios de terceiros.
 * 2. `adjustedStatistic` = χ²_pearson * (N - 1) / (N - n) = χ²_pearson * 2.4, cuja distribuição
 *    assintótica sob H0 é exatamente χ² com 24 graus de liberdade (E = 24).
 * 3. `pValue` calculado sobre a estatística corrigida para inferência rigorosa.
 * 4. `pearsonPValue` calculado sobre o Pearson ingênuo (para demonstrar a diferença se desejado).
 * 5. `isSmallSample` (T < 30), sinalizando que a aproximação assintótica χ²_24 possui poder estatístico reduzido.
 */
import { PICK_SIZE, UNIVERSE_SIZE } from '../domain/constants';
import type { Contest } from '../domain/types';
import { chiSquareSurvival } from '../util/special';

export interface ChiSquareResult {
  /** Número total de concursos analisados (T). */
  contestsCount: number;
  /** Graus de liberdade (N - 1 = 24). */
  df: number;
  /** Contagens observadas O_i para cada dezena i=1..25. */
  observed: number[];
  /** Contagens esperadas E_i para cada dezena (T * 0,60). */
  expected: number[];
  /** Estatística clássica de Pearson: ∑ (O_i - E_i)² / E_i */
  statistic: number;
  /** p-valor ingênuo usando χ² clássico com df=24 (relatado em ferramentas ingênuas). */
  pearsonPValue: number;
  /** Fator de correção de amostragem sem reposição: (N - 1) / (N - n) = 24 / 10 = 2.4 */
  fpcFactor: number;
  /** Estatística ajustada para amostragem sem reposição: χ² * fpcFactor */
  adjustedStatistic: number;
  /** p-valor rigoroso calculado com adjustedStatistic e df=24. */
  pValue: number;
  /** Indica se a amostra é pequena (T < 30) para a aproximação assintótica. */
  isSmallSample: boolean;
  /** Rótulo da conclusão epistemológica. */
  conclusion: string;
}

export function computeChiSquare(contests: readonly Contest[]): ChiSquareResult {
  const T = contests.length;
  const df = UNIVERSE_SIZE - 1; // 24
  const expectedProb = PICK_SIZE / UNIVERSE_SIZE; // 0.60
  const expectedVal = T * expectedProb;
  const isSmallSample = T > 0 && T < 30;

  const observed = new Array<number>(UNIVERSE_SIZE).fill(0);
  for (const c of contests) {
    for (const num of c.numbers) {
      if (num >= 1 && num <= UNIVERSE_SIZE) {
        observed[num - 1]!++;
      }
    }
  }

  const expected = new Array<number>(UNIVERSE_SIZE).fill(expectedVal);

  if (T === 0) {
    return {
      contestsCount: 0,
      df,
      observed,
      expected,
      statistic: 0,
      pearsonPValue: 1,
      fpcFactor: (UNIVERSE_SIZE - 1) / (UNIVERSE_SIZE - PICK_SIZE),
      adjustedStatistic: 0,
      pValue: 1,
      isSmallSample: false,
      conclusion: 'Sem dados para teste qui-quadrado.',
    };
  }

  let statistic = 0;
  for (let i = 0; i < UNIVERSE_SIZE; i++) {
    const diff = observed[i]! - expectedVal;
    statistic += (diff * diff) / expectedVal;
  }

  const fpcFactor = (UNIVERSE_SIZE - 1) / (UNIVERSE_SIZE - PICK_SIZE); // 24 / 10 = 2.4
  const adjustedStatistic = statistic * fpcFactor;

  const pearsonPValue = chiSquareSurvival(statistic, df);
  const pValue = chiSquareSurvival(adjustedStatistic, df);

  let conclusion: string;
  if (isSmallSample) {
    conclusion = `Amostra pequena (T = ${T} < 30). A aproximação assintótica χ²_24 possui poder estatístico reduzido; interpretar com cautela descritiva.`;
  } else if (pValue >= 0.05) {
    conclusion =
      'Sem evidência estatística de desvio de equiprobabilidade ao nível de significância de 5% (H0 não rejeitada).';
  } else if (pValue >= 0.01) {
    conclusion = 'Evidência moderada de desvio de equiprobabilidade (p < 0.05, H0 rejeitada a 5%).';
  } else {
    conclusion = 'Evidência forte de desvio de equiprobabilidade (p < 0.01, H0 rejeitada a 1%).';
  }

  return {
    contestsCount: T,
    df,
    observed,
    expected,
    statistic,
    pearsonPValue,
    fpcFactor,
    adjustedStatistic,
    pValue,
    isSmallSample,
    conclusion,
  };
}
