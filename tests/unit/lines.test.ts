import { describe, expect, it } from 'bun:test';
import { extractLineVector, analyzeLineDistribution } from '../../src/core/statistics/lines';
import { scoreCombinationLines } from '../../src/core/combinatorial/lineScorer';
import type { Contest } from '../../src/core/domain/types';

describe('LineDistributionAnalyzer & LineScorer Unit Tests (§2, §3, §4)', () => {
  it('correctly maps 15 numbers to 5 Cartesian lines and vector string', () => {
    // 3 em cada linha: 01,02,03 | 06,07,08 | 11,12,13 | 16,17,18 | 21,22,23
    const numbers = [1, 2, 3, 6, 7, 8, 11, 12, 13, 16, 17, 18, 21, 22, 23];
    const vec = extractLineVector(numbers);

    expect(vec.l1).toBe(3);
    expect(vec.l2).toBe(3);
    expect(vec.l3).toBe(3);
    expect(vec.l4).toBe(3);
    expect(vec.l5).toBe(3);
    expect(vec.pattern).toBe('3-3-3-3-3');
  });

  it('validates BALANCED constraint (each line in [2, 4])', () => {
    // 3-3-3-3-3 is balanced
    const balanced1 = scoreCombinationLines(
      [1, 2, 3, 6, 7, 8, 11, 12, 13, 16, 17, 18, 21, 22, 23],
      'BALANCED',
    );
    expect(balanced1.isBalanced).toBe(true);
    expect(balanced1.score).toBeGreaterThan(0.8);

    // 2-3-3-3-4 is balanced
    const balanced2 = scoreCombinationLines(
      [1, 2, 6, 7, 8, 11, 12, 13, 16, 17, 18, 21, 22, 23, 24],
      'BALANCED',
    );
    expect(balanced2.isBalanced).toBe(true);

    // 5-2-3-3-2 is NOT balanced (Line 1 has 5 numbers)
    const unbalanced = scoreCombinationLines(
      [1, 2, 3, 4, 5, 6, 7, 11, 12, 13, 16, 17, 18, 21, 22],
      'BALANCED',
    );
    expect(unbalanced.isBalanced).toBe(false);
    expect(unbalanced.score).toBeLessThan(0.5);
  });

  it('computes temporal movements, Manhattan distance and pattern repetitions', () => {
    const c1: Contest = {
      contest: 1,
      date: '2024-01-01',
      numbers: [1, 2, 3, 6, 7, 8, 11, 12, 13, 16, 17, 18, 21, 22, 23], // 3-3-3-3-3
    };
    const c2: Contest = {
      contest: 2,
      date: '2024-01-02',
      numbers: [1, 2, 3, 6, 7, 8, 11, 12, 13, 16, 17, 18, 21, 22, 23], // 3-3-3-3-3 (repete!)
    };
    const c3: Contest = {
      contest: 3,
      date: '2024-01-03',
      numbers: [1, 2, 6, 7, 8, 11, 12, 13, 16, 17, 18, 21, 22, 23, 24], // 2-3-3-3-4
    };

    const res = analyzeLineDistribution([c1, c2, c3]);
    expect(res.totalContests).toBe(3);
    expect(res.patterns.length).toBe(2); // 3-3-3-3-3 (2x) e 2-3-3-3-4 (1x)
    expect(res.patterns[0]!.pattern).toBe('3-3-3-3-3');
    expect(res.patterns[0]!.occurrenceCount).toBe(2);

    expect(res.movements.length).toBe(3); // c1 (base), c2, c3
    expect(res.movements[1]!.isPatternRepeated).toBe(true);
    expect(res.movements[1]!.manhattanDistance).toBe(0);

    // c3 vs c2: |2-3| + |3-3| + |3-3| + |3-3| + |4-3| = 1 + 0 + 0 + 0 + 1 = 2
    expect(res.movements[2]!.isPatternRepeated).toBe(false);
    expect(res.movements[2]!.manhattanDistance).toBe(2);
  });
});
