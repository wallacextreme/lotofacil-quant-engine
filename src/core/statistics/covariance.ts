/**
 * Matriz de Covariância e Correlação dos Indicadores Binários de Presença.
 *
 * FUNDAMENTO MATEMÁTICO (§16):
 * Seja X_i ∈ {0, 1} a variável indicadora da presença da dezena i num concurso sorteado.
 *
 * Propriedades Teóricas (amostragem uniforme de n=15 sem reposição de N=25):
 * 1. Média: E[X_i] = 15 / 25 = 0,60
 * 2. Variância: Var(X_i) = p * (1 - p) = 0,60 * 0,40 = 0,24
 * 3. Covariância teórica para i ≠ j:
 *      Cov(X_i, X_j) = E[X_i X_j] - E[X_i] E[X_j]
 *                    = (15/25 * 14/24) - (0,60)²
 *                    = 0,35 - 0,36 = -0,01
 * 4. Correlação teórica para i ≠ j:
 *      Corr(X_i, X_j) = -0,01 / 0,24 = -1 / 24 ≈ -0,0416667
 *
 * RESTRIÇÃO ESTRUTURAL INDISCUTÍVEL:
 * Como a soma total de dezenas por concurso é fixada em 15 (∑_{i=1}^{25} X_i = 15):
 *   Var(∑ X_i) = Var(15) = 0
 *   ∑_{i=1}^{25} Var(X_i) + ∑_{i ≠ j} Cov(X_i, X_j) = 25 * 0,24 + 25 * 24 * (-0,01) = 6,0 - 6,0 = 0!
 *
 * Portanto, a correlação média negativa entre dezenas é uma DEPENDÊNCIA ESTRUTURAL
 * OBRIGATÓRIA da regra do jogo, e NÃO uma "atração/repulsão mágica" entre dezenas.
 *
 * Este módulo não substitui covariância por coocorrência.
 */
import { PICK_SIZE, UNIVERSE_SIZE } from '../domain/constants';
import type { Contest } from '../domain/types';

export const THEORETICAL_VARIANCE = 0.24;
export const THEORETICAL_COVARIANCE = -0.01;
export const THEORETICAL_CORRELATION = -1 / (UNIVERSE_SIZE - 1); // -1/24 ≈ -0.041667

export interface CovarianceCell {
  numA: number;
  numB: number;
  sampleCovariance: number;
  sampleCorrelation: number;
  theoreticalCovariance: number;
  theoreticalCorrelation: number;
  deviationFromTheoreticalCov: number;
}

export interface CovarianceAnalysis {
  totalContests: number;
  theoreticalMean: number;
  theoreticalVariance: number;
  theoreticalCovariance: number;
  theoreticalCorrelation: number;
  /** Médias amostrais X̄_i para cada dezena i=1..25 */
  means: number[];
  /** Variâncias amostrais s_i² para cada dezena */
  variances: number[];
  /** Matriz de covariância amostral 25×25 */
  covarianceMatrix: number[][];
  /** Matriz de correlação amostral 25×25 */
  correlationMatrix: number[][];
  /** Pares com maior correlação positiva (acima da esperada) */
  highestCorrelations: CovarianceCell[];
  /** Pares com maior correlação negativa (abaixo da esperada) */
  lowestCorrelations: CovarianceCell[];
}

export function computeCovariance(contests: readonly Contest[], topK = 15): CovarianceAnalysis {
  const T = contests.length;
  const p0 = PICK_SIZE / UNIVERSE_SIZE;

  const means = new Array<number>(UNIVERSE_SIZE).fill(0);
  const variances = new Array<number>(UNIVERSE_SIZE).fill(0);

  const covMatrix: number[][] = Array.from({ length: UNIVERSE_SIZE }, () =>
    new Array<number>(UNIVERSE_SIZE).fill(0),
  );
  const corrMatrix: number[][] = Array.from({ length: UNIVERSE_SIZE }, () =>
    new Array<number>(UNIVERSE_SIZE).fill(0),
  );

  if (T < 2) {
    return {
      totalContests: T,
      theoreticalMean: p0,
      theoreticalVariance: THEORETICAL_VARIANCE,
      theoreticalCovariance: THEORETICAL_COVARIANCE,
      theoreticalCorrelation: THEORETICAL_CORRELATION,
      means,
      variances,
      covarianceMatrix: covMatrix,
      correlationMatrix: corrMatrix,
      highestCorrelations: [],
      lowestCorrelations: [],
    };
  }

  // Máscaras de presença
  const masks = new Uint32Array(T);
  const counts = new Array<number>(UNIVERSE_SIZE).fill(0);

  for (let t = 0; t < T; t++) {
    let m = 0;
    for (const num of contests[t]!.numbers) {
      if (num >= 1 && num <= UNIVERSE_SIZE) {
        m |= 1 << (num - 1);
        counts[num - 1]!++;
      }
    }
    masks[t] = m;
  }

  for (let i = 0; i < UNIVERSE_SIZE; i++) {
    means[i] = counts[i]! / T;
  }

  // Covariância amostral: Cov(X_i, X_j) = [∑ (X_i * X_j) - T * X̄_i * X̄_j] / (T - 1)
  const cells: CovarianceCell[] = [];

  for (let i = 0; i < UNIVERSE_SIZE; i++) {
    const bitI = 1 << i;
    const meanI = means[i]!;

    for (let j = i; j < UNIVERSE_SIZE; j++) {
      const bitJ = 1 << j;
      const meanJ = means[j]!;

      let coCount = 0;
      if (i === j) {
        coCount = counts[i]!;
      } else {
        const pairMask = bitI | bitJ;
        for (let t = 0; t < T; t++) {
          if ((masks[t]! & pairMask) === pairMask) {
            coCount++;
          }
        }
      }

      // Covariância amostral não-viesada (denominador T - 1)
      const cov = (coCount - T * meanI * meanJ) / (T - 1);
      covMatrix[i]![j] = cov;
      covMatrix[j]![i] = cov;

      if (i === j) {
        variances[i] = cov;
      }
    }
  }

  // Matriz de correlação e células para ranking
  for (let i = 0; i < UNIVERSE_SIZE; i++) {
    const sI = Math.sqrt(Math.max(0, variances[i]!));
    for (let j = i; j < UNIVERSE_SIZE; j++) {
      const sJ = Math.sqrt(Math.max(0, variances[j]!));
      const cov = covMatrix[i]![j]!;

      let r = 0;
      if (i === j) {
        r = 1.0;
      } else if (sI > 0 && sJ > 0) {
        r = cov / (sI * sJ);
      }

      corrMatrix[i]![j] = r;
      corrMatrix[j]![i] = r;

      if (i !== j) {
        cells.push({
          numA: i + 1,
          numB: j + 1,
          sampleCovariance: cov,
          sampleCorrelation: r,
          theoreticalCovariance: THEORETICAL_COVARIANCE,
          theoreticalCorrelation: THEORETICAL_CORRELATION,
          deviationFromTheoreticalCov: cov - THEORETICAL_COVARIANCE,
        });
      }
    }
  }

  const highestCorrelations = [...cells]
    .sort((a, b) => b.sampleCorrelation - a.sampleCorrelation)
    .slice(0, topK);

  const lowestCorrelations = [...cells]
    .sort((a, b) => a.sampleCorrelation - b.sampleCorrelation)
    .slice(0, topK);

  return {
    totalContests: T,
    theoreticalMean: p0,
    theoreticalVariance: THEORETICAL_VARIANCE,
    theoreticalCovariance: THEORETICAL_COVARIANCE,
    theoreticalCorrelation: THEORETICAL_CORRELATION,
    means,
    variances,
    covarianceMatrix: covMatrix,
    correlationMatrix: corrMatrix,
    highestCorrelations,
    lowestCorrelations,
  };
}
