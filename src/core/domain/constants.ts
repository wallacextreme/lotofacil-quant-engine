/**
 * FONTE ÚNICA de constantes matemáticas e estruturais da Lotofácil.
 * Nenhum outro módulo deve redefinir estes conjuntos.
 *
 * Classificação: FATO MATEMÁTICO (definição do jogo).
 */

/** Tamanho do universo de dezenas (N). */
export const UNIVERSE_SIZE = 25;
/** Dezenas por aposta/sorteio (n). */
export const PICK_SIZE = 15;
/** Dezenas não sorteadas por concurso (N − n). */
export const LEFT_OUT = UNIVERSE_SIZE - PICK_SIZE;

/** Todas as dezenas 1..25. */
export const ALL_NUMBERS: readonly number[] = Object.freeze(
  Array.from({ length: UNIVERSE_SIZE }, (_, i) => i + 1),
);

export const PRIMES: readonly number[] = Object.freeze([2, 3, 5, 7, 11, 13, 17, 19, 23]);
export const FIBONACCI: readonly number[] = Object.freeze([1, 2, 3, 5, 8, 13, 21]);
export const FRAME: readonly number[] = Object.freeze([
  1, 2, 3, 4, 5, 6, 10, 11, 15, 16, 20, 21, 22, 23, 24, 25,
]);
export const CORE: readonly number[] = Object.freeze([7, 8, 9, 12, 13, 14, 17, 18, 19]);
export const EVENS: readonly number[] = Object.freeze(ALL_NUMBERS.filter((n) => n % 2 === 0));
export const ODDS: readonly number[] = Object.freeze(ALL_NUMBERS.filter((n) => n % 2 === 1));

/** Volante 5×5: linha (0..4) e coluna (0..4) de cada dezena. */
export const GRID_SIZE = 5;
export const rowOf = (n: number): number => Math.floor((n - 1) / GRID_SIZE);
export const colOf = (n: number): number => (n - 1) % GRID_SIZE;

/** Bitmask (bit n−1) para cada conjunto estrutural — usado nos motores combinatórios. */
export const maskOf = (nums: readonly number[]): number => {
  let m = 0;
  for (const n of nums) m |= 1 << (n - 1);
  return m >>> 0;
};

export const MASK_ALL = maskOf(ALL_NUMBERS);
export const MASK_PRIMES = maskOf(PRIMES);
export const MASK_FIBONACCI = maskOf(FIBONACCI);
export const MASK_FRAME = maskOf(FRAME);
export const MASK_CORE = maskOf(CORE);
export const MASK_EVENS = maskOf(EVENS);
export const ROW_MASKS: readonly number[] = Object.freeze(
  Array.from({ length: GRID_SIZE }, (_, r) => maskOf(ALL_NUMBERS.filter((n) => rowOf(n) === r))),
);
export const COL_MASKS: readonly number[] = Object.freeze(
  Array.from({ length: GRID_SIZE }, (_, c) => maskOf(ALL_NUMBERS.filter((n) => colOf(n) === c))),
);

/** Faixas de premiação (acertos) da Lotofácil. */
export const PRIZE_TIERS: readonly number[] = Object.freeze([11, 12, 13, 14, 15]);

/** Seed padrão documentada na especificação. */
export const DEFAULT_SEED = 20261003;

/**
 * Invariantes verificados em tempo de carga (falha rápida se alguém alterar as constantes).
 * Moldura e miolo particionam o volante.
 */
(() => {
  if (FRAME.length + CORE.length !== UNIVERSE_SIZE) throw new Error('Moldura/miolo não particionam 1..25');
  if ((MASK_FRAME & MASK_CORE) !== 0) throw new Error('Moldura e miolo se sobrepõem');
  if ((MASK_FRAME | MASK_CORE) >>> 0 !== MASK_ALL) throw new Error('Moldura ∪ miolo ≠ 1..25');
})();
