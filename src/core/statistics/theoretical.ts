/**
 * Expectativas teóricas sob a hipótese de sorteio uniforme sem reposição — FATO MATEMÁTICO.
 *
 * Todas as variâncias usam amostragem SEM reposição (fator de população finita
 * (N−n)/(N−1) = 10/24). Nenhuma independência entre dezenas é assumida.
 */
import {
  CORE,
  EVENS,
  FIBONACCI,
  FRAME,
  GRID_SIZE,
  PICK_SIZE,
  PRIMES,
  UNIVERSE_SIZE,
} from '../domain/constants';
import { binomial } from './combinations';
import {
  type HypergeometricParams,
  hypergeometricMean,
  hypergeometricRange,
  hypergeometricVariance,
} from './hypergeometric';

export interface TheoreticalMoment {
  key: string;
  label: string;
  mean: number;
  variance: number;
  sd: number;
  method: string;
}

const N = UNIVERSE_SIZE;
const n = PICK_SIZE;
const FPC = (N - n) / (N - 1);

/** Parâmetros hipergeométricos para cada contagem estrutural. */
export const COUNT_PARAMS: Readonly<Record<string, HypergeometricParams>> = Object.freeze({
  even: { N, K: EVENS.length, n },
  prime: { N, K: PRIMES.length, n },
  fibonacci: { N, K: FIBONACCI.length, n },
  frame: { N, K: FRAME.length, n },
  core: { N, K: CORE.length, n },
  /** Repetição em relação a um sorteio anterior fixo: K = 15 dezenas "marcadas". */
  repeat: { N, K: PICK_SIZE, n },
});

/** Distribuição exata da soma: P(S = s), s ∈ [0, 325], por programação dinâmica. */
export function sumDistribution(): number[] {
  const maxSum = (N * (N + 1)) / 2;
  // ways[k][s] = nº de subconjuntos de tamanho k com soma s
  const ways: number[][] = Array.from({ length: n + 1 }, () => new Array<number>(maxSum + 1).fill(0));
  ways[0]![0] = 1;
  for (let v = 1; v <= N; v++) {
    for (let k = Math.min(v, n); k >= 1; k--) {
      const prev = ways[k - 1]!;
      const cur = ways[k]!;
      for (let s = maxSum; s >= v; s--) cur[s]! += prev[s - v]!;
    }
  }
  const total = binomial(N, n);
  return ways[n]!.map((w) => w / total);
}

/** Distribuição exata da amplitude R = max − min: #(R=r) = (25−r)·C(r−1, 13). */
export function rangeDistribution(): { r: number; probability: number }[] {
  const total = binomial(N, n);
  const out: { r: number; probability: number }[] = [];
  for (let r = n - 1; r <= N - 1; r++)
    out.push({ r, probability: ((N - r) * binomial(r - 1, n - 2)) / total });
  return out;
}

export interface GridTheory {
  entropyMean: number;
  entropyVariance: number;
  /** P(pelo menos uma linha vazia) — idêntico para colunas por simetria. */
  pAnyEmpty: number;
  /** P(pelo menos uma linha completa, 5 dezenas). */
  pAnyFull: number;
  /** P(uma linha específica vazia) = C(20,15)/C(25,15). */
  pSpecificEmpty: number;
  /** P(uma linha específica completa) = C(20,10)/C(25,15). */
  pSpecificFull: number;
}

/**
 * Enumeração exata das composições (r1..r5), 0 ≤ ri ≤ 5, Σri = 15, com peso ∏C(5,ri)
 * (hipergeométrica multivariada). Vale igualmente para linhas e colunas.
 */
export function gridTheory(): GridTheory {
  const total = binomial(N, n);
  let eH = 0;
  let eH2 = 0;
  let anyEmpty = 0;
  let anyFull = 0;
  const comp = new Array<number>(GRID_SIZE).fill(0);
  const rec = (i: number, remaining: number, weight: number) => {
    if (i === GRID_SIZE - 1) {
      if (remaining > GRID_SIZE) return;
      comp[i] = remaining;
      const w = weight * binomial(GRID_SIZE, remaining);
      let h = 0;
      for (const c of comp) if (c > 0) h -= (c / n) * Math.log2(c / n);
      eH += w * h;
      eH2 += w * h * h;
      if (comp.includes(0)) anyEmpty += w;
      if (comp.includes(GRID_SIZE)) anyFull += w;
      return;
    }
    for (let c = 0; c <= Math.min(GRID_SIZE, remaining); c++) {
      comp[i] = c;
      rec(i + 1, remaining - c, weight * binomial(GRID_SIZE, c));
    }
  };
  rec(0, n, 1);
  const mean = eH / total;
  return {
    entropyMean: mean,
    entropyVariance: eH2 / total - mean * mean,
    pAnyEmpty: anyEmpty / total,
    pAnyFull: anyFull / total,
    pSpecificEmpty: binomial(N - GRID_SIZE, n) / total,
    pSpecificFull: binomial(N - GRID_SIZE, n - GRID_SIZE) / total,
  };
}

let cachedMoments: TheoreticalMoment[] | null = null;

export function theoreticalMoments(): TheoreticalMoment[] {
  if (cachedMoments) return cachedMoments;
  const popVar = (N * N - 1) / 12; // variância da população 1..25 = 52
  const sumMean = (n * (N + 1)) / 2; // 15·13 = 195
  const sumVar = n * popVar * FPC; // 15·52·10/24 = 325
  const hg = (key: string, label: string): TheoreticalMoment => {
    const p = COUNT_PARAMS[key] as HypergeometricParams;
    const variance = hypergeometricVariance(p);
    return {
      key,
      label,
      mean: hypergeometricMean(p),
      variance,
      sd: Math.sqrt(variance),
      method: `Hipergeométrica N=${p.N}, K=${p.K}, n=${p.n}`,
    };
  };
  const rd = rangeDistribution();
  const rMean = rd.reduce((s, x) => s + x.r * x.probability, 0);
  const rVar = rd.reduce((s, x) => s + x.r * x.r * x.probability, 0) - rMean * rMean;
  const g = gridTheory();
  cachedMoments = [
    {
      key: 'sum',
      label: 'Soma das 15 dezenas',
      mean: sumMean,
      variance: sumVar,
      sd: Math.sqrt(sumVar),
      method: 'E=n(N+1)/2; Var=n·σ²·(N−n)/(N−1), σ²=(N²−1)/12',
    },
    hg('even', 'Pares'),
    hg('prime', 'Primos'),
    hg('fibonacci', 'Fibonacci'),
    hg('frame', 'Moldura'),
    hg('core', 'Miolo'),
    hg('repeat', 'Repetição do concurso anterior'),
    {
      key: 'range',
      label: 'Amplitude (máx − mín)',
      mean: rMean,
      variance: rVar,
      sd: Math.sqrt(rVar),
      method: '#(R=r)=(25−r)·C(r−1,13)',
    },
    {
      key: 'rowEntropy',
      label: 'Entropia das linhas (bits)',
      mean: g.entropyMean,
      variance: g.entropyVariance,
      sd: Math.sqrt(g.entropyVariance),
      method: 'Enumeração exata — hipergeométrica multivariada',
    },
    {
      key: 'colEntropy',
      label: 'Entropia das colunas (bits)',
      mean: g.entropyMean,
      variance: g.entropyVariance,
      sd: Math.sqrt(g.entropyVariance),
      method: 'Enumeração exata — hipergeométrica multivariada',
    },
  ];
  return cachedMoments;
}

/** Probabilidade teórica (uniforme) de uma contagem cair em [min, max]. */
export function theoreticalRangeProbability(key: string, min: number, max: number): number | null {
  if (key === 'sum') {
    const d = sumDistribution();
    let s = 0;
    for (let v = Math.max(0, min); v <= Math.min(max, d.length - 1); v++) s += d[v]!;
    return s;
  }
  const p = COUNT_PARAMS[key];
  return p ? hypergeometricRange(min, max, p) : null;
}
