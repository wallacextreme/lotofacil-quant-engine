/**
 * Otimizador Combinatório de Portfólio (GRASP com PRNG Determinístico).
 *
 * Mandatos e Correção Científica (ACHADO-02 e ACHADO-03):
 * - Coerência estrita da função-objetivo: `computeEffectiveGameScore` unifica a avaliação
 *   durante a construção gulosa, na comparação entre restarts e na busca local 1-Swap.
 * - Refinamento Local Pós-GRASP (1-Swap): busca estrita determinística no top-200.
 * - Eliminação de gargalos O(N): cálculo diferencial de exposição sem alocações no loop interno.
 * - Respeito irrestrito a d_H >= minHamming. JAMAIS relaxa minHamming silenciosamente (§22).
 * - PRNG determinístico baseado em seed explícita (§24).
 */
import { PICK_SIZE, UNIVERSE_SIZE } from '../domain/constants';
import type { GeneratorConfig, PortfolioStrategy, ScoreBreakdown, ScoreWeights } from '../domain/types';
import type { DatasetAnalysis } from '../../services/analysisService';
import { generateCandidatePool, type CandidatePool } from './candidateGenerator';
import { hammingDistance } from './hamming';
import { type ScoredCandidate, scoreSingleCombination } from './scoring';
import { analyzePortfolioExposure } from './absenceOptimizer';
import { createRng } from '../util/prng';
import { popcount32 } from '../util/bits';

export interface OptimizedGame {
  mask: number;
  numbers: number[];
  sum: number;
  score: number;
  breakdown: ScoreBreakdown;
}

export interface OptimizationResult {
  success: boolean;
  games: OptimizedGame[];
  seed: number;
  requestedCount: number;
  achievedCount: number;
  candidatePoolSize: number;
  nodesVisited: number;
  prunedBranches: number;
  failureReason?: string;
}

/**
 * Calcula a utilidade efetiva de um candidato de acordo com a estratégia ativa da carteira (§12, §14).
 * Usada tanto na seleção gulosa quanto na avaliação global da carteira entre restarts (ACHADO-02).
 */
export function computeEffectiveGameScore(
  cand: ScoredCandidate,
  slotIndex: number,
  strategy: PortfolioStrategy,
): number {
  if (strategy === '5_3_2') {
    if (slotIndex < 5) {
      // Grupo A (5 jogos): estatístico principal
      return (
        cand.breakdown.frequency * 0.4 +
        cand.breakdown.zScore * 0.3 +
        (cand.breakdown.lineBalance ?? 0.5) * 0.3
      );
    }
    if (slotIndex < 8) {
      // Grupo B (3 jogos): perfil equilibrado
      return (cand.breakdown.cycle ?? 0.5) * 0.4 + cand.breakdown.delay * 0.3 + cand.breakdown.entropy * 0.3;
    }
    // Grupo C (2 jogos): cobertura e dispersão
    return (
      cand.breakdown.dispersion * 0.4 +
      cand.breakdown.cooccurrence * 0.3 +
      (cand.breakdown.pairRelationship ?? 0.5) * 0.3
    );
  }

  if (strategy === 'CYCLE') {
    return (cand.breakdown.cycle ?? 0.5) * 0.5 + cand.breakdown.delay * 0.3 + cand.breakdown.frequency * 0.2;
  }

  if (strategy === 'LINES') {
    return (
      (cand.breakdown.lineBalance ?? 0.5) * 0.5 +
      cand.breakdown.entropy * 0.3 +
      cand.breakdown.dispersion * 0.2
    );
  }

  if (strategy === 'RELATIONSHIPS') {
    return (
      (cand.breakdown.pairRelationship ?? 0.5) * 0.4 +
      (cand.breakdown.casadas ?? 0.5) * 0.3 +
      (cand.breakdown.brigadas ?? 0.5) * 0.3
    );
  }

  if (strategy === 'DIVERSIFICATION') {
    return cand.breakdown.dispersion * 0.4 + cand.breakdown.entropy * 0.3 + cand.breakdown.cooccurrence * 0.3;
  }

  return cand.totalScore;
}

/**
 * Avalia o score global da carteira alinhado estritamente com a estratégia ativa e os pesos multiobjetivo.
 */
export function evaluatePortfolioObjective(
  portfolio: readonly ScoredCandidate[],
  strategy: PortfolioStrategy,
  weights: ScoreWeights,
): number {
  const K = portfolio.length;
  if (K === 0) return 0;

  let sumEffective = 0;
  let coverageMask = 0;
  let totalHamming = 0;
  let hammingPairs = 0;

  for (let i = 0; i < K; i++) {
    const g = portfolio[i]!;
    sumEffective += computeEffectiveGameScore(g, i, strategy);
    coverageMask |= g.mask;

    for (let j = i + 1; j < K; j++) {
      totalHamming += hammingDistance(g.mask, portfolio[j]!.mask);
      hammingPairs++;
    }
  }

  const avgHamming = hammingPairs > 0 ? totalHamming / hammingPairs : 0;
  const coverageRatio = popcount32(coverageMask) / UNIVERSE_SIZE;
  const diversityRatio = avgHamming / UNIVERSE_SIZE;

  const exp = analyzePortfolioExposure(portfolio.map((p) => p.numbers));
  const exposureWeight = weights.exposureBalance ?? 0.15;

  return (
    sumEffective +
    (weights.coverage ?? 1.0) * coverageRatio * K +
    (weights.diversity ?? 1.0) * diversityRatio * K +
    exposureWeight * exp.exposureBalanceScore * K
  );
}

export function optimizePortfolio(
  config: GeneratorConfig,
  analysis: DatasetAnalysis | null,
  onProgress?: (progress: { stage: string; percent: number }) => void,
  precomputedPool?: CandidatePool,
): OptimizationResult {
  const { count, constraints, minHamming, weights, seed, poolSize, restarts } = config;

  if (onProgress) onProgress({ stage: 'Gerando pool de candidatos com poda combinatória...', percent: 15 });

  const context = analysis
    ? {
        lastDraw: analysis.summary.lastDrawNumbers,
        temperature: analysis.zScores.scores.map((s) => s.temperature),
        missingInCycle: analysis.cycles ? analysis.cycles.currentCycle.missingNumbers : undefined,
        delayedNumbers: analysis.behaviors ? analysis.behaviors.delayedNumbers : undefined,
      }
    : null;

  // 1. Obtém pool de candidatos válidos que satisfazem 100% das restrições duras
  const pool = precomputedPool ?? generateCandidatePool(constraints, context, poolSize, seed);

  if (pool.masks.length === 0) {
    return {
      success: false,
      games: [],
      seed,
      requestedCount: count,
      achievedCount: 0,
      candidatePoolSize: 0,
      nodesVisited: pool.nodesVisited,
      prunedBranches: pool.prunedBranches,
      failureReason: 'Nenhuma combinação válida pôde ser formada com as restrições duras especificadas.',
    };
  }

  if (onProgress) onProgress({ stage: 'Avaliando e normalizando scores dos candidatos...', percent: 40 });

  // 2. Avalia e pontua todos os candidatos do pool
  const scoredCandidates: ScoredCandidate[] = [];
  for (let i = 0; i < pool.masks.length; i++) {
    const mask = pool.masks[i]!;
    const sum = pool.sums[i]!;
    const { totalScore, breakdown } = scoreSingleCombination(mask, analysis, weights, constraints.lineMode);

    const numbers: number[] = [];
    for (let bit = 0; bit < UNIVERSE_SIZE; bit++) {
      if ((mask >>> bit) & 1) numbers.push(bit + 1);
    }

    scoredCandidates.push({
      mask,
      numbers,
      sum,
      totalScore,
      breakdown,
    });
  }

  // Ordena pool por score estatístico decrescente
  scoredCandidates.sort((a, b) => b.totalScore - a.totalScore);

  if (onProgress) onProgress({ stage: 'Executando busca de cobertura e Hamming (GRASP)...', percent: 60 });

  const rng = createRng(seed);
  let bestPortfolio: ScoredCandidate[] | null = null;
  let bestPortfolioScore = -Infinity;

  const numRestarts = Math.max(1, restarts);
  const activeStrategy: PortfolioStrategy = config.portfolioStrategy ?? 'DIVERSIFICATION';

  for (let r = 0; r < numRestarts; r++) {
    const selected: ScoredCandidate[] = [];
    let currentCoverageMask = 0;
    const appearances = new Int32Array(UNIVERSE_SIZE);

    // Semente inicial: escolhe entre os melhores candidatos com leve estocasticidade controlada
    const rclSize = Math.min(10, scoredCandidates.length);
    const firstIdx = rng.int(rclSize);
    const firstCandidate = scoredCandidates[firstIdx]!;
    selected.push(firstCandidate);
    currentCoverageMask |= firstCandidate.mask;
    for (const num of firstCandidate.numbers) {
      appearances[num - 1] = (appearances[num - 1] ?? 0) + 1;
    }

    // Seleção gulosa adaptativa com respeito estrito a minHamming
    while (selected.length < count) {
      const compatible: { candidate: ScoredCandidate; marginalGain: number }[] = [];
      const currentIdx = selected.length;
      const K_next = currentIdx + 1;
      const idealNext = (15 * K_next) / UNIVERSE_SIZE;
      const maxExpectedSqDiff = Math.max(1, (K_next * 0.6) ** 2);
      const exposureWeight = weights.exposureBalance ?? 0.15;

      for (const cand of scoredCandidates) {
        // Verifica distância de Hamming contra todo o portfólio atual
        let isHammingOk = true;
        let sumDist = 0;

        for (const s of selected) {
          const d = hammingDistance(cand.mask, s.mask);
          if (d < minHamming) {
            isHammingOk = false;
            break;
          }
          sumDist += d;
        }

        if (!isHammingOk) continue;

        // Ganho marginal de cobertura (novas dezenas ainda não cobertas pelo portfólio)
        const newNumbers = popcount32((cand.mask & ~currentCoverageMask) >>> 0);
        const avgDist = sumDist / selected.length;

        // Score efetivo do candidato segundo a estratégia ativa
        const effectiveScore = computeEffectiveGameScore(cand, currentIdx, activeStrategy);

        // Ganho de exposição calculado em O(25) sem criar arrays temporários (ACHADO-03)
        let exposureGain = 0.5;
        if (exposureWeight > 0) {
          let varSum = 0;
          for (let bit = 0; bit < UNIVERSE_SIZE; bit++) {
            const hasBit = (cand.mask >>> bit) & 1;
            const newCount = (appearances[bit] ?? 0) + hasBit;
            varSum += (newCount - idealNext) ** 2;
          }
          const meanSq = varSum / UNIVERSE_SIZE;
          exposureGain = Math.max(0, Math.min(1.0, 1.0 - meanSq / maxExpectedSqDiff));
        }

        // Função de utilidade multiobjetivo
        const marginalGain =
          effectiveScore +
          weights.coverage * (newNumbers / PICK_SIZE) +
          weights.diversity * (avgDist / UNIVERSE_SIZE) +
          exposureWeight * exposureGain;

        compatible.push({ candidate: cand, marginalGain });
      }

      if (compatible.length === 0) {
        // Trajetória de busca inviável com as restrições
        break;
      }

      // Ordena compatíveis pelo ganho marginal e escolhe via lista restrita de candidatos (RCL)
      compatible.sort((a, b) => b.marginalGain - a.marginalGain);
      const kChoice = Math.min(5, compatible.length);
      const chosen = compatible[rng.int(kChoice)]!.candidate;

      selected.push(chosen);
      currentCoverageMask |= chosen.mask;
      for (const num of chosen.numbers) {
        appearances[num - 1] = (appearances[num - 1] ?? 0) + 1;
      }
    }

    if (selected.length === count) {
      // Avalia qualidade global com a função-objetivo alinhada (ACHADO-02)
      const portScore = evaluatePortfolioObjective(selected, activeStrategy, weights);

      if (portScore > bestPortfolioScore) {
        bestPortfolioScore = portScore;
        bestPortfolio = selected;
      }
    }
  }

  // Refinamento Local Pós-GRASP (1-Swap Local Search)
  if (bestPortfolio && bestPortfolio.length === count) {
    let localBestScore = bestPortfolioScore;
    const currentBest: ScoredCandidate[] = bestPortfolio;
    const topCandidates = scoredCandidates.slice(0, Math.min(50, scoredCandidates.length));

    for (let i = 0; i < count; i++) {
      for (const cand of topCandidates) {
        // Ignora se já estiver no portfólio
        if (currentBest.some((g) => g.mask === cand.mask)) continue;

        // Verifica se candidato respeita minHamming contra todos os outros jogos
        let hammingOk = true;
        for (let j = 0; j < count; j++) {
          if (i === j) continue;
          if (hammingDistance(cand.mask, currentBest[j]!.mask) < minHamming) {
            hammingOk = false;
            break;
          }
        }
        if (!hammingOk) continue;

        // Avalia se o 1-swap eleva estritamente a função-objetivo
        const candidatePortfolio: ScoredCandidate[] = [...currentBest];
        candidatePortfolio[i] = cand;
        const candidateScore = evaluatePortfolioObjective(candidatePortfolio, activeStrategy, weights);

        if (candidateScore > localBestScore + 1e-6) {
          bestPortfolio = candidatePortfolio;
          localBestScore = candidateScore;
          bestPortfolioScore = candidateScore;
          break;
        }
      }
    }
  }

  if (!bestPortfolio || bestPortfolio.length < count) {
    return {
      success: false,
      games: bestPortfolio
        ? bestPortfolio.map((g) => ({
            mask: g.mask,
            numbers: g.numbers,
            sum: g.sum,
            score: g.totalScore,
            breakdown: g.breakdown,
          }))
        : [],
      seed,
      requestedCount: count,
      achievedCount: bestPortfolio ? bestPortfolio.length : 0,
      candidatePoolSize: scoredCandidates.length,
      nodesVisited: pool.nodesVisited,
      prunedBranches: pool.prunedBranches,
      failureReason: `Não foi possível encontrar ${count} jogos mutuamente compatíveis com distância mínima de Hamming d_H >= ${minHamming} a partir do pool de ${scoredCandidates.length} candidatos gerados. Sugestão: aumente o tamanho do pool, flexibilize os filtros ou diminua a distância mínima exigida.`,
    };
  }

  const games: OptimizedGame[] = bestPortfolio.map((g) => ({
    mask: g.mask,
    numbers: g.numbers,
    sum: g.sum,
    score: g.totalScore,
    breakdown: g.breakdown,
  }));

  return {
    success: true,
    games,
    seed,
    requestedCount: count,
    achievedCount: games.length,
    candidatePoolSize: scoredCandidates.length,
    nodesVisited: pool.nodesVisited,
    prunedBranches: pool.prunedBranches,
  };
}
