/**
 * PRNG determinístico com seed explícita.
 *
 * Algoritmo: xoshiro128** (Blackman & Vigna), estado de 128 bits inicializado por
 * splitmix32 a partir da seed. Nunca usar Math.random() no motor.
 *
 * Garantia: mesma seed ⇒ mesma sequência, em qualquer plataforma JS (aritmética
 * inteira de 32 bits via Math.imul e >>>).
 */
export interface Rng {
  /** Inteiro uniforme em [0, 2^32). */
  nextU32(): number;
  /** Real uniforme em [0, 1) com 32 bits de resolução. */
  next(): number;
  /** Inteiro uniforme em [0, maxExclusive), sem viés (rejeição). */
  int(maxExclusive: number): number;
  /** Embaralha in-place (Fisher–Yates). */
  shuffle<T>(arr: T[]): T[];
}

function splitmix32(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x9e3779b9) >>> 0;
    let z = s;
    z = Math.imul(z ^ (z >>> 16), 0x85ebca6b) >>> 0;
    z = Math.imul(z ^ (z >>> 13), 0xc2b2ae35) >>> 0;
    return (z ^ (z >>> 16)) >>> 0;
  };
}

const rotl = (x: number, k: number): number => ((x << k) | (x >>> (32 - k))) >>> 0;

export function createRng(seed: number): Rng {
  if (!Number.isInteger(seed)) throw new Error(`Seed deve ser inteira: ${seed}`);
  const sm = splitmix32(seed);
  let a = sm();
  let b = sm();
  let c = sm();
  let d = sm();
  if ((a | b | c | d) === 0) a = 1;

  const nextU32 = (): number => {
    const result = Math.imul(rotl(Math.imul(b, 5) >>> 0, 7), 9) >>> 0;
    const t = (b << 9) >>> 0;
    c ^= a;
    d ^= b;
    b ^= c;
    a ^= d;
    c ^= t;
    d = rotl(d, 11);
    a >>>= 0;
    b >>>= 0;
    c >>>= 0;
    return result;
  };

  const int = (maxExclusive: number): number => {
    if (!Number.isInteger(maxExclusive) || maxExclusive <= 0 || maxExclusive > 2 ** 32) {
      throw new Error(`Limite inválido: ${maxExclusive}`);
    }
    const limit = 2 ** 32 - (2 ** 32 % maxExclusive);
    let x = nextU32();
    while (x >= limit) x = nextU32();
    return x % maxExclusive;
  };

  return {
    nextU32,
    next: () => nextU32() / 2 ** 32,
    int,
    shuffle<T>(arr: T[]): T[] {
      for (let i = arr.length - 1; i > 0; i--) {
        const j = int(i + 1);
        const tmp = arr[i] as T;
        arr[i] = arr[j] as T;
        arr[j] = tmp;
      }
      return arr;
    },
  };
}
