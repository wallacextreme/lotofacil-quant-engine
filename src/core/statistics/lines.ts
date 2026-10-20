/**
 * Módulo de Análise das 5 Linhas do Volante (LineDistributionAnalyzer).
 *
 * Estrutura Cartesiana Padrão:
 * Linha 1: 01–05
 * Linha 2: 06–10
 * Linha 3: 11–15
 * Linha 4: 16–20
 * Linha 5: 21–25
 *
 * Mandato Metodológico:
 * - Toda aposta da Lotofácil tem exatamente 15 dezenas distribuídas entre as 5 linhas: ∑ l_i = 15.
 * - Descoberta empírica: não assumir que 3-3-3-3-3 é obrigatoriamente a mais comum.
 * - Estudo temporal de movimentação (momentum, alternância, persistência, distâncias).
 */
import { GRID_SIZE } from '../domain/constants';
import type { Contest } from '../domain/types';

export interface LineVector {
  l1: number;
  l2: number;
  l3: number;
  l4: number;
  l5: number;
  pattern: string; // ex: "3-3-3-3-3"
}

export interface LinePatternRecord {
  pattern: string;
  counts: [number, number, number, number, number];
  occurrenceCount: number;
  relativeFrequency: number;
  /** Excesso ou déficit em relação à probabilidade combinatória teórica da partição */
  lastSeenContest: number | null;
  currentDelay: number;
}

export interface LineMovementRecord {
  contest: number;
  pattern: string;
  counts: [number, number, number, number, number];
  /** Variação linha a linha em relação ao concurso anterior (Δ_i = c_{t, i} - c_{t-1, i}) */
  deltas: [number, number, number, number, number];
  /** Distância de Manhattan: ∑ |c_{t, i} - c_{t-1, i}| */
  manhattanDistance: number;
  /** Distância Euclidiana */
  euclideanDistance: number;
  /** Se repetiu o padrão exato do sorteio anterior */
  isPatternRepeated: boolean;
  /** Linha mais concentrada neste sorteio */
  dominantLine: number; // 1..5
}

export interface LineStats {
  lineIndex: number; // 1..5
  rangeText: string; // ex: "01-05"
  mean: number;
  theoreticalMean: number; // 3.000
  stdDev: number;
  variance: number;
  min: number;
  max: number;
  /** Distribuição de contagens nesta linha: contagem 0, 1, 2, 3, 4, 5 */
  countDistribution: { count: number; occurrences: number; percentage: number }[];
  /** Tendência recente: média dos últimos 20 concursos vs média histórica */
  recentMean: number;
  momentum: 'CRESCIMENTO' | 'ESTAVEL' | 'REDUCAO';
}

export interface LineDistributionAnalysis {
  totalContests: number;
  /** Histórico de vetores por concurso */
  drawVectors: { contest: number; vector: LineVector }[];
  /** Padrões descobertos ordenados por frequência decrescente */
  patterns: LinePatternRecord[];
  mostFrequentPatterns: LinePatternRecord[];
  leastFrequentPatterns: LinePatternRecord[];
  /** Estatísticas individuais das 5 linhas */
  lines: LineStats[];
  /** Movimentação temporal concurso a concurso */
  movements: LineMovementRecord[];
  /** Taxa empírica de repetição consecutiva do mesmo padrão */
  patternRepetitionRate: number;
  /** Média da distância de Manhattan entre concursos consecutivos */
  meanManhattanDistance: number;
}

/**
 * Converte um array de 15 dezenas (1..25) no vetor de distribuição de linhas.
 */
export function extractLineVector(numbers: readonly number[]): LineVector {
  let l1 = 0;
  let l2 = 0;
  let l3 = 0;
  let l4 = 0;
  let l5 = 0;

  for (const n of numbers) {
    if (n >= 1 && n <= 5) l1++;
    else if (n >= 6 && n <= 10) l2++;
    else if (n >= 11 && n <= 15) l3++;
    else if (n >= 16 && n <= 20) l4++;
    else if (n >= 21 && n <= 25) l5++;
  }

  const pattern = `${l1}-${l2}-${l3}-${l4}-${l5}`;
  return { l1, l2, l3, l4, l5, pattern };
}

/**
 * Analisa a distribuição e a movimentação das 5 linhas sobre a série histórica.
 */
export function analyzeLineDistribution(contests: readonly Contest[]): LineDistributionAnalysis {
  const T = contests.length;
  if (T === 0) {
    return {
      totalContests: 0,
      drawVectors: [],
      patterns: [],
      mostFrequentPatterns: [],
      leastFrequentPatterns: [],
      lines: [],
      movements: [],
      patternRepetitionRate: 0,
      meanManhattanDistance: 0,
    };
  }

  const drawVectors: { contest: number; vector: LineVector }[] = [];
  const patternMap = new Map<
    string,
    { counts: [number, number, number, number, number]; occurrences: number; lastContest: number }
  >();
  const lineCountOccurrences: number[][] = Array.from({ length: GRID_SIZE }, () => new Array(6).fill(0));
  const lineSums = new Array<number>(GRID_SIZE).fill(0);
  const lineSquares = new Array<number>(GRID_SIZE).fill(0);
  const lineRecentSums = new Array<number>(GRID_SIZE).fill(0);

  const RECENT_WINDOW = Math.min(20, T);
  const recentThresholdIndex = T - RECENT_WINDOW;

  for (let idx = 0; idx < T; idx++) {
    const c = contests[idx]!;
    const v = extractLineVector(c.numbers);
    drawVectors.push({ contest: c.contest, vector: v });

    const counts: [number, number, number, number, number] = [v.l1, v.l2, v.l3, v.l4, v.l5];

    // Atualiza estatísticas do padrão
    const existing = patternMap.get(v.pattern);
    if (existing) {
      existing.occurrences++;
      existing.lastContest = c.contest;
    } else {
      patternMap.set(v.pattern, { counts, occurrences: 1, lastContest: c.contest });
    }

    // Atualiza estatísticas por linha
    for (let i = 0; i < GRID_SIZE; i++) {
      const val = counts[i]!;
      lineCountOccurrences[i]![val]!++;
      lineSums[i]! += val;
      lineSquares[i]! += val * val;
      if (idx >= recentThresholdIndex) {
        lineRecentSums[i]! += val;
      }
    }
  }

  const lastContestNumber = contests[T - 1]!.contest;

  // Compila padrões ordenados
  const patterns: LinePatternRecord[] = Array.from(patternMap.entries())
    .map(([pattern, data]) => ({
      pattern,
      counts: data.counts,
      occurrenceCount: data.occurrences,
      relativeFrequency: data.occurrences / T,
      lastSeenContest: data.lastContest,
      currentDelay: lastContestNumber - data.lastContest,
    }))
    .sort((a, b) => b.occurrenceCount - a.occurrenceCount);

  const mostFrequentPatterns = patterns.slice(0, 10);
  const leastFrequentPatterns = patterns.slice(-10).reverse();

  // Movimentação temporal concurso a concurso
  const movements: LineMovementRecord[] = [];
  let repetitionsCount = 0;
  let totalManhattan = 0;

  for (let idx = 0; idx < T; idx++) {
    const cur = drawVectors[idx]!;
    const curCounts: [number, number, number, number, number] = [
      cur.vector.l1,
      cur.vector.l2,
      cur.vector.l3,
      cur.vector.l4,
      cur.vector.l5,
    ];

    let maxVal = -1;
    let dominantLine = 1;
    for (let i = 0; i < 5; i++) {
      if (curCounts[i]! > maxVal) {
        maxVal = curCounts[i]!;
        dominantLine = i + 1;
      }
    }

    if (idx === 0) {
      movements.push({
        contest: cur.contest,
        pattern: cur.vector.pattern,
        counts: curCounts,
        deltas: [0, 0, 0, 0, 0],
        manhattanDistance: 0,
        euclideanDistance: 0,
        isPatternRepeated: false,
        dominantLine,
      });
      continue;
    }

    const prev = drawVectors[idx - 1]!;
    const prevCounts: [number, number, number, number, number] = [
      prev.vector.l1,
      prev.vector.l2,
      prev.vector.l3,
      prev.vector.l4,
      prev.vector.l5,
    ];

    const deltas: [number, number, number, number, number] = [
      curCounts[0] - prevCounts[0],
      curCounts[1] - prevCounts[1],
      curCounts[2] - prevCounts[2],
      curCounts[3] - prevCounts[3],
      curCounts[4] - prevCounts[4],
    ];

    const isPatternRepeated = cur.vector.pattern === prev.vector.pattern;
    if (isPatternRepeated) repetitionsCount++;

    let manhattan = 0;
    let sqSum = 0;
    for (let i = 0; i < 5; i++) {
      const d = Math.abs(deltas[i]!);
      manhattan += d;
      sqSum += d * d;
    }

    totalManhattan += manhattan;

    movements.push({
      contest: cur.contest,
      pattern: cur.vector.pattern,
      counts: curCounts,
      deltas,
      manhattanDistance: manhattan,
      euclideanDistance: Math.sqrt(sqSum),
      isPatternRepeated,
      dominantLine,
    });
  }

  // Estatísticas consolidadas das 5 linhas
  const lineRangeTexts = ['01-05', '06-10', '11-15', '16-20', '21-25'];
  const lines: LineStats[] = [];

  for (let i = 0; i < GRID_SIZE; i++) {
    const mean = lineSums[i]! / T;
    const variance = lineSquares[i]! / T - mean * mean;
    const stdDev = Math.sqrt(Math.max(0, variance));
    const recentMean = lineRecentSums[i]! / RECENT_WINDOW;

    // Classificação de momentum recente
    let momentum: 'CRESCIMENTO' | 'ESTAVEL' | 'REDUCAO' = 'ESTAVEL';
    const deltaM = recentMean - mean;
    if (deltaM >= 0.3) momentum = 'CRESCIMENTO';
    else if (deltaM <= -0.3) momentum = 'REDUCAO';

    const countDistribution = lineCountOccurrences[i]!.map((occurrences, count) => ({
      count,
      occurrences,
      percentage: (occurrences / T) * 100,
    }));

    lines.push({
      lineIndex: i + 1,
      rangeText: lineRangeTexts[i]!,
      mean,
      theoreticalMean: 3.0,
      stdDev,
      variance,
      min: countDistribution.findIndex((d) => d.occurrences > 0),
      max: 5 - [...countDistribution].reverse().findIndex((d) => d.occurrences > 0),
      countDistribution,
      recentMean,
      momentum,
    });
  }

  const patternRepetitionRate = T > 1 ? repetitionsCount / (T - 1) : 0;
  const meanManhattanDistance = T > 1 ? totalManhattan / (T - 1) : 0;

  return {
    totalContests: T,
    drawVectors,
    patterns,
    mostFrequentPatterns,
    leastFrequentPatterns,
    lines,
    movements,
    patternRepetitionRate,
    meanManhattanDistance,
  };
}
