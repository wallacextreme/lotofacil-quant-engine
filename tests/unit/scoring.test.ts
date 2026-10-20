import { describe, expect, it } from 'bun:test';
import { scoreSingleCombination, buildGameExplanation } from '../../src/core/combinatorial/scoring';
import { DEFAULT_WEIGHTS } from '../../src/core/domain/models';
import type { ScoreWeights } from '../../src/core/domain/types';

describe('Scoring Scale & Line Mode Unit Tests (ISSUE-02, ISSUE-07)', () => {
  // Combinação canônica com distribuição de linhas não equilibrada:
  // [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15] -> Linhas: 5, 5, 5, 0, 0 (linhas 1, 2 e 3 cheias, 4 e 5 vazias)
  // Máscara com bits 0 a 14 setados: 0x7FFF
  const unbalanceMask = (1 << 15) - 1; // 15 primeiros números (1 a 15)

  // Combinação com linhas equilibradas [3, 3, 3, 3, 3]:
  // 1,2,3 - 6,7,8 - 11,12,13 - 16,17,18 - 21,22,23
  const balancedNumbers = [1, 2, 3, 6, 7, 8, 11, 12, 13, 16, 17, 18, 21, 22, 23];
  let balancedMask = 0;
  for (const n of balancedNumbers) balancedMask |= 1 << (n - 1);

  it('guarantees all score breakdown components are normalized strictly in [0.0, 1.0] (ISSUE-02)', () => {
    const { breakdown } = scoreSingleCombination(balancedMask, null, DEFAULT_WEIGHTS, 'BALANCED');

    expect(breakdown.frequency).toBeGreaterThanOrEqual(0.0);
    expect(breakdown.frequency).toBeLessThanOrEqual(1.0);
    expect(breakdown.zScore).toBeGreaterThanOrEqual(0.0);
    expect(breakdown.zScore).toBeLessThanOrEqual(1.0);
    expect(breakdown.delay).toBeGreaterThanOrEqual(0.0);
    expect(breakdown.delay).toBeLessThanOrEqual(1.0);
    expect(breakdown.markov).toBeGreaterThanOrEqual(0.0);
    expect(breakdown.markov).toBeLessThanOrEqual(1.0);
    expect(breakdown.cooccurrence).toBeGreaterThanOrEqual(0.0);
    expect(breakdown.cooccurrence).toBeLessThanOrEqual(1.0);
    expect(breakdown.entropy).toBeGreaterThanOrEqual(0.0);
    expect(breakdown.entropy).toBeLessThanOrEqual(1.0);
    expect(breakdown.dispersion).toBeGreaterThanOrEqual(0.0);
    expect(breakdown.dispersion).toBeLessThanOrEqual(1.0);
    expect(breakdown.cycle).toBeGreaterThanOrEqual(0.0);
    expect(breakdown.cycle).toBeLessThanOrEqual(1.0);
    expect(breakdown.lineBalance).toBeGreaterThanOrEqual(0.0);
    expect(breakdown.lineBalance).toBeLessThanOrEqual(1.0);
    expect(breakdown.pairRelationship).toBeGreaterThanOrEqual(0.0);
    expect(breakdown.pairRelationship).toBeLessThanOrEqual(1.0);
    expect(breakdown.casadas).toBeGreaterThanOrEqual(0.0);
    expect(breakdown.casadas).toBeLessThanOrEqual(1.0);
    expect(breakdown.brigadas).toBeGreaterThanOrEqual(0.0);
    expect(breakdown.brigadas).toBeLessThanOrEqual(1.0);
  });

  it('verifies weight = 0 completely eliminates component influence and weight = 1 contributes proportionally', () => {
    // Pesos todos zero, exceto lineBalance
    const weightsZeroLine: ScoreWeights = {
      frequency: 0,
      zScore: 0,
      delay: 0,
      markov: 0,
      cooccurrence: 0,
      entropy: 0,
      dispersion: 0,
      coverage: 0,
      diversity: 0,
      cycle: 0,
      lineBalance: 0, // peso = 0
      pairRelationship: 0,
      casadas: 0,
      brigadas: 0,
      exposureBalance: 0,
    };

    const resZero = scoreSingleCombination(balancedMask, null, weightsZeroLine, 'BALANCED');
    expect(resZero.totalScore).toBe(0);

    // Agora peso = 1.0 para lineBalance
    const weightsOneLine: ScoreWeights = {
      ...weightsZeroLine,
      lineBalance: 1.0,
    };

    const resOne = scoreSingleCombination(balancedMask, null, weightsOneLine, 'BALANCED');
    expect(resOne.totalScore).toBe(resOne.breakdown.lineBalance!);
    expect(resOne.totalScore).toBeGreaterThan(0);
  });

  it('alters score computation when lineMode is varied (FREE vs BALANCED) (ISSUE-07)', () => {
    // Para a combinação desbalanceada [5, 5, 5, 0, 0]:
    // No modo FREE: não penaliza linhas 5,5,5,0,0
    const freeRes = scoreSingleCombination(unbalanceMask, null, DEFAULT_WEIGHTS, 'FREE');
    // No modo BALANCED: penaliza severamente linhas vazias / cheias fora de 2..4
    const balancedRes = scoreSingleCombination(unbalanceMask, null, DEFAULT_WEIGHTS, 'BALANCED');

    expect(freeRes.breakdown.lineBalance).toBe(1.0); // Modo FREE não penaliza
    expect(balancedRes.breakdown.lineBalance).toBeLessThan(0.3); // Modo BALANCED penaliza
    expect(freeRes.totalScore).toBeGreaterThan(balancedRes.totalScore);

    // buildGameExplanation também deve refletir o lineMode
    const explanationFree = buildGameExplanation(
      [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
      null,
      DEFAULT_WEIGHTS,
      'FREE',
    );
    expect(explanationFree.scoreContributions.Linhas).toBe(1.0);

    const explanationBalanced = buildGameExplanation(
      [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
      null,
      DEFAULT_WEIGHTS,
      'BALANCED',
    );
    expect(explanationBalanced.scoreContributions.Linhas).toBeLessThan(0.3);
  });
});
