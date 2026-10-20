/**
 * Normalização de valores brutos (cabeçalhos, inteiros, datas) vindos de XLSX/CSV.
 * Funções puras: retornam valor normalizado ou motivo de rejeição — nunca "adivinham".
 */

export type Parsed<T> = { ok: true; value: T } | { ok: false; reason: string };

/** Remove acentos, espaços extras e caixa para comparar cabeçalhos. */
export function normalizeHeader(h: string | null | undefined): string {
  return (h ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\x20-\x7e]/g, '')
    .toLowerCase()
    .replace(/[_\-.]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Retorna o índice da bola (1..15) se o cabeçalho for claramente uma coluna de dezena. */
export function ballHeaderIndex(h: string | null | undefined): number | null {
  const n = normalizeHeader(h);
  const m = /^(?:bola|dezena|dez|bol|b|d|n|numero|num)\s*(\d{1,2})$/.exec(n);
  if (!m) return null;
  const idx = Number(m[1]);
  return idx >= 1 && idx <= 15 ? idx : null;
}

export function isContestHeader(h: string | null | undefined): boolean {
  const n = normalizeHeader(h);
  return /^(?:concurso|conc|contest|n concurso|no concurso|numero concurso|numero do concurso|id concurso)$/.test(
    n,
  );
}

export function isDateHeader(h: string | null | undefined): boolean {
  const n = normalizeHeader(h);
  return /^(?:data|data sorteio|data do sorteio|data de sorteio|date|draw date|dt sorteio)$/.test(n);
}

/** Inteiro estrito: aceita "07", "7", "7.0", "7,0". Rejeita "7.5", "", "abc". */
export function parseStrictInteger(raw: string | null | undefined): Parsed<number> {
  if (raw === null || raw === undefined || raw.trim() === '') return { ok: false, reason: 'valor ausente' };
  const s = raw.trim();
  const m = /^(\d+)(?:[.,]0+)?$/.exec(s);
  if (!m) return { ok: false, reason: `valor não inteiro: "${s.slice(0, 20)}"` };
  const v = Number(m[1]);
  if (!Number.isSafeInteger(v)) return { ok: false, reason: `inteiro fora de faixa: "${s.slice(0, 20)}"` };
  return { ok: true, value: v };
}

const pad2 = (n: number): string => String(n).padStart(2, '0');

function makeIsoDate(y: number, mo: number, d: number): Parsed<string> {
  if (y < 1900 || y > 2200 || mo < 1 || mo > 12 || d < 1 || d > 31) {
    return { ok: false, reason: `data fora de faixa: ${d}/${mo}/${y}` };
  }
  const dt = new Date(Date.UTC(y, mo - 1, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== mo - 1 || dt.getUTCDate() !== d) {
    return { ok: false, reason: `data inexistente no calendário: ${d}/${mo}/${y}` };
  }
  return { ok: true, value: `${y}-${pad2(mo)}-${pad2(d)}` };
}

/**
 * Datas aceitas: DD/MM/AAAA, DD-MM-AAAA, DD.MM.AAAA, AAAA-MM-DD[...] e serial do Excel
 * (sistema 1900) entre 2000-01-01 e 2100-12-31.
 */
export function parseDate(raw: string | null | undefined): Parsed<string> {
  if (raw === null || raw === undefined || raw.trim() === '') return { ok: false, reason: 'data ausente' };
  const s = raw.trim();
  let m = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})(?:\s.*)?$/.exec(s);
  if (m) return makeIsoDate(Number(m[3]), Number(m[2]), Number(m[1]));
  m = /^(\d{4})-(\d{1,2})-(\d{1,2})(?:[T\s].*)?$/.exec(s);
  if (m) return makeIsoDate(Number(m[1]), Number(m[2]), Number(m[3]));
  if (/^\d+(?:\.\d+)?$/.test(s)) {
    const serial = Math.floor(Number(s));
    // 36526 = 2000-01-01; 73415 = 2100-12-31 (Excel 1900, epoch efetiva 1899-12-30)
    if (serial >= 36526 && serial <= 73415) {
      const dt = new Date(Date.UTC(1899, 11, 30) + serial * 86400000);
      return {
        ok: true,
        value: `${dt.getUTCFullYear()}-${pad2(dt.getUTCMonth() + 1)}-${pad2(dt.getUTCDate())}`,
      };
    }
    return { ok: false, reason: `serial numérico de data implausível: ${s.slice(0, 20)}` };
  }
  return { ok: false, reason: `formato de data não reconhecido: "${s.slice(0, 30)}"` };
}

export function formatDateBR(iso: string | null): string {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}
