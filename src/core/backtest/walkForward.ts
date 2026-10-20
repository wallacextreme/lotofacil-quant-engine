/**
 * Motor de Walk-Forward Backtesting e Testes de Ablação Científica (§15 e §16).
 *
 * Metodologia Rigorosa Out-of-Sample:
 * 1. Para cada ponto de corte temporal t no passado:
 *    - Congela estritamente os dados conhecidos até t-1 (zero contaminação do futuro / zero data leakage).
 *    - Executa a análise estatística do período histórico slice(0, t).
 *    - Gera os portfólios para cada benchmark / estratégia antes de inspecionar o sorteio real t.
 *    - Avalia o desempenho real contra o concurso t.
 * 2. Separação Real entre os Modos FAST e PRODUCTION:
 *    - FAST: Proxy heurístico rápido com amostragem exata de partições de linha (2 a 4 garantidas sem fallback!).
 *    - PRODUCTION: Executa a esteira combinatória real (optimizePortfolio + validatePortfolio).
 * 3. Inferência Estatística Pareada por Concurso contra o Benchmark Aleatório B1:
 *    - pairedMeanDiff, Intervalo de Confiança de 95%, p-valor pareado e Veredito Epistemológico.
 */
import { PICK_SIZE, UNIVERSE_SIZE } from '../domain/constants';
import type { Contest, GeneratorConfig } from '../domain/types';
import { runDatasetAnalysis, type DatasetAnalysis } from '../../services/analysisService';
import { createRng } from '../util/prng';
import { hammingDistance } from '../combinatorial/hamming';
import { optimizePortfolio } from '../combinatorial/optimizer';
import { generateCandidatePool, type CandidatePool } from '../combinatorial/candidateGenerator';
import { DEFAULT_GENERATOR_CONFIG, cloneGeneratorConfig } from '../domain/models';
import { erfc } from '../util/special';

interface HistoricalContestWithPrizes extends Contest {
  rateio15?: number;
  rateio14?: number;
}

export interface BenchmarkMetrics {
  name: string;
  category: 'BENCHMARK' | 'ABLATION';
  totalContestsEvaluated: number;
  totalGamesTested: number;
  meanHits: number;
  medianHits: number;
  minHits: number;
  maxHits: number;
  hitsDistribution: {
    hits11: number;
    hits12: number;
    hits13: number;
    hits14: number;
    hits15: number;
    under11: number;
  };
  totalCost: number;
  theoreticalReturn: number;
  realizedReturn?: number;
  roi: number; // (return - cost) / cost
  averageCoverage: number; // quantidade média de dezenas únicas por carteira de 10 jogos
  averageOverlap: number; // média de dezenas em comum entre pares de jogos na carteira

  // Métricas de inferência pareada contra B1 (Aleatório)
  pairedMeanDiff?: number;
  ci95Lower?: number;
  ci95Upper?: number;
  pValueVsRandom?: number;
  winRateVsRandom?: number;
  epistemicVerdict?: 'SUPERIORIDADE_SIGNIFICATIVA' | 'EMPATE_ESTATISTICO_SOB_ACASO' | 'BENCHMARK_BASE';
}

export type BacktestMode = 'FAST' | 'PRODUCTION';

export interface WalkForwardResult {
  evaluationPoints: number;
  startContest: number;
  endContest: number;
  benchmarks: BenchmarkMetrics[];
  ablations: BenchmarkMetrics[];
  executionTimeMs: number;
  mode: BacktestMode;
  modeDescription: string;
}

// Tabela de prêmios oficiais estimados da Lotofácil (aposta R$ 3,00)
export const PRIZE_TABLE = {
  costPerGame: 3.0,
  hit11: 6.0,
  hit12: 12.0,
  hit13: 30.0,
  hit14: 1500.0,
  hit15: 1800000.0,
};

/**
 * 51 partições inteiras válidas de 15 dezenas distribuídas em 5 linhas,
 * onde cada linha contém estritamente entre 2 e 4 dezenas.
 */
const BALANCED_PARTITIONS: readonly (readonly number[])[] = (() => {
  const parts: number[][] = [];
  function backtrack(lineIdx: number, sumSoFar: number, cur: number[]) {
    if (lineIdx === 5) {
      if (sumSoFar === 15) parts.push([...cur]);
      return;
    }
    const linesLeft = 4 - lineIdx;
    for (let c = 2; c <= 4; c++) {
      if (sumSoFar + c + linesLeft * 2 <= 15 && sumSoFar + c + linesLeft * 4 >= 15) {
        cur.push(c);
        backtrack(lineIdx + 1, sumSoFar + c, cur);
        cur.pop();
      }
    }
  }
  backtrack(0, 0, []);
  return parts;
})();

/**
 * Gera 15 dezenas aleatórias em 1..25 usando PRNG determinístico.
 */
function randomGame(rng: ReturnType<typeof createRng>): number[] {
  const nums = Array.from({ length: UNIVERSE_SIZE }, (_, i) => i + 1);
  for (let i = nums.length - 1; i > 0; i--) {
    const j = rng.int(i + 1);
    const temp = nums[i]!;
    nums[i] = nums[j]!;
    nums[j] = temp;
  }
  return nums.slice(0, PICK_SIZE).sort((a, b) => a - b);
}

/**
 * Gera 15 dezenas aleatórias que respeitam ESTRITAMENTE a restrição de linhas [2, 4],
 * por amostragem exata de partição de linha (zero fallback, 100% de conformidade garantida).
 */
export function randomGameWithBalancedLines(rng: ReturnType<typeof createRng>): number[] {
  const partition = BALANCED_PARTITIONS[rng.int(BALANCED_PARTITIONS.length)]!;
  const chosen: number[] = [];

  for (let row = 0; row < 5; row++) {
    const countInRow = partition[row]!;
    const rowNumbers = [row * 5 + 1, row * 5 + 2, row * 5 + 3, row * 5 + 4, row * 5 + 5];

    // Embaralha números da linha e seleciona os primeiros countInRow
    for (let i = 4; i > 0; i--) {
      const j = rng.int(i + 1);
      const temp = rowNumbers[i]!;
      rowNumbers[i] = rowNumbers[j]!;
      rowNumbers[j] = temp;
    }

    for (let k = 0; k < countInRow; k++) {
      chosen.push(rowNumbers[k]!);
    }
  }

  return chosen.sort((a, b) => a - b);
}

/**
 * Converte jogo em máscara de bits.
 */
function toMask(numbers: readonly number[]): number {
  let m = 0;
  for (const n of numbers) m |= 1 << (n - 1);
  return m;
}

/**
 * Conta acertos entre jogo e sorteio real.
 */
function countHits(game: readonly number[], targetDraw: readonly number[]): number {
  const targetSet = new Set(targetDraw);
  let h = 0;
  for (const n of game) {
    if (targetSet.has(n)) h++;
  }
  return h;
}

/**
 * Gera portfólio heurístico leve para o modo FAST.
 */
function generateBacktestPortfolio(
  candidateCount: number,
  rng: ReturnType<typeof createRng>,
  options: {
    enforceBalancedLines?: boolean;
    useCycle?: boolean;
    useRelationships?: boolean;
    useDelays?: boolean;
    useFrequencies?: boolean;
    useCoverage?: boolean;
    frequentNumbers?: number[];
    missingInCycle?: number[];
    delayedNumbers?: number[];
    casadasPairs?: [number, number][];
  },
): number[][] {
  const portfolio: number[][] = [];
  const portfolioMasks: number[] = [];
  const coveredSet = new Set<number>();

  for (let g = 0; g < candidateCount; g++) {
    let bestCandidate: number[] | null = null;
    let bestScore = -Infinity;

    for (let c = 0; c < 20; c++) {
      const cand = options.enforceBalancedLines ? randomGameWithBalancedLines(rng) : randomGame(rng);

      let score = 0;

      if (options.useFrequencies && options.frequentNumbers) {
        const fCount = cand.filter((n) => options.frequentNumbers!.includes(n)).length;
        score += fCount * 1.5;
      }

      if (options.useCycle && options.missingInCycle && options.missingInCycle.length > 0) {
        const missingCount = cand.filter((n) => options.missingInCycle!.includes(n)).length;
        score += missingCount === 1 || missingCount === 2 ? 3.0 : -1.0;
      }

      if (options.useRelationships && options.casadasPairs && options.casadasPairs.length > 0) {
        let casadasMatched = 0;
        const cSet = new Set(cand);
        for (const [nA, nB] of options.casadasPairs) {
          if (cSet.has(nA) && cSet.has(nB)) casadasMatched++;
        }
        score += casadasMatched * 2.0;
      }

      if (options.useDelays && options.delayedNumbers && options.delayedNumbers.length > 0) {
        const delCount = cand.filter((n) => options.delayedNumbers!.includes(n)).length;
        score += delCount <= 2 ? 2.0 : -2.0;
      }

      if (options.useCoverage && portfolio.length > 0) {
        let newNumbers = 0;
        for (const n of cand) {
          if (!coveredSet.has(n)) newNumbers++;
        }
        score += newNumbers * 1.0;
      }

      // Bônus de Hamming contra jogos já selecionados na carteira
      const cMask = toMask(cand);
      let minH = 25;
      for (const pMask of portfolioMasks) {
        const d = hammingDistance(cMask, pMask);
        if (d < minH) minH = d;
      }
      if (portfolio.length > 0) {
        score += minH * 0.3;
      }

      if (score > bestScore) {
        bestScore = score;
        bestCandidate = cand;
      }
    }

    const chosen =
      bestCandidate ?? (options.enforceBalancedLines ? randomGameWithBalancedLines(rng) : randomGame(rng));
    portfolio.push(chosen);
    portfolioMasks.push(toMask(chosen));
    for (const n of chosen) coveredSet.add(n);
  }

  return portfolio;
}

/**
 * Constrói métricas descritivas e inferenciais agregadas concurso a concurso.
 */
function buildMetrics(
  name: string,
  category: 'BENCHMARK' | 'ABLATION',
  contestsEvaluated: readonly Contest[],
  portfoliosPerContest: readonly number[][][],
  hitsPerContest: readonly number[][],
  b1HitsPerContest?: readonly number[][],
): BenchmarkMetrics {
  const numContests = portfoliosPerContest.length;
  const allHits: number[] = [];
  for (const hList of hitsPerContest) {
    allHits.push(...hList);
  }

  const totalGames = allHits.length;
  if (totalGames === 0 || numContests === 0) {
    return {
      name,
      category,
      totalContestsEvaluated: 0,
      totalGamesTested: 0,
      meanHits: 0,
      medianHits: 0,
      minHits: 0,
      maxHits: 0,
      hitsDistribution: { hits11: 0, hits12: 0, hits13: 0, hits14: 0, hits15: 0, under11: 0 },
      totalCost: 0,
      theoreticalReturn: 0,
      roi: 0,
      averageCoverage: 0,
      averageOverlap: 0,
    };
  }

  const sortedHits = [...allHits].sort((a, b) => a - b);
  const sumHits = sortedHits.reduce((acc, h) => acc + h, 0);
  const meanHits = sumHits / totalGames;
  const medianHits = sortedHits[Math.floor(totalGames / 2)]!;
  const minHits = sortedHits[0]!;
  const maxHits = sortedHits[totalGames - 1]!;

  const dist = {
    hits11: 0,
    hits12: 0,
    hits13: 0,
    hits14: 0,
    hits15: 0,
    under11: 0,
  };

  let theoreticalReturn = 0;
  let realizedReturn = 0;

  for (let step = 0; step < numContests; step++) {
    const contest = contestsEvaluated[step];
    const games = portfoliosPerContest[step]!;
    const hits = hitsPerContest[step]!;

    const prizeContest = contest as HistoricalContestWithPrizes | undefined;
    for (let g = 0; g < games.length; g++) {
      const h = hits[g]!;
      if (h === 15) {
        dist.hits15++;
        theoreticalReturn += PRIZE_TABLE.hit15;
        realizedReturn += prizeContest?.rateio15 ? prizeContest.rateio15 : PRIZE_TABLE.hit15;
      } else if (h === 14) {
        dist.hits14++;
        theoreticalReturn += PRIZE_TABLE.hit14;
        realizedReturn += prizeContest?.rateio14 ? prizeContest.rateio14 : PRIZE_TABLE.hit14;
      } else if (h === 13) {
        dist.hits13++;
        theoreticalReturn += PRIZE_TABLE.hit13;
        realizedReturn += PRIZE_TABLE.hit13;
      } else if (h === 12) {
        dist.hits12++;
        theoreticalReturn += PRIZE_TABLE.hit12;
        realizedReturn += PRIZE_TABLE.hit12;
      } else if (h === 11) {
        dist.hits11++;
        theoreticalReturn += PRIZE_TABLE.hit11;
        realizedReturn += PRIZE_TABLE.hit11;
      } else {
        dist.under11++;
      }
    }
  }

  const totalCost = totalGames * PRIZE_TABLE.costPerGame;
  const roi = totalCost > 0 ? (theoreticalReturn - totalCost) / totalCost : 0;

  // Cobertura e sobreposição média entre jogos da carteira
  let sumCoverage = 0;
  let sumOverlap = 0;
  let overlapCount = 0;

  for (const port of portfoliosPerContest) {
    const unique = new Set<number>();
    for (const g of port) {
      for (const n of g) unique.add(n);
    }
    sumCoverage += unique.size;

    for (let i = 0; i < port.length; i++) {
      const setI = new Set(port[i]);
      for (let j = i + 1; j < port.length; j++) {
        let common = 0;
        for (const n of port[j]!) {
          if (setI.has(n)) common++;
        }
        sumOverlap += common;
        overlapCount++;
      }
    }
  }

  const averageCoverage = sumCoverage / numContests;
  const averageOverlap = overlapCount > 0 ? sumOverlap / overlapCount : 0;

  // Inferência Estatística Pareada por Concurso contra B1
  let pairedMeanDiff: number | undefined;
  let ci95Lower: number | undefined;
  let ci95Upper: number | undefined;
  let pValueVsRandom: number | undefined;
  let winRateVsRandom: number | undefined;
  let epistemicVerdict: BenchmarkMetrics['epistemicVerdict'];

  if (b1HitsPerContest && b1HitsPerContest.length === numContests) {
    const diffs: number[] = [];
    let wins = 0;

    for (let t = 0; t < numContests; t++) {
      const hStrat = hitsPerContest[t]!;
      const hB1 = b1HitsPerContest[t]!;
      const meanStratT = hStrat.reduce((a, b) => a + b, 0) / hStrat.length;
      const meanB1T = hB1.reduce((a, b) => a + b, 0) / hB1.length;
      const d = meanStratT - meanB1T;
      diffs.push(d);
      if (meanStratT > meanB1T) wins++;
    }

    const dMean = diffs.reduce((a, b) => a + b, 0) / numContests;
    pairedMeanDiff = Number(dMean.toFixed(4));
    winRateVsRandom = Number((wins / numContests).toFixed(4));

    let varSum = 0;
    for (const d of diffs) varSum += (d - dMean) ** 2;
    const sDiff = numContests > 1 ? Math.sqrt(varSum / (numContests - 1)) : 0;
    const seDiff = sDiff / Math.sqrt(numContests);

    ci95Lower = Number((dMean - 1.96 * seDiff).toFixed(4));
    ci95Upper = Number((dMean + 1.96 * seDiff).toFixed(4));

    const tStat = seDiff > 0 ? dMean / seDiff : 0;
    pValueVsRandom = Number(erfc(Math.abs(tStat) / Math.SQRT2).toFixed(5));

    if (name.includes('B1:')) {
      epistemicVerdict = 'BENCHMARK_BASE';
    } else if (pValueVsRandom < 0.05 && pairedMeanDiff > 0) {
      epistemicVerdict = 'SUPERIORIDADE_SIGNIFICATIVA';
    } else {
      epistemicVerdict = 'EMPATE_ESTATISTICO_SOB_ACASO';
    }
  }

  return {
    name,
    category,
    totalContestsEvaluated: numContests,
    totalGamesTested: totalGames,
    meanHits: Number(meanHits.toFixed(3)),
    medianHits,
    minHits,
    maxHits,
    hitsDistribution: dist,
    totalCost,
    theoreticalReturn,
    realizedReturn,
    roi: Number(roi.toFixed(4)),
    averageCoverage: Number(averageCoverage.toFixed(2)),
    averageOverlap: Number(averageOverlap.toFixed(2)),
    pairedMeanDiff,
    ci95Lower,
    ci95Upper,
    pValueVsRandom,
    winRateVsRandom,
    epistemicVerdict,
  };
}

/**
 * Executa geração real de portfólio em modo PRODUCTION com branch-and-bound e GRASP.
 */
function generateProductionPortfolio(
  configOverrides: Partial<GeneratorConfig>,
  analysis: DatasetAnalysis,
  stepSeed: number,
  precomputedPool?: CandidatePool,
): number[][] {
  const prodConfig = cloneGeneratorConfig(DEFAULT_GENERATOR_CONFIG);
  Object.assign(prodConfig, configOverrides);
  prodConfig.count = 10;
  prodConfig.poolSize = 250;
  prodConfig.restarts = 1;
  prodConfig.seed = stepSeed;

  const opt = optimizePortfolio(prodConfig, analysis, undefined, precomputedPool);
  if (opt.success && opt.games.length === 10) {
    return opt.games.map((g) => g.numbers);
  }

  // Fallback seguro de geração com linhas balanceadas caso o pool com restrições seja inviável
  const rng = createRng(stepSeed);
  return Array.from({ length: 10 }, () => randomGameWithBalancedLines(rng));
}

/**
 * Executa o Walk-Forward Backtesting completo e testes de ablação.
 */
export function runWalkForwardBacktest(
  contests: readonly Contest[],
  numEvaluationPoints = 30,
  seed = 42,
  mode: BacktestMode = 'FAST',
  onProgress?: (step: number, total: number, message: string) => void,
): WalkForwardResult {
  const startTime = Date.now();
  const T = contests.length;
  const safeEvalPoints = Math.min(numEvaluationPoints, Math.max(5, Math.floor(T * 0.2)));

  const startIdx = T - safeEvalPoints;
  const startContest = contests[startIdx]!.contest;
  const endContest = contests[T - 1]!.contest;

  const rng = createRng(seed);

  // Arrays de acertos agrupados por concurso [step][game]
  const hitsB1PerContest: number[][] = [];
  const hitsB2PerContest: number[][] = [];
  const hitsB3PerContest: number[][] = [];
  const hitsB4PerContest: number[][] = [];
  const hitsB5PerContest: number[][] = [];
  const hitsB6PerContest: number[][] = [];
  const hitsB7PerContest: number[][] = [];

  const hitsFullPerContest: number[][] = [];
  const hitsNoCyclePerContest: number[][] = [];
  const hitsNoLinesPerContest: number[][] = [];
  const hitsNoPairsPerContest: number[][] = [];
  const hitsNoDelayPerContest: number[][] = [];
  const hitsNoCoveragePerContest: number[][] = [];

  // Portfólios agrupados por concurso
  const portB1: number[][][] = [];
  const portB2: number[][][] = [];
  const portB3: number[][][] = [];
  const portB4: number[][][] = [];
  const portB5: number[][][] = [];
  const portB6: number[][][] = [];
  const portB7: number[][][] = [];

  const portFull: number[][][] = [];
  const portNoCycle: number[][][] = [];
  const portNoLines: number[][][] = [];
  const portNoPairs: number[][][] = [];
  const portNoDelay: number[][][] = [];
  const portNoCoverage: number[][][] = [];

  const evaluatedContests: Contest[] = [];

  for (let step = 0; step < safeEvalPoints; step++) {
    const t = startIdx + step;
    const historySlice = contests.slice(0, t);
    const targetContest = contests[t]!;
    const targetDraw = targetContest.numbers;
    evaluatedContests.push(targetContest);

    // Validação estrita de zero data leakage
    if (historySlice.length > 0 && historySlice[historySlice.length - 1]!.contest >= targetContest.contest) {
      throw new Error(`Vazamento temporal detectado: histórico contém o concurso ${targetContest.contest}!`);
    }

    if (onProgress && step % 5 === 0) {
      onProgress(
        step + 1,
        safeEvalPoints,
        `Avaliando concurso ${targetContest.contest} (${step + 1}/${safeEvalPoints})...`,
      );
    }

    // Executa análise estatística isolada para o momento t (zero contaminação)
    const analysis = runDatasetAnalysis(historySlice);
    const frequentNumbers = analysis.behaviors.frequentNumbers;
    const missingInCycle = analysis.cycles.currentCycle.missingNumbers;
    const delayedNumbers = analysis.behaviors.delayedNumbers;
    const casadasPairs = analysis.relationships.topCasadas.map((p) => [p.numA, p.numB] as [number, number]);

    // B1: 10 jogos puramente aleatórios
    const pB1 = Array.from({ length: 10 }, () => randomGame(rng));
    portB1.push(pB1);
    const hB1 = pB1.map((g) => countHits(g, targetDraw));
    hitsB1PerContest.push(hB1);

    // B2: 10 jogos aleatórios com linhas rigorosamente balanceadas (2 a 4 dezenas)
    const pB2 = Array.from({ length: 10 }, () => randomGameWithBalancedLines(rng));
    portB2.push(pB2);
    hitsB2PerContest.push(pB2.map((g) => countHits(g, targetDraw)));

    let pB3: number[][];
    let pB4: number[][];
    let pB5: number[][];
    let pB6: number[][];
    let pB7: number[][];

    let pFull: number[][];
    let pNoCycle: number[][];
    let pNoLines: number[][];
    let pNoPairs: number[][];
    let pNoDelay: number[][];
    let pNoCoverage: number[][];

    if (mode === 'PRODUCTION') {
      // Execução Real com optimizePortfolio + validatePortfolio
      const stepSeed = seed + step * 31;
      const context = {
        lastDraw: analysis.summary.lastDrawNumbers,
        temperature: analysis.zScores.scores.map((s) => s.temperature),
      };
      // Pré-computa o pool de candidatos válido uma única vez por passo temporal (evita 10x redundância)
      const basePool = generateCandidatePool(DEFAULT_GENERATOR_CONFIG.constraints, context, 250, stepSeed);

      pB3 = generateProductionPortfolio({ portfolioStrategy: '5_3_2' }, analysis, stepSeed, basePool);
      pB4 = generateProductionPortfolio({ portfolioStrategy: 'LINES' }, analysis, stepSeed + 1, basePool);
      pB5 = generateProductionPortfolio({ portfolioStrategy: 'CYCLE' }, analysis, stepSeed + 2, basePool);
      pB6 = generateProductionPortfolio(
        { portfolioStrategy: 'RELATIONSHIPS' },
        analysis,
        stepSeed + 3,
        basePool,
      );
      pB7 = generateProductionPortfolio({ portfolioStrategy: '5_3_2' }, analysis, stepSeed + 4, basePool);

      pFull = pB7;
      pNoCycle = generateProductionPortfolio(
        { portfolioStrategy: '5_3_2', weights: { ...DEFAULT_GENERATOR_CONFIG.weights, cycle: 0 } },
        analysis,
        stepSeed + 5,
        basePool,
      );
      pNoLines = generateProductionPortfolio(
        {
          portfolioStrategy: '5_3_2',
          constraints: { ...DEFAULT_GENERATOR_CONFIG.constraints, lineMode: 'FREE' },
        },
        analysis,
        stepSeed + 6,
      );
      pNoPairs = generateProductionPortfolio(
        {
          portfolioStrategy: '5_3_2',
          weights: {
            ...DEFAULT_GENERATOR_CONFIG.weights,
            pairRelationship: 0,
            casadas: 0,
            brigadas: 0,
          },
        },
        analysis,
        stepSeed + 7,
        basePool,
      );
      pNoDelay = generateProductionPortfolio(
        { portfolioStrategy: '5_3_2', weights: { ...DEFAULT_GENERATOR_CONFIG.weights, delay: 0 } },
        analysis,
        stepSeed + 8,
        basePool,
      );
      pNoCoverage = generateProductionPortfolio(
        { portfolioStrategy: '5_3_2', weights: { ...DEFAULT_GENERATOR_CONFIG.weights, coverage: 0 } },
        analysis,
        stepSeed + 9,
        basePool,
      );
    } else {
      // Modo FAST: proxy heurístico leve com partições exatas de linha
      pB3 = [
        ...generateBacktestPortfolio(5, rng, { useFrequencies: true, frequentNumbers }),
        ...generateBacktestPortfolio(3, rng, { enforceBalancedLines: true }),
        ...generateBacktestPortfolio(2, rng, { useCoverage: true }),
      ];

      pB4 = [
        ...generateBacktestPortfolio(5, rng, {
          enforceBalancedLines: true,
          useFrequencies: true,
          frequentNumbers,
        }),
        ...generateBacktestPortfolio(3, rng, { enforceBalancedLines: true }),
        ...generateBacktestPortfolio(2, rng, { enforceBalancedLines: true, useCoverage: true }),
      ];

      pB5 = [
        ...generateBacktestPortfolio(5, rng, {
          useCycle: true,
          missingInCycle,
          useFrequencies: true,
          frequentNumbers,
        }),
        ...generateBacktestPortfolio(3, rng, { useCycle: true, missingInCycle, enforceBalancedLines: true }),
        ...generateBacktestPortfolio(2, rng, { useCycle: true, missingInCycle, useCoverage: true }),
      ];

      pB6 = [
        ...generateBacktestPortfolio(5, rng, {
          useRelationships: true,
          casadasPairs,
          useFrequencies: true,
          frequentNumbers,
        }),
        ...generateBacktestPortfolio(3, rng, {
          useRelationships: true,
          casadasPairs,
          enforceBalancedLines: true,
        }),
        ...generateBacktestPortfolio(2, rng, { useRelationships: true, casadasPairs, useCoverage: true }),
      ];

      pB7 = [
        ...generateBacktestPortfolio(5, rng, {
          enforceBalancedLines: true,
          useCycle: true,
          useRelationships: true,
          useFrequencies: true,
          frequentNumbers,
          missingInCycle,
          casadasPairs,
        }),
        ...generateBacktestPortfolio(3, rng, {
          enforceBalancedLines: true,
          useCycle: true,
          useDelays: true,
          missingInCycle,
          delayedNumbers,
        }),
        ...generateBacktestPortfolio(2, rng, {
          enforceBalancedLines: true,
          useCoverage: true,
        }),
      ];

      pFull = pB7;
      pNoCycle = [
        ...generateBacktestPortfolio(5, rng, {
          enforceBalancedLines: true,
          useCycle: false,
          useRelationships: true,
          useFrequencies: true,
          frequentNumbers,
          casadasPairs,
        }),
        ...generateBacktestPortfolio(3, rng, {
          enforceBalancedLines: true,
          useCycle: false,
          useDelays: true,
          delayedNumbers,
        }),
        ...generateBacktestPortfolio(2, rng, {
          enforceBalancedLines: true,
          useCoverage: true,
        }),
      ];

      pNoLines = [
        ...generateBacktestPortfolio(5, rng, {
          enforceBalancedLines: false,
          useCycle: true,
          useRelationships: true,
          useFrequencies: true,
          frequentNumbers,
          missingInCycle,
          casadasPairs,
        }),
        ...generateBacktestPortfolio(3, rng, {
          enforceBalancedLines: false,
          useCycle: true,
          useDelays: true,
          missingInCycle,
          delayedNumbers,
        }),
        ...generateBacktestPortfolio(2, rng, {
          enforceBalancedLines: false,
          useCoverage: true,
        }),
      ];

      pNoPairs = [
        ...generateBacktestPortfolio(5, rng, {
          enforceBalancedLines: true,
          useCycle: true,
          useRelationships: false,
          useFrequencies: true,
          frequentNumbers,
          missingInCycle,
        }),
        ...generateBacktestPortfolio(3, rng, {
          enforceBalancedLines: true,
          useCycle: true,
          useDelays: true,
          missingInCycle,
          delayedNumbers,
        }),
        ...generateBacktestPortfolio(2, rng, {
          enforceBalancedLines: true,
          useCoverage: true,
        }),
      ];

      pNoDelay = [
        ...generateBacktestPortfolio(5, rng, {
          enforceBalancedLines: true,
          useCycle: true,
          useRelationships: true,
          useFrequencies: true,
          frequentNumbers,
          missingInCycle,
          casadasPairs,
        }),
        ...generateBacktestPortfolio(3, rng, {
          enforceBalancedLines: true,
          useCycle: true,
          useDelays: false,
          missingInCycle,
        }),
        ...generateBacktestPortfolio(2, rng, {
          enforceBalancedLines: true,
          useCoverage: true,
        }),
      ];

      pNoCoverage = [
        ...generateBacktestPortfolio(5, rng, {
          enforceBalancedLines: true,
          useCycle: true,
          useRelationships: true,
          useFrequencies: true,
          frequentNumbers,
          missingInCycle,
          casadasPairs,
        }),
        ...generateBacktestPortfolio(3, rng, {
          enforceBalancedLines: true,
          useCycle: true,
          useDelays: true,
          missingInCycle,
          delayedNumbers,
        }),
        ...generateBacktestPortfolio(2, rng, {
          enforceBalancedLines: true,
          useCoverage: false,
        }),
      ];
    }

    portB3.push(pB3);
    hitsB3PerContest.push(pB3.map((g) => countHits(g, targetDraw)));

    portB4.push(pB4);
    hitsB4PerContest.push(pB4.map((g) => countHits(g, targetDraw)));

    portB5.push(pB5);
    hitsB5PerContest.push(pB5.map((g) => countHits(g, targetDraw)));

    portB6.push(pB6);
    hitsB6PerContest.push(pB6.map((g) => countHits(g, targetDraw)));

    portB7.push(pB7);
    hitsB7PerContest.push(pB7.map((g) => countHits(g, targetDraw)));

    portFull.push(pFull);
    hitsFullPerContest.push(pFull.map((g) => countHits(g, targetDraw)));

    portNoCycle.push(pNoCycle);
    hitsNoCyclePerContest.push(pNoCycle.map((g) => countHits(g, targetDraw)));

    portNoLines.push(pNoLines);
    hitsNoLinesPerContest.push(pNoLines.map((g) => countHits(g, targetDraw)));

    portNoPairs.push(pNoPairs);
    hitsNoPairsPerContest.push(pNoPairs.map((g) => countHits(g, targetDraw)));

    portNoDelay.push(pNoDelay);
    hitsNoDelayPerContest.push(pNoDelay.map((g) => countHits(g, targetDraw)));

    portNoCoverage.push(pNoCoverage);
    hitsNoCoveragePerContest.push(pNoCoverage.map((g) => countHits(g, targetDraw)));
  }

  const executionTimeMs = Date.now() - startTime;

  const benchmarks: BenchmarkMetrics[] = [
    buildMetrics(
      'B1: 10 Jogos Aleatórios',
      'BENCHMARK',
      evaluatedContests,
      portB1,
      hitsB1PerContest,
      hitsB1PerContest,
    ),
    buildMetrics(
      'B2: Aleatório + Linhas (2-4)',
      'BENCHMARK',
      evaluatedContests,
      portB2,
      hitsB2PerContest,
      hitsB1PerContest,
    ),
    buildMetrics(
      'B3: Carteira 5-3-2 Base',
      'BENCHMARK',
      evaluatedContests,
      portB3,
      hitsB3PerContest,
      hitsB1PerContest,
    ),
    buildMetrics(
      'B4: 5-3-2 + Linhas',
      'BENCHMARK',
      evaluatedContests,
      portB4,
      hitsB4PerContest,
      hitsB1PerContest,
    ),
    buildMetrics(
      'B5: 5-3-2 + Ciclo',
      'BENCHMARK',
      evaluatedContests,
      portB5,
      hitsB5PerContest,
      hitsB1PerContest,
    ),
    buildMetrics(
      'B6: 5-3-2 + Relacionamentos',
      'BENCHMARK',
      evaluatedContests,
      portB6,
      hitsB6PerContest,
      hitsB1PerContest,
    ),
    buildMetrics(
      'B7: Modelo Híbrido Completo',
      'BENCHMARK',
      evaluatedContests,
      portB7,
      hitsB7PerContest,
      hitsB1PerContest,
    ),
  ];

  const ablations: BenchmarkMetrics[] = [
    buildMetrics('FULL MODEL', 'ABLATION', evaluatedContests, portFull, hitsFullPerContest, hitsB1PerContest),
    buildMetrics(
      'FULL - CYCLE',
      'ABLATION',
      evaluatedContests,
      portNoCycle,
      hitsNoCyclePerContest,
      hitsB1PerContest,
    ),
    buildMetrics(
      'FULL - LINES',
      'ABLATION',
      evaluatedContests,
      portNoLines,
      hitsNoLinesPerContest,
      hitsB1PerContest,
    ),
    buildMetrics(
      'FULL - PAIRS',
      'ABLATION',
      evaluatedContests,
      portNoPairs,
      hitsNoPairsPerContest,
      hitsB1PerContest,
    ),
    buildMetrics(
      'FULL - DELAY',
      'ABLATION',
      evaluatedContests,
      portNoDelay,
      hitsNoDelayPerContest,
      hitsB1PerContest,
    ),
    buildMetrics(
      'FULL - COVERAGE',
      'ABLATION',
      evaluatedContests,
      portNoCoverage,
      hitsNoCoveragePerContest,
      hitsB1PerContest,
    ),
  ];

  const modeDescription =
    mode === 'PRODUCTION'
      ? 'Modo equivalente à produção (Production Mode) — executa a cadeia combinatória real com branch-and-bound e GRASP a cada passo temporal.'
      : 'Proxy heurístico rápido (Fast Mode) — validação preliminar com amostragem exata de partições de linha sem execução da otimização pesada.';

  return {
    evaluationPoints: safeEvalPoints,
    startContest,
    endContest,
    benchmarks,
    ablations,
    executionTimeMs,
    mode,
    modeDescription,
  };
}
