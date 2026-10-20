/**
 * Módulo de Distribuição e Equilíbrio de Ausências no Portfólio (AbsenceDistributionOptimizer).
 *
 * Mandatos §10 e §11:
 * - Em vez de concentrar todas as dezenas ausentes/atrasadas em um único jogo,
 *   distribui sua exposição de forma balanceada pela carteira.
 * - Calcula a matriz de exposição 25 dezenas × N jogos.
 * - Produz o CoverageScore e o ExposureBalanceScore.
 * - Detecta dezenas superconcentradas e sub-representadas.
 */
import { UNIVERSE_SIZE } from '../domain/constants';

export interface PortfolioExposureMatrix {
  portfolioSize: number; // K
  /** Matriz 25 × K: matrix[numIndex][gameIndex] = 1 se presente, 0 se ausente */
  matrix: number[][];
  /** Quantidade de jogos em que cada dezena 1..25 aparece (tamanho 25) */
  appearancesPerNumber: number[];
  /** Taxa de exposição de cada dezena (appearances / K) */
  exposureRates: number[];
  /** Total de dezenas únicas presentes no portfólio (ex: 25/25) */
  uniqueNumbersCovered: number;
  /** Dezenas ausentes em todos os jogos do portfólio */
  uncoveredNumbers: number[];
  /** Dezenas com aparição excessiva (> maxExposureThreshold) */
  overConcentratedNumbers: number[];
  /** Dezenas com aparição insuficiente (< minExposureThreshold) */
  underRepresentedNumbers: number[];
  /** CoverageScore: proporção das 25 dezenas cobertas no portfólio [0, 1] */
  coverageScore: number;
  /** ExposureBalanceScore: índice de equilíbrio da distribuição de exposição [0, 1] */
  exposureBalanceScore: number;
}

export interface ExposureLimitsConfig {
  minAppearancesPerNumber?: number;
  maxAppearancesPerNumber?: number;
  enforceFull25Coverage?: boolean;
}

/**
 * Calcula a matriz completa de exposição e os scores de equilíbrio para um portfólio de jogos.
 */
export function analyzePortfolioExposure(
  games: readonly (readonly number[])[],
  config: ExposureLimitsConfig = {},
): PortfolioExposureMatrix {
  const K = games.length;
  if (K === 0) {
    return {
      portfolioSize: 0,
      matrix: Array.from({ length: UNIVERSE_SIZE }, () => []),
      appearancesPerNumber: new Array(UNIVERSE_SIZE).fill(0),
      exposureRates: new Array(UNIVERSE_SIZE).fill(0),
      uniqueNumbersCovered: 0,
      uncoveredNumbers: Array.from({ length: UNIVERSE_SIZE }, (_, i) => i + 1),
      overConcentratedNumbers: [],
      underRepresentedNumbers: [],
      coverageScore: 0,
      exposureBalanceScore: 0,
    };
  }

  // Constrói matriz 25 × K
  const matrix: number[][] = Array.from({ length: UNIVERSE_SIZE }, () => new Array(K).fill(0));
  const appearances = new Array<number>(UNIVERSE_SIZE).fill(0);

  for (let g = 0; g < K; g++) {
    for (const num of games[g]!) {
      if (num >= 1 && num <= UNIVERSE_SIZE) {
        matrix[num - 1]![g] = 1;
        appearances[num - 1]!++;
      }
    }
  }

  const exposureRates = appearances.map((count) => count / K);
  const uncoveredNumbers: number[] = [];
  const overConcentratedNumbers: number[] = [];
  const underRepresentedNumbers: number[] = [];

  const minLimit = config.minAppearancesPerNumber ?? 1;
  const maxLimit = config.maxAppearancesPerNumber ?? Math.max(1, Math.ceil(K * 0.85));

  for (let i = 0; i < UNIVERSE_SIZE; i++) {
    const num = i + 1;
    const count = appearances[i]!;

    if (count === 0) {
      uncoveredNumbers.push(num);
    }
    if (count > maxLimit) {
      overConcentratedNumbers.push(num);
    }
    if (count < minLimit) {
      underRepresentedNumbers.push(num);
    }
  }

  const uniqueNumbersCovered = UNIVERSE_SIZE - uncoveredNumbers.length;
  const coverageScore = uniqueNumbersCovered / UNIVERSE_SIZE;

  // ExposureBalanceScore: calculado a partir da entropia normalizada de Shannon das exposições
  // ou da variância em relação à média esperada: (15 * K) / 25
  const idealAppearancesPerNumber = (15 * K) / UNIVERSE_SIZE;
  let varianceFromIdeal = 0;
  for (let i = 0; i < UNIVERSE_SIZE; i++) {
    varianceFromIdeal += (appearances[i]! - idealAppearancesPerNumber) ** 2;
  }
  const meanSqDiff = varianceFromIdeal / UNIVERSE_SIZE;
  // Normalização: zero quando muito disperso, 1.0 quando perfeitamente uniforme
  const maxFeasibleVariance = (K - idealAppearancesPerNumber) ** 2;
  const balanceRatio =
    maxFeasibleVariance > 0
      ? Math.max(0, 1.0 - Math.sqrt(meanSqDiff) / Math.max(1, idealAppearancesPerNumber))
      : 1.0;

  return {
    portfolioSize: K,
    matrix,
    appearancesPerNumber: appearances,
    exposureRates,
    uniqueNumbersCovered,
    uncoveredNumbers,
    overConcentratedNumbers,
    underRepresentedNumbers,
    coverageScore,
    exposureBalanceScore: Math.max(0, Math.min(1.0, balanceRatio)),
  };
}

/**
 * Filtra e seleciona jogos candidatos distribuindo dezenas ausentes/atrasadas
 * para evitar sobrecarga em um único jogo.
 */
export function distributeAbsentNumbersAcrossCandidates(
  absentNumbers: readonly number[],
  candidatePool: readonly { mask: number; numbers: number[]; score: number }[],
  targetPortfolioSize: number,
  maxAbsentPerGame = 2,
): number[] {
  if (absentNumbers.length === 0 || candidatePool.length === 0) {
    return candidatePool.slice(0, targetPortfolioSize).map((c) => c.mask);
  }

  const selectedMasks: number[] = [];
  const absentSet = new Set(absentNumbers);
  const absentAppearances = new Map<number, number>();
  for (const n of absentNumbers) absentAppearances.set(n, 0);

  // Ordena candidatos por pontuação inicial decrescente
  const sorted = [...candidatePool].sort((a, b) => b.score - a.score);

  for (const cand of sorted) {
    if (selectedMasks.length >= targetPortfolioSize) break;

    // Conta quantas ausentes este candidato contém
    const presentAbsent = cand.numbers.filter((n) => absentSet.has(n));

    // Se tiver mais dezenas ausentes do que a cota por jogo, descarta para promover dispersão
    if (presentAbsent.length > maxAbsentPerGame && selectedMasks.length < targetPortfolioSize - 1) {
      continue;
    }

    // Registra candidato e incrementa contagens
    selectedMasks.push(cand.mask);
    for (const n of presentAbsent) {
      absentAppearances.set(n, (absentAppearances.get(n) ?? 0) + 1);
    }
  }

  // Se faltarem jogos para completar a meta, preenche com os melhores restantes
  for (const cand of sorted) {
    if (selectedMasks.length >= targetPortfolioSize) break;
    if (!selectedMasks.includes(cand.mask)) {
      selectedMasks.push(cand.mask);
    }
  }

  return selectedMasks;
}
