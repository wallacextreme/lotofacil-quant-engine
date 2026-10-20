/**
 * Validador Independente de Jogos e Conformidade de Portfólio (§31, §44, §45).
 *
 * ARQUITETURA DE DUPLA VALIDAÇÃO:
 * - O Generator cria as combinações usando máscaras de bits e branch-and-bound.
 * - Este Validator é COMPLETAMENTE SEPARADO e não utiliza as estruturas do gerador.
 * - Utiliza contagem direta em arrays/conjuntos para inspecionar cada dezena individualmente.
 * - Recalcula todas as métricas do zero: soma, pares, ímpares, primos, moldura, miolo,
 *   Fibonacci, repetição, quotas térmicas, linhas, colunas, entropia e distância de Hamming.
 * - Status: 'VALID' se e somente se TODAS as restrições duras e a distância mínima de Hamming
 *   forem satisfeitas; caso contrário marca como 'INVALID' e lista cada violação.
 */
import { PICK_SIZE, UNIVERSE_SIZE } from '../domain/constants';
import type { GameAudit, GeneratorConfig } from '../domain/types';
import { computeFeatures } from '../domain/features';
import { hammingDistance } from './hamming';
import { buildGameExplanation, scoreSingleCombination } from './scoring';
import { analyzePortfolioExposure, type PortfolioExposureMatrix } from './absenceOptimizer';
import type { DatasetAnalysis } from '../../services/analysisService';

export interface PortfolioAuditResult {
  allValid: boolean;
  totalGames: number;
  validGamesCount: number;
  invalidGamesCount: number;
  audits: GameAudit[];
  portfolioViolations: string[];
  exposureAudit?: PortfolioExposureMatrix;
}

export function validatePortfolio(
  games: readonly { numbers: readonly number[]; mask?: number }[],
  config: GeneratorConfig,
  analysis: DatasetAnalysis | null,
): PortfolioAuditResult {
  const { constraints, minHamming, weights } = config;
  const K = games.length;

  const lastDraw = analysis ? analysis.summary.lastDrawNumbers : null;
  const temperatures = analysis ? analysis.zScores.scores.map((s) => s.temperature) : null;

  const audits: GameAudit[] = [];
  const masks: number[] = [];

  // 1. Auditoria individual de cada jogo
  for (let i = 0; i < K; i++) {
    const rawNumbers = games[i]!.numbers;
    const gameId = i + 1;
    const violations: string[] = [];

    // Verificação de estrutura básica (15 elementos distintos em 1..25)
    if (rawNumbers.length !== PICK_SIZE) {
      violations.push(`Tamanho inválido: esperadas ${PICK_SIZE} dezenas, encontradas ${rawNumbers.length}.`);
    }

    const seen = new Set<number>();
    for (const n of rawNumbers) {
      if (!Number.isInteger(n) || n < 1 || n > UNIVERSE_SIZE) {
        violations.push(`Dezena inválida fora de 1..25: ${n}.`);
      }
      if (seen.has(n)) {
        violations.push(`Dezena duplicada no mesmo jogo: ${n}.`);
      }
      seen.add(n);
    }

    // Calcula características usando a camada de features independente
    const feats = computeFeatures(rawNumbers, lastDraw, temperatures);

    // Validação estrita das Hard Constraints
    if (constraints.sum) {
      if (feats.sum < constraints.sum.min || feats.sum > constraints.sum.max) {
        violations.push(
          `Soma ${feats.sum} fora do intervalo [${constraints.sum.min}, ${constraints.sum.max}].`,
        );
      }
    }

    if (constraints.even) {
      if (feats.evenCount < constraints.even.min || feats.evenCount > constraints.even.max) {
        violations.push(
          `Pares ${feats.evenCount} fora do intervalo [${constraints.even.min}, ${constraints.even.max}].`,
        );
      }
    }

    if (constraints.prime) {
      if (feats.primeCount < constraints.prime.min || feats.primeCount > constraints.prime.max) {
        violations.push(
          `Primos ${feats.primeCount} fora do intervalo [${constraints.prime.min}, ${constraints.prime.max}].`,
        );
      }
    }

    if (constraints.frame) {
      if (feats.frameCount < constraints.frame.min || feats.frameCount > constraints.frame.max) {
        violations.push(
          `Moldura ${feats.frameCount} fora do intervalo [${constraints.frame.min}, ${constraints.frame.max}].`,
        );
      }
    }

    if (constraints.core) {
      if (feats.coreCount < constraints.core.min || feats.coreCount > constraints.core.max) {
        violations.push(
          `Miolo ${feats.coreCount} fora do intervalo [${constraints.core.min}, ${constraints.core.max}].`,
        );
      }
    }

    if (constraints.fibonacci) {
      if (
        feats.fibonacciCount < constraints.fibonacci.min ||
        feats.fibonacciCount > constraints.fibonacci.max
      ) {
        violations.push(
          `Fibonacci ${feats.fibonacciCount} fora do intervalo [${constraints.fibonacci.min}, ${constraints.fibonacci.max}].`,
        );
      }
    }

    if (constraints.repeat && feats.repeatedCount !== null) {
      if (feats.repeatedCount < constraints.repeat.min || feats.repeatedCount > constraints.repeat.max) {
        violations.push(
          `Repetição ${feats.repeatedCount} fora do intervalo [${constraints.repeat.min}, ${constraints.repeat.max}].`,
        );
      }
    }

    if (constraints.hot && feats.hotCount !== null) {
      if (feats.hotCount < constraints.hot.min || feats.hotCount > constraints.hot.max) {
        violations.push(
          `Quentes ${feats.hotCount} fora do intervalo [${constraints.hot.min}, ${constraints.hot.max}].`,
        );
      }
    }

    if (constraints.neutral && feats.neutralCount !== null) {
      if (feats.neutralCount < constraints.neutral.min || feats.neutralCount > constraints.neutral.max) {
        violations.push(
          `Neutras ${feats.neutralCount} fora do intervalo [${constraints.neutral.min}, ${constraints.neutral.max}].`,
        );
      }
    }

    if (constraints.cold && feats.coldCount !== null) {
      if (feats.coldCount < constraints.cold.min || feats.coldCount > constraints.cold.max) {
        violations.push(
          `Frias ${feats.coldCount} fora do intervalo [${constraints.cold.min}, ${constraints.cold.max}].`,
        );
      }
    }

    // Entropia espacial
    if (!constraints.allowEmptyRow && feats.emptyRows > 0) {
      violations.push(`Contém linha vazia (não permitida pelas configurações).`);
    }
    if (!constraints.allowFullRow && feats.fullRows > 0) {
      violations.push(`Contém linha completa com 5 dezenas (não permitida).`);
    }
    if (!constraints.allowEmptyCol && feats.emptyCols > 0) {
      violations.push(`Contém coluna vazia (não permitida pelas configurações).`);
    }
    if (!constraints.allowFullCol && feats.fullCols > 0) {
      violations.push(`Contém coluna completa com 5 dezenas (não permitida).`);
    }

    // Dezenas fixadas e excluídas
    for (const req of constraints.fixedIncluded) {
      if (!rawNumbers.includes(req)) {
        violations.push(`Dezena obrigatória ${req} ausente no jogo.`);
      }
    }
    for (const exc of constraints.excluded) {
      if (rawNumbers.includes(exc)) {
        violations.push(`Dezena proibida ${exc} presente no jogo.`);
      }
    }

    // 5 Linhas do volante (§2, §3)
    const lineCounts = [0, 0, 0, 0, 0];
    for (const n of rawNumbers) {
      const lineIdx = Math.floor((n - 1) / 5);
      if (lineIdx >= 0 && lineIdx < 5) lineCounts[lineIdx]!++;
    }
    const linePattern = lineCounts.join('-');
    if (constraints.lineMode === 'BALANCED') {
      const unbalanced = lineCounts.some((c) => c < 2 || c > 4);
      if (unbalanced) {
        violations.push(
          `Distribuição de linhas [${linePattern}] viola o Modo Equilibrado (cada linha deve ter entre 2 e 4 dezenas).`,
        );
      }
    }

    // Limite de dezenas ausentes/atrasadas por jogo (§10)
    if (constraints.maxAbsentPerGame !== undefined) {
      let absentCount = 0;
      if (analysis?.cycles?.currentCycle) {
        const missing = analysis.cycles.currentCycle.missingNumbers;
        absentCount = rawNumbers.filter((n) => missing.includes(n)).length;
      } else if (analysis?.behaviors) {
        const delayed = analysis.behaviors.delayedNumbers;
        absentCount = rawNumbers.filter((n) => delayed.includes(n)).length;
      }
      if (absentCount > constraints.maxAbsentPerGame) {
        violations.push(
          `Concentração de dezenas ausentes/atrasadas (${absentCount}) excede o limite máximo permitido (${constraints.maxAbsentPerGame}).`,
        );
      }
    }

    // Máscara binária para cálculo de Hamming
    let m = 0;
    for (const n of rawNumbers) {
      if (n >= 1 && n <= UNIVERSE_SIZE) m |= 1 << (n - 1);
    }
    masks.push(m);

    // Recalcula score auditável
    const { totalScore, breakdown } = scoreSingleCombination(m, analysis, weights, constraints.lineMode);
    const explanation = buildGameExplanation(rawNumbers, analysis, weights, constraints.lineMode);

    audits.push({
      id: gameId,
      numbers: [...rawNumbers].sort((a, b) => a - b),
      sum: feats.sum,
      evenCount: feats.evenCount,
      oddCount: feats.oddCount,
      primeCount: feats.primeCount,
      frameCount: feats.frameCount,
      coreCount: feats.coreCount,
      fibonacciCount: feats.fibonacciCount,
      repeatedCount: feats.repeatedCount ?? 0,
      hotCount: feats.hotCount ?? 0,
      neutralCount: feats.neutralCount ?? 0,
      coldCount: feats.coldCount ?? 0,
      emptyRows: feats.emptyRows,
      fullRows: feats.fullRows,
      emptyCols: feats.emptyCols,
      fullCols: feats.fullCols,
      rowEntropy: feats.rowEntropy,
      colEntropy: feats.colEntropy,
      linePattern,
      score: totalScore,
      scoreBreakdown: breakdown,
      minHamming: null, // Preenchido no passo 2
      status: violations.length === 0 ? 'VALID' : 'INVALID',
      violations,
      explanation,
    });
  }

  // 2. Auditoria da matriz de Hamming e restrição de portfólio
  const portfolioViolations: string[] = [];

  for (let i = 0; i < K; i++) {
    let minD = Infinity;
    const mA = masks[i]!;

    for (let j = 0; j < K; j++) {
      if (i === j) continue;
      const mB = masks[j]!;
      const d = hammingDistance(mA, mB);
      if (d < minD) minD = d;

      if (j > i && d < minHamming) {
        portfolioViolations.push(
          `Distância de Hamming entre Jogo ${i + 1} e Jogo ${j + 1} é ${d} (mínimo exigido: ${minHamming}).`,
        );
      }
    }

    audits[i]!.minHamming = minD === Infinity ? null : minD;

    if (minD < minHamming) {
      audits[i]!.status = 'INVALID';
      audits[i]!.violations.push(
        `Distância de Hamming mínima com o portfólio (${minD}) é inferior ao limiar exigido (${minHamming}).`,
      );
    }
  }

  // 3. Auditoria de Equilíbrio de Exposição e Cobertura do Portfólio (§10, §11, ISSUE-01)
  const exposureAudit = analyzePortfolioExposure(games.map((g) => g.numbers));

  const validCount = audits.filter((a) => a.status === 'VALID').length;

  return {
    allValid: validCount === K && portfolioViolations.length === 0,
    totalGames: K,
    validGamesCount: validCount,
    invalidGamesCount: K - validCount,
    audits,
    portfolioViolations,
    exposureAudit,
  };
}
