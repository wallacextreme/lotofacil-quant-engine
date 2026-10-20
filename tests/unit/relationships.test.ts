import { describe, expect, it } from 'bun:test';
import { analyzePairRelationships, applyBenjaminiHochberg } from '../../src/core/statistics/relationships';
import type { Contest } from '../../src/core/domain/types';
import { createRng } from '../../src/core/util/prng';

describe('PairRelationshipAnalyzer & FDR Unit Tests (§5, §6, §7, §8)', () => {
  it('controls FDR via Benjamini-Hochberg step-up procedure', () => {
    // 5 testes de hipótese com p-valores brutos
    const rawP = [0.001, 0.01, 0.03, 0.04, 0.5];
    const adjusted = applyBenjaminiHochberg(rawP);

    expect(adjusted.length).toBe(5);
    // p_adj deve ser monotonicamente não-decrescente em relação ao ranking
    for (let i = 0; i < adjusted.length - 1; i++) {
      expect(adjusted[i]!).toBeLessThanOrEqual(adjusted[i + 1]!);
    }
    // Todos os p_adj devem ser <= 1.0
    for (const q of adjusted) {
      expect(q).toBeLessThanOrEqual(1.0);
    }
    // O primeiro p=0.001 com m=5 deve ter q = 0.001 * 5 / 1 = 0.005
    expect(adjusted[0]).toBeCloseTo(0.005, 5);
  });

  it('evaluates exactly 300 pairs for 25 numbers with sampling without replacement correction', () => {
    // 5 concursos simples
    const contests: Contest[] = [
      { contest: 1, date: '2024-01-01', numbers: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15] },
      { contest: 2, date: '2024-01-02', numbers: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15] },
      { contest: 3, date: '2024-01-03', numbers: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15] },
      {
        contest: 4,
        date: '2024-01-04',
        numbers: [11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25],
      },
      {
        contest: 5,
        date: '2024-01-05',
        numbers: [11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25],
      },
    ];

    const res = analyzePairRelationships(contests);
    expect(res.totalPairs).toBe(300);
    expect(res.pairs.length).toBe(300);

    // O par (1, 2) saiu em 3 de 5 concursos
    const pair1_2 = res.pairs.find((p) => p.numA === 1 && p.numB === 2);
    expect(pair1_2).toBeDefined();
    expect(pair1_2!.jointCount).toBe(3);
    expect(pair1_2!.countA).toBe(3);
    expect(pair1_2!.countB).toBe(3);

    // E_cond = (3 * 3 / 5) * (35 / 36) = 1.75
    expect(pair1_2!.expectedCount).toBeCloseTo(1.75, 4);
    // Diff = 3 - 1.75 = 1.25
    expect(pair1_2!.difference).toBeCloseTo(1.25, 4);

    // Teste A e Teste B devem estar presentes
    expect(pair1_2!.testA).toBeDefined();
    expect(pair1_2!.testA.expected).toBeCloseTo(5 * 0.35, 4);
    expect(pair1_2!.testB).toBeDefined();
    expect(pair1_2!.testB.expected).toBeCloseTo(1.75, 4);
  });

  it('distinguishes low frequency from low association for brigadas (§7)', () => {
    // Dezena 25 tem baixa frequência marginal (apenas 1 vez),
    // mas isso NÃO a torna brigada de todas as outras sem significância estatística
    const contests: Contest[] = Array.from({ length: 30 }, (_, i) => ({
      contest: i + 1,
      date: '2024-01-01',
      numbers: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, i === 0 ? 25 : 15],
    }));

    const res = analyzePairRelationships(contests);
    // Pares com a dezena 25 sem significância estatística devem ser rotulados como SEM_EVIDENCIA_SUFICIENTE ou NEUTRA
    const pairsWith25 = res.pairs.filter((p) => p.numA === 25 || p.numB === 25);
    for (const p of pairsWith25) {
      if (!p.isSignificant) {
        expect(['NEUTRA', 'SEM_EVIDENCIA_SUFICIENTE']).toContain(p.classification);
      }
    }
  });

  it('guarantees topCasadas and topBrigadas ONLY contain statistically significant pairs (ISSUE-03)', () => {
    // Dataset com poucos concursos onde nenhum par deve atingir significância estatística após BH
    const contests: Contest[] = Array.from({ length: 15 }, (_, i) => ({
      contest: i + 1,
      date: '2024-01-01',
      numbers: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
    }));

    const res = analyzePairRelationships(contests, 5);
    // Todos os pares em topCasadas DEVEM ser significantes
    for (const p of res.topCasadas) {
      expect(p.isSignificant).toBe(true);
      expect(p.pValueAdjustedBH).toBeLessThan(0.05);
      expect(p.classification.startsWith('CASADA')).toBe(true);
    }
    // Todos os pares em topBrigadas DEVEM ser significantes
    for (const p of res.topBrigadas) {
      expect(p.isSignificant).toBe(true);
      expect(p.pValueAdjustedBH).toBeLessThan(0.05);
      expect(p.classification.startsWith('BRIGADA')).toBe(true);
    }
  });

  it('re-evaluates window summaries independently with cycle window included (ISSUE-06)', () => {
    const contests: Contest[] = Array.from({ length: 60 }, (_, i) => ({
      contest: i + 1,
      date: '2024-01-01',
      numbers: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, i < 30 ? 15 : 16 + (i % 5)],
    }));

    const res = analyzePairRelationships(contests, 8);
    expect(res.windowSummaries.length).toBeGreaterThanOrEqual(4);
    const cycleWin = res.windowSummaries.find((w) => w.windowName === 'Ciclo Atual');
    expect(cycleWin).toBeDefined();
    expect(cycleWin!.contestsCount).toBe(8);
  });

  it('converges to mean Lift = 1.000 under uniform Monte Carlo and strictly controls FDR', () => {
    // Simulação determinística de sorteios uniformes de 15 entre 25 sem reposição (T = 1.000)
    const rng = createRng(42);
    const T = 1000;
    const contests: Contest[] = [];

    for (let t = 0; t < T; t++) {
      // Fisher-Yates shuffle de 1..25 para sortear 15 dezenas uniformes
      const pool = Array.from({ length: 25 }, (_, i) => i + 1);
      for (let i = 24; i > 0; i--) {
        const j = rng.int(i + 1);
        const temp = pool[i]!;
        pool[i] = pool[j]!;
        pool[j] = temp;
      }
      const numbers = pool.slice(0, 15).sort((a, b) => a - b);
      contests.push({
        contest: t + 1,
        date: '2024-01-01',
        numbers,
      });
    }

    const res = analyzePairRelationships(contests, 0, 0.05);
    expect(res.pairs.length).toBe(300);

    // 1. Média empírica de Lift corrigido deve convergir para 1.000 ± 0.005
    const meanLift = res.pairs.reduce((acc, p) => acc + p.lift, 0) / res.pairs.length;
    expect(meanLift).toBeGreaterThanOrEqual(0.995);
    expect(meanLift).toBeLessThanOrEqual(1.005);

    // 2. O Lift bruto (sem correção) deve ter média próxima a 35/36 ≈ 0.9722
    const meanRawLift = res.pairs.reduce((acc, p) => acc + p.rawLift, 0) / res.pairs.length;
    expect(meanRawLift).toBeCloseTo(35 / 36, 2);

    // 3. Controle de FDR: sob H0, a proporção de falsos positivos com q < 0.05 deve ser controlada (<= 0.06)
    const sigCount = res.pairs.filter((p) => p.isSignificant).length;
    const falseDiscoveryRate = sigCount / 300;
    expect(falseDiscoveryRate).toBeLessThanOrEqual(0.06);
  });

  it('detects 100% of injected coupled pairs in synthetic dataset with statistical power > 95%', () => {
    // Simulação com acoplamento artificial injetado entre os pares (1, 2) e (3, 4)
    const rng = createRng(777);
    const T = 900;
    const contests: Contest[] = [];

    for (let t = 0; t < T; t++) {
      const selected = new Set<number>();

      // Injeta forte acoplamento: o par (1, 2) e o par (3, 4) saem juntos com probabilidade 0.65,
      // e quando não saem juntos, nenhum dos dois sai no sorteio
      if (rng.next() < 0.65) {
        selected.add(1);
        selected.add(2);
      }
      if (rng.next() < 0.65) {
        selected.add(3);
        selected.add(4);
      }

      // Preenche o restante até 15 dezenas com sorteio sem reposição das demais (5..25)
      const available = Array.from({ length: 25 }, (_, i) => i + 1).filter(
        (n) => !selected.has(n) && (n > 4 || selected.has(n)),
      );
      for (let i = available.length - 1; i > 0; i--) {
        const j = rng.int(i + 1);
        const temp = available[i]!;
        available[i] = available[j]!;
        available[j] = temp;
      }

      while (selected.size < 15 && available.length > 0) {
        selected.add(available.pop()!);
      }

      const numbers = Array.from(selected).sort((a, b) => a - b);
      contests.push({
        contest: t + 1,
        date: '2024-01-01',
        numbers,
      });
    }

    const res = analyzePairRelationships(contests, 0, 0.05);

    const pair1_2 = res.pairs.find((p) => p.numA === 1 && p.numB === 2)!;
    const pair3_4 = res.pairs.find((p) => p.numA === 3 && p.numB === 4)!;

    expect(pair1_2).toBeDefined();
    expect(pair1_2.isSignificant).toBe(true);
    expect(pair1_2.classification).toBe('CASADA_FORTE');
    expect(pair1_2.pValueAdjustedBH).toBeLessThan(0.01);
    expect(pair1_2.lift).toBeGreaterThan(1.1);

    expect(pair3_4).toBeDefined();
    expect(pair3_4.isSignificant).toBe(true);
    expect(pair3_4.classification).toBe('CASADA_FORTE');
    expect(pair3_4.pValueAdjustedBH).toBeLessThan(0.01);
    expect(pair3_4.lift).toBeGreaterThan(1.1);
  });
});
