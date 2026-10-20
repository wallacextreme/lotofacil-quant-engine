import { describe, expect, it } from 'bun:test';
import {
  binomial,
  SAMPLE_SPACE,
  SINGLE_COMBINATION_PROBABILITY,
} from '../../src/core/statistics/combinations';
import {
  hypergeometricMean,
  hypergeometricPmf,
  hypergeometricVariance,
} from '../../src/core/statistics/hypergeometric';
import { computeChiSquare } from '../../src/core/statistics/chiSquare';
import { computeZScores } from '../../src/core/statistics/zscore';
import { computeDelays } from '../../src/core/statistics/delays';
import { computeMarkov } from '../../src/core/statistics/markov';
import { computeCooccurrence, THEORETICAL_PAIR_BASELINE } from '../../src/core/statistics/cooccurrence';
import { computeCovariance, THEORETICAL_COVARIANCE } from '../../src/core/statistics/covariance';
import { theoreticalMoments } from '../../src/core/statistics/theoretical';
import { readFileSync } from 'node:fs';
import { parseHistoryFile } from '../../src/core/data/parser';

describe('Scientific Engine Unit & Reference Tests', () => {
  it('computes exact C(25,15) and single combination probability', () => {
    expect(SAMPLE_SPACE).toBe(3268760);
    expect(binomial(25, 15)).toBe(3268760);
    expect(SINGLE_COMBINATION_PROBABILITY).toBeCloseTo(1 / 3268760, 12);
    expect(hypergeometricPmf(15, { N: 25, K: 15, n: 15 })).toBeCloseTo(1 / 3268760, 12);
  });

  it('computes hypergeometric moments correctly with finite population correction', () => {
    // Primes: N=25, K=9, n=15
    const meanPrimes = hypergeometricMean({ N: 25, K: 9, n: 15 });
    expect(meanPrimes).toBeCloseTo(5.4, 6);

    const varPrimes = hypergeometricVariance({ N: 25, K: 9, n: 15 });
    // Var = 15 * (9/25) * (16/25) * (10/24) = 1.44
    expect(varPrimes).toBeCloseTo(1.44, 6);

    // Evens: N=25, K=12, n=15
    const meanEvens = hypergeometricMean({ N: 25, K: 12, n: 15 });
    expect(meanEvens).toBeCloseTo(7.2, 6);

    // Repetition from previous draw: N=25, K=15, n=15
    const meanRepeat = hypergeometricMean({ N: 25, K: 15, n: 15 });
    expect(meanRepeat).toBeCloseTo(9.0, 6);
  });

  it('computes theoretical moments without independence assumptions', () => {
    const moments = theoreticalMoments();
    const sumMom = moments.find((m) => m.key === 'sum')!;
    expect(sumMom.mean).toBe(195);
    // Var(sum) = 325, SD = sqrt(325) ≈ 18.027756377
    expect(sumMom.variance).toBe(325);
    expect(sumMom.sd).toBeCloseTo(18.027756, 5);
  });

  it('validates against real 3795 draws dataset fixture', () => {
    const bytes = new Uint8Array(readFileSync('tests/fixtures/lotofacil_3795.xlsx'));
    const { contests, report } = parseHistoryFile(bytes, 'Lotofácil.xlsx');
    expect(report.validRows).toBe(3795);
    expect(report.invalidRows).toBe(0);

    // Chi-Square Test
    const chi = computeChiSquare(contests);
    // Pearson statistic in previous audit report: 23.819939
    expect(chi.statistic).toBeCloseTo(23.819939, 4);
    expect(chi.df).toBe(24);
    expect(chi.pearsonPValue).toBeCloseTo(0.471932, 4);

    // Adjusted statistic = 23.819939 * 2.4 = 57.16785
    expect(chi.adjustedStatistic).toBeCloseTo(23.819939 * 2.4, 3);
    expect(chi.pValue).toBeLessThan(0.001); // True adjusted p-value with sampling without replacement

    // Z-scores
    const z = computeZScores(contests, 30, 1.0, -1.0);
    expect(z.counts.hot).toBe(5);
    expect(z.counts.neutral).toBe(15);
    expect(z.counts.cold).toBe(5);
    // Hot numbers in contest 3795: 3, 8, 15, 23, 24
    expect(z.hotNumbers).toEqual([3, 8, 15, 23, 24]);
    // Cold numbers: 2, 9, 10, 20, 22
    expect(z.coldNumbers).toEqual([2, 9, 10, 20, 22]);

    // Delays
    const delays = computeDelays(contests);
    const d1 = delays.delays.find((d) => d.number === 1)!;
    expect(d1.currentDelay).toBe(0);
    expect(d1.occurrences).toBe(2302);
    expect(d1.maxDelay).toBe(7);
    expect(d1.geometricTailProb).toBeCloseTo(0.4 ** 0, 6);
    expect(d1.surpriseBits).toBeCloseTo(0, 6);

    // Test a non-zero delay
    const dNonZero = delays.delays.find((d) => d.currentDelay > 0)!;
    expect(dNonZero.geometricTailProb).toBeCloseTo(0.4 ** dNonZero.currentDelay, 6);
    expect(dNonZero.surpriseBits).toBeCloseTo(dNonZero.currentDelay * Math.log2(2.5), 6);

    // Cooccurrence
    const cooc = computeCooccurrence(contests);
    expect(cooc.pairBaseline).toBe(THEORETICAL_PAIR_BASELINE);
    expect(cooc.pairs.length).toBe(300);

    // Covariance
    const cov = computeCovariance(contests);
    expect(cov.theoreticalCovariance).toBe(THEORETICAL_COVARIANCE);

    // Markov
    const markov = computeMarkov(contests);
    expect(markov.transitionsCount).toBe(3794);
    expect(markov.selfTransitions.length).toBe(25);
    expect(markov.smoothedPresenceTransition.length).toBe(25);
    expect(markov.smoothedPresenceTransition[0]!.length).toBe(25);
    expect(markov.shrinkageKappa).toBe(50);
  });

  it('validates chi-square small sample behavior (T < 30)', () => {
    const dummyContests = Array.from({ length: 20 }, (_, i) => ({
      contest: i + 1,
      date: '2024-01-01',
      numbers: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
    }));
    const chiSmall = computeChiSquare(dummyContests);
    expect(chiSmall.isSmallSample).toBe(true);
    expect(chiSmall.conclusion).toContain('Amostra pequena');
  });
});
