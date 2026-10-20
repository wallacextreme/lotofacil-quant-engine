/**
 * Módulo de Validação e Pontuação de Linhas (LineScorer).
 *
 * Modos de Linha:
 * - FREE: Sem restrição de linhas.
 * - BALANCED: Cada linha deve conter entre 2 e 4 dezenas (l_i ∈ [2, 4]).
 * - STATISTICAL: Prioriza distribuições de linhas historicamente mais frequentes.
 * - HYBRID: Combina equilíbrio [2, 4] com aderência aos padrões de maior frequência.
 */
import { extractLineVector, type LinePatternRecord } from '../statistics/lines';

export type LineConstraintMode = 'FREE' | 'BALANCED' | 'STATISTICAL' | 'HYBRID';

export interface LineScoreResult {
  l1: number;
  l2: number;
  l3: number;
  l4: number;
  l5: number;
  pattern: string;
  isBalanced: boolean; // l_i ∈ [2, 4] para todas as 5 linhas
  score: number; // [0, 1]
}

/**
 * Avalia a conformidade e calcula o LineBalanceScore de uma combinação de 15 dezenas.
 */
export function scoreCombinationLines(
  numbers: readonly number[],
  mode: LineConstraintMode = 'BALANCED',
  topPatterns?: readonly LinePatternRecord[],
): LineScoreResult {
  const v = extractLineVector(numbers);
  const counts = [v.l1, v.l2, v.l3, v.l4, v.l5];

  // Verifica se cada linha está entre 2 e 4 dezenas
  const isBalanced = counts.every((c) => c >= 2 && c <= 4);

  // Calcula variância em relação à média ideal (3.0 dezenas por linha)
  // variância mínima = 0 (3-3-3-3-3), variância máxima = (5-3)²*3 + (0-3)²*2 = 12 + 18 = 30
  let varianceFromIdeal = 0;
  for (const c of counts) {
    varianceFromIdeal += (c - 3) ** 2;
  }
  // BalanceScore bruto: 1.0 quando perfeitamente equilibrado, penalizado por linhas vazias ou cheias
  const rawBalance = Math.max(0, 1.0 - varianceFromIdeal / 12.0);

  // Se topPatterns for fornecido, calcula a aderência aos padrões históricos
  let patternScore = 0.5;
  if (topPatterns && topPatterns.length > 0) {
    const matched = topPatterns.find((p) => p.pattern === v.pattern);
    if (matched) {
      patternScore = Math.min(1.0, matched.relativeFrequency * 10);
    } else {
      patternScore = 0.1;
    }
  }

  let finalScore = rawBalance;
  if (mode === 'BALANCED') {
    finalScore = isBalanced ? 0.7 + rawBalance * 0.3 : rawBalance * 0.4;
  } else if (mode === 'STATISTICAL') {
    finalScore = patternScore;
  } else if (mode === 'HYBRID') {
    finalScore = (isBalanced ? 0.5 : 0.2) + rawBalance * 0.25 + patternScore * 0.25;
  } else if (mode === 'FREE') {
    finalScore = 1.0;
  }

  return {
    l1: v.l1,
    l2: v.l2,
    l3: v.l3,
    l4: v.l4,
    l5: v.l5,
    pattern: v.pattern,
    isBalanced,
    score: Math.max(0, Math.min(1.0, finalScore)),
  };
}

/**
 * Validador estrito para modo BALANCED: retorna true se e somente se cada linha possui entre 2 e 4 dezenas.
 */
export function testLineBalancedConstraint(numbers: readonly number[]): boolean {
  let l1 = 0;
  let l2 = 0;
  let l3 = 0;
  let l4 = 0;
  let l5 = 0;

  for (const n of numbers) {
    if (n <= 5) l1++;
    else if (n <= 10) l2++;
    else if (n <= 15) l3++;
    else if (n <= 20) l4++;
    else l5++;
  }

  return (
    l1 >= 2 && l1 <= 4 && l2 >= 2 && l2 <= 4 && l3 >= 2 && l3 <= 4 && l4 >= 2 && l4 <= 4 && l5 >= 2 && l5 <= 4
  );
}
