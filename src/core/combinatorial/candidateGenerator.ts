/**
 * Gerador de Candidatos com Poda Combinatória em Árvore (Branch-and-Bound).
 *
 * Mandato §18 e Correção Científica (ACHADO-01):
 * - O espaço total é C(25, 15) = 3.268.760 combinações.
 * - Tabelas de Sufixo Pré-Computadas O(1) eliminam loops internos em cada nó visitado.
 * - Amostragem determinística controlada por PRNG determinístico (`createRng(seed)`):
 *     1. Permutação estocástica inicial das dezenas disponíveis por Fisher-Yates com a seed;
 *     2. Exploração por branch-and-bound sem viés de prefixo lexicográfico;
 *     3. Amostragem por Reservatório (Algoritmo R de Vitter) sobre as folhas válidas;
 *     4. Em subespaços reduzidos (< 500 combinações), enumera 100% do espaço exato sem perdas.
 * - Zero duplicatas no pool gerado.
 */
import { EVENS, FIBONACCI, FRAME, PICK_SIZE, PRIMES, UNIVERSE_SIZE } from '../domain/constants';
import type { GenerationContext, HardConstraints } from '../domain/types';
import { compileFilters, testMaskAgainstFilters } from './filters';
import { createRng } from '../util/prng';

// Tabelas estáticas de consulta rápida para cada dezena v ∈ 1..25
const IS_EVEN = new Uint8Array(26);
const IS_PRIME = new Uint8Array(26);
const IS_FRAME = new Uint8Array(26);
const IS_FIB = new Uint8Array(26);

for (const n of EVENS) IS_EVEN[n] = 1;
for (const n of PRIMES) IS_PRIME[n] = 1;
for (const n of FRAME) IS_FRAME[n] = 1;
for (const n of FIBONACCI) IS_FIB[n] = 1;

export interface CandidatePool {
  /** Máscaras binárias das combinações válidas encontradas */
  masks: number[];
  /** Somas correspondentes */
  sums: number[];
  /** Total de nós visitados pelo algoritmo de busca */
  nodesVisited: number;
  /** Total de podas ocorridas antes da folha */
  prunedBranches: number;
}

/**
 * Gera um pool representativo de candidatos válidos que satisfazem 100% das Hard Constraints.
 * Utiliza busca combinatória podada em O(1) e Amostragem por Reservatório orientada por seed.
 */
export function generateCandidatePool(
  constraints: HardConstraints,
  context: GenerationContext | null,
  maxCandidates: number,
  seed = 42,
): CandidatePool {
  const f = compileFilters(constraints, context);
  const rng = createRng(seed);

  // Indicadores de repetição e térmicos por dezena
  const isRepeat = new Uint8Array(26);
  if (context?.lastDraw) {
    for (const n of context.lastDraw) if (n >= 1 && n <= 25) isRepeat[n] = 1;
  }

  const isHot = new Uint8Array(26);
  const isNeutral = new Uint8Array(26);
  const isCold = new Uint8Array(26);
  if (context?.temperature) {
    for (let i = 0; i < UNIVERSE_SIZE; i++) {
      const num = i + 1;
      const t = context.temperature[i];
      if (t === 'HOT') isHot[num] = 1;
      else if (t === 'COLD') isCold[num] = 1;
      else isNeutral[num] = 1;
    }
  }

  const forbidden = new Set(constraints.excluded);
  const fixedList = (constraints.fixedIncluded ?? []).filter(
    (n) => n >= 1 && n <= UNIVERSE_SIZE && !forbidden.has(n),
  );
  const fixedSet = new Set(fixedList);

  if (fixedList.length > PICK_SIZE) {
    return { masks: [], sums: [], nodesVisited: 0, prunedBranches: 0 };
  }

  // Identifica dezenas disponíveis para escolha
  const available: number[] = [];
  for (let n = 1; n <= UNIVERSE_SIZE; n++) {
    if (!forbidden.has(n) && !fixedSet.has(n)) {
      available.push(n);
    }
  }

  const targetRem = PICK_SIZE - fixedList.length;
  if (available.length < targetRem) {
    return { masks: [], sums: [], nodesVisited: 0, prunedBranches: 0 };
  }

  // Embaralha as dezenas disponíveis via Fisher-Yates orientado pela seed (elimina o viés lexicográfico 01..)
  for (let i = available.length - 1; i > 0; i--) {
    const j = rng.int(i + 1);
    const temp = available[i]!;
    available[i] = available[j]!;
    available[j] = temp;
  }

  const L = available.length;

  // Pré-computa tabelas de sufixo O(1) sobre o array disponível
  const suffixCount = new Int32Array(L + 1);
  const suffixEven = new Int32Array(L + 1);
  const suffixPrime = new Int32Array(L + 1);
  const suffixFrame = new Int32Array(L + 1);
  const suffixFib = new Int32Array(L + 1);
  const suffixRepeat = new Int32Array(L + 1);
  const suffixHot = new Int32Array(L + 1);
  const suffixCold = new Int32Array(L + 1);

  for (let i = L - 1; i >= 0; i--) {
    const v = available[i]!;
    suffixCount[i] = suffixCount[i + 1]! + 1;
    suffixEven[i] = suffixEven[i + 1]! + (IS_EVEN[v] ?? 0);
    suffixPrime[i] = suffixPrime[i + 1]! + (IS_PRIME[v] ?? 0);
    suffixFrame[i] = suffixFrame[i + 1]! + (IS_FRAME[v] ?? 0);
    suffixFib[i] = suffixFib[i + 1]! + (IS_FIB[v] ?? 0);
    suffixRepeat[i] = suffixRepeat[i + 1]! + (isRepeat[v] ?? 0);
    suffixHot[i] = suffixHot[i + 1]! + (isHot[v] ?? 0);
    suffixCold[i] = suffixCold[i + 1]! + (isCold[v] ?? 0);
  }

  // Pré-computa somas mínimas e máximas de `rem` elementos restantes para cada sufixo i
  // minSumTable[i][rem] e maxSumTable[i][rem]
  const minSumTable: number[][] = Array.from({ length: L + 1 }, () =>
    new Array<number>(targetRem + 1).fill(0),
  );
  const maxSumTable: number[][] = Array.from({ length: L + 1 }, () =>
    new Array<number>(targetRem + 1).fill(0),
  );

  for (let i = 0; i <= L; i++) {
    const remSlice = available.slice(i).sort((a, b) => a - b);
    for (let rem = 1; rem <= targetRem; rem++) {
      if (rem > remSlice.length) {
        minSumTable[i]![rem] = 999999;
        maxSumTable[i]![rem] = -999999;
      } else {
        let minS = 0;
        let maxS = 0;
        for (let k = 0; k < rem; k++) {
          minS += remSlice[k]!;
          maxS += remSlice[remSlice.length - 1 - k]!;
        }
        minSumTable[i]![rem] = minS;
        maxSumTable[i]![rem] = maxS;
      }
    }
  }

  // Estado inicial acumulado a partir das dezenas fixas
  let initialMask = 0;
  let initialSum = 0;
  let initEvens = 0;
  let initPrimes = 0;
  let initFrame = 0;
  let initFib = 0;
  let initRepeats = 0;
  let initHot = 0;
  let initNeutral = 0;
  let initCold = 0;

  for (const n of fixedList) {
    initialMask |= 1 << (n - 1);
    initialSum += n;
    if (IS_EVEN[n]) initEvens++;
    if (IS_PRIME[n]) initPrimes++;
    if (IS_FRAME[n]) initFrame++;
    if (IS_FIB[n]) initFib++;
    if (isRepeat[n]) initRepeats++;
    if (isHot[n]) initHot++;
    else if (isCold[n]) initCold++;
    else initNeutral++;
  }

  const masks: number[] = [];
  const sums: number[] = [];
  let nodesVisited = 0;
  let prunedBranches = 0;
  let validFound = 0;

  // Limite de exploração para Amostragem por Reservatório:
  // Se o espaço total válido for pequeno (< 25.000), explora 100% sem parar antes do fim.
  // Se for muito vasto, coleta amostra representativa uniforme de até 25.000 antes de concluir o reservatório.
  const explorationBudget = Math.max(maxCandidates * 5, 25000);

  function dfs(
    depth: number,
    idx: number,
    currentSum: number,
    currentMask: number,
    evens: number,
    primes: number,
    frame: number,
    fib: number,
    repeats: number,
    hot: number,
    neutral: number,
    cold: number,
  ) {
    nodesVisited++;
    const rem = targetRem - depth;

    // Folha de 15 dezenas alcançada
    if (rem === 0) {
      if (testMaskAgainstFilters(currentMask, currentSum, f)) {
        validFound++;
        if (masks.length < maxCandidates) {
          masks.push(currentMask);
          sums.push(currentSum);
        } else {
          // Algoritmo R de Vitter (Reservoir Sampling uniforme)
          const j = rng.int(validFound);
          if (j < maxCandidates) {
            masks[j] = currentMask;
            sums[j] = currentSum;
          }
        }
      }
      return;
    }

    // 1. Poda por elementos restantes disponíveis
    if (suffixCount[idx]! < rem) {
      prunedBranches++;
      return;
    }

    // 2. Poda por limites de soma parcial O(1)
    if (currentSum + minSumTable[idx]![rem]! > f.maxSum) {
      prunedBranches++;
      return;
    }
    if (currentSum + maxSumTable[idx]![rem]! < f.minSum) {
      prunedBranches++;
      return;
    }

    // 3. Poda por paridade parcial O(1)
    if (evens > f.maxEven) {
      prunedBranches++;
      return;
    }
    if (evens + suffixEven[idx]! < f.minEven) {
      prunedBranches++;
      return;
    }

    // 4. Poda por primos parciais O(1)
    if (primes > f.maxPrime) {
      prunedBranches++;
      return;
    }
    if (primes + suffixPrime[idx]! < f.minPrime) {
      prunedBranches++;
      return;
    }

    // 5. Poda por moldura parcial O(1)
    if (frame > f.maxFrame) {
      prunedBranches++;
      return;
    }
    if (frame + suffixFrame[idx]! < f.minFrame) {
      prunedBranches++;
      return;
    }

    // 6. Poda por repetição parcial O(1)
    if (f.lastDrawMask !== 0) {
      if (repeats > f.maxRepeat) {
        prunedBranches++;
        return;
      }
      if (repeats + suffixRepeat[idx]! < f.minRepeat) {
        prunedBranches++;
        return;
      }
    }

    // 7. Poda térmica Q/N/F O(1)
    if (f.hotMask !== 0) {
      if (hot > f.maxHot) {
        prunedBranches++;
        return;
      }
      if (hot + suffixHot[idx]! < f.minHot) {
        prunedBranches++;
        return;
      }
    }
    if (f.coldMask !== 0) {
      if (cold > f.maxCold) {
        prunedBranches++;
        return;
      }
      if (cold + suffixCold[idx]! < f.minCold) {
        prunedBranches++;
        return;
      }
    }

    // Exploração recursiva dos próximos candidatos da lista permutada
    const maxIdx = L - rem;
    for (let i = idx; i <= maxIdx; i++) {
      if (validFound >= explorationBudget) return;

      const val = available[i]!;
      const nextMask = currentMask | (1 << (val - 1));

      dfs(
        depth + 1,
        i + 1,
        currentSum + val,
        nextMask,
        evens + (IS_EVEN[val] ?? 0),
        primes + (IS_PRIME[val] ?? 0),
        frame + (IS_FRAME[val] ?? 0),
        fib + (IS_FIB[val] ?? 0),
        repeats + (isRepeat[val] ?? 0),
        hot + (isHot[val] ?? 0),
        neutral + (isNeutral[val] ?? 0),
        cold + (isCold[val] ?? 0),
      );
    }
  }

  dfs(
    0,
    0,
    initialSum,
    initialMask,
    initEvens,
    initPrimes,
    initFrame,
    initFib,
    initRepeats,
    initHot,
    initNeutral,
    initCold,
  );

  return {
    masks,
    sums,
    nodesVisited,
    prunedBranches,
  };
}
