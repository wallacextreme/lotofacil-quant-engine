/**
 * Operações de bits sobre combinações representadas como máscara de 25 bits
 * (bit n−1 ligado ⇔ dezena n presente). Todas as funções são puras.
 */
import { PICK_SIZE, UNIVERSE_SIZE } from '../domain/constants';

/** Contagem de bits (Hamming weight) para inteiros de 32 bits. */
export function popcount32(x: number): number {
  let v = x >>> 0;
  v -= (v >>> 1) & 0x55555555;
  v = (v & 0x33333333) + ((v >>> 2) & 0x33333333);
  return (((v + (v >>> 4)) & 0x0f0f0f0f) * 0x01010101) >>> 24;
}

export function numbersToMask(nums: readonly number[]): number {
  let m = 0;
  for (const n of nums) m |= 1 << (n - 1);
  return m >>> 0;
}

export function maskToNumbers(mask: number): number[] {
  const out: number[] = [];
  for (let i = 0; i < UNIVERSE_SIZE; i++) if ((mask >>> i) & 1) out.push(i + 1);
  return out;
}

/**
 * Próxima máscara com o mesmo número de bits (Gosper's hack).
 * Retorna um valor ≥ 2^25 quando a enumeração em 25 bits termina.
 */
export function nextCombinationMask(x: number): number {
  const c = x & -x;
  const r = x + c;
  return (((r ^ x) >>> 2) / c) | r;
}

export const FIRST_COMBINATION_MASK = (1 << PICK_SIZE) - 1;
export const MASK_LIMIT = 1 << UNIVERSE_SIZE;

/** Itera todas as C(25,15) máscaras em ordem crescente. */
export function forEachCombinationMask(fn: (mask: number) => void): void {
  for (let m = FIRST_COMBINATION_MASK; m < MASK_LIMIT; m = nextCombinationMask(m)) fn(m);
}
