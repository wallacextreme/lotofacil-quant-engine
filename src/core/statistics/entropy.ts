/**
 * Análise de Entropia Espacial e Ocupação do Volante 5×5.
 *
 * Fórmula da Entropia de Shannon (em bits):
 *   H(C) = - ∑_{i=1}^5 p_i * log2(p_i)
 *   onde p_i = contagem_i / 15 para contagem_i > 0.
 *
 * Máximo teórico para partição de 15 em 5 partes:
 *   Distribuição uniforme (3, 3, 3, 3, 3): H_max = log2(5) ≈ 2,321928 bits.
 *
 * Eventos extremos de ocupação (tratados como filtros configuráveis, nunca chamados de impossíveis):
 * - Linha com 0 (linha vazia)
 * - Linha com 5 (linha completa)
 * - Coluna com 0 (coluna vazia)
 * - Coluna com 5 (coluna completa)
 */
import { GRID_SIZE, colOf, rowOf } from '../domain/constants';
import type { Contest } from '../domain/types';
import { shannonEntropy } from '../domain/features';
import { type GridTheory, gridTheory } from './theoretical';

export interface DrawSpatialAnalysis {
  contest: number;
  rowCounts: number[];
  colCounts: number[];
  rowEntropy: number;
  colEntropy: number;
  hasEmptyRow: boolean;
  hasFullRow: boolean;
  hasEmptyCol: boolean;
  hasFullCol: boolean;
}

export interface EntropyAnalysis {
  totalContests: number;
  /** Média e desvio padrão empíricos da entropia de linhas */
  meanRowEntropy: number;
  stdRowEntropy: number;
  /** Média e desvio padrão empíricos da entropia de colunas */
  meanColEntropy: number;
  stdColEntropy: number;
  /** Valores teóricos exatos sob distribuição uniforme */
  theory: GridTheory;
  /** Frequências empíricas de linhas/colunas vazias ou completas */
  emptyRowContestsCount: number;
  emptyRowFrequency: number;
  fullRowContestsCount: number;
  fullRowFrequency: number;
  emptyColContestsCount: number;
  emptyColFrequency: number;
  fullColContestsCount: number;
  fullColFrequency: number;
  /** Histórico por concurso dos últimos K concursos (para gráficos na UI) */
  recentDraws: DrawSpatialAnalysis[];
}

export function computeSpatialEntropy(contests: readonly Contest[], recentLimit = 50): EntropyAnalysis {
  const T = contests.length;
  const theory = gridTheory();

  let sumRowH = 0;
  let sumColH = 0;
  let sumSqRowH = 0;
  let sumSqColH = 0;

  let emptyRowsCount = 0;
  let fullRowsCount = 0;
  let emptyColsCount = 0;
  let fullColsCount = 0;

  const drawAnalyses: DrawSpatialAnalysis[] = [];

  for (let t = 0; t < T; t++) {
    const c = contests[t]!;
    const rowCounts = new Array<number>(GRID_SIZE).fill(0);
    const colCounts = new Array<number>(GRID_SIZE).fill(0);

    for (const num of c.numbers) {
      if (num >= 1 && num <= 25) {
        rowCounts[rowOf(num)]!++;
        colCounts[colOf(num)]!++;
      }
    }

    const rH = shannonEntropy(rowCounts);
    const cH = shannonEntropy(colCounts);

    sumRowH += rH;
    sumColH += cH;
    sumSqRowH += rH * rH;
    sumSqColH += cH * cH;

    const hasEmptyRow = rowCounts.some((x) => x === 0);
    const hasFullRow = rowCounts.some((x) => x === GRID_SIZE);
    const hasEmptyCol = colCounts.some((x) => x === 0);
    const hasFullCol = colCounts.some((x) => x === GRID_SIZE);

    if (hasEmptyRow) emptyRowsCount++;
    if (hasFullRow) fullRowsCount++;
    if (hasEmptyCol) emptyColsCount++;
    if (hasFullCol) fullColsCount++;

    if (t >= T - recentLimit) {
      drawAnalyses.push({
        contest: c.contest,
        rowCounts,
        colCounts,
        rowEntropy: rH,
        colEntropy: cH,
        hasEmptyRow,
        hasFullRow,
        hasEmptyCol,
        hasFullCol,
      });
    }
  }

  const meanRowEntropy = T > 0 ? sumRowH / T : 0;
  const meanColEntropy = T > 0 ? sumColH / T : 0;

  const varRowEntropy = T > 1 ? (sumSqRowH - T * meanRowEntropy * meanRowEntropy) / (T - 1) : 0;
  const varColEntropy = T > 1 ? (sumSqColH - T * meanColEntropy * meanColEntropy) / (T - 1) : 0;

  return {
    totalContests: T,
    meanRowEntropy,
    stdRowEntropy: Math.sqrt(Math.max(0, varRowEntropy)),
    meanColEntropy,
    stdColEntropy: Math.sqrt(Math.max(0, varColEntropy)),
    theory,
    emptyRowContestsCount: emptyRowsCount,
    emptyRowFrequency: T > 0 ? emptyRowsCount / T : 0,
    fullRowContestsCount: fullRowsCount,
    fullRowFrequency: T > 0 ? fullRowsCount / T : 0,
    emptyColContestsCount: emptyColsCount,
    emptyColFrequency: T > 0 ? emptyColsCount / T : 0,
    fullColContestsCount: fullColsCount,
    fullColFrequency: T > 0 ? fullColsCount / T : 0,
    recentDraws: drawAnalyses,
  };
}
