/**
 * Leitor XLSX mínimo e defensivo (somente leitura de valores de células).
 *
 * Motivação: o export oficial da Caixa usa prefixos de namespace (`<x:c>`), omite o
 * atributo `r` das células/linhas de dados e declara `<dimension>` incorreta. Também
 * funciona em Web Workers (sem DOMParser) e no Bun.
 *
 * Segurança: nenhum conteúdo é executado; limites de tamanho protegem contra zip bombs.
 */
import { unzipSync } from 'fflate';

export interface SheetTable {
  name: string;
  rows: (string | null)[][];
}

export const MAX_COMPRESSED_BYTES = 50 * 1024 * 1024;
export const MAX_UNCOMPRESSED_BYTES = 200 * 1024 * 1024;

/** Decodifica bytes como UTF-8 estrito; em caso de bytes inválidos, recorre a Latin-1. */
export function decodeText(bytes: Uint8Array): string {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    let s = '';
    for (let i = 0; i < bytes.length; i += 8192) {
      s += String.fromCharCode(...bytes.subarray(i, i + 8192));
    }
    return s;
  }
}

export function decodeXmlEntities(s: string): string {
  if (s.indexOf('&') === -1) return s;
  return s.replace(/&(#x[0-9a-fA-F]+|#\d+|amp|lt|gt|quot|apos);/g, (_m, e: string) => {
    switch (e) {
      case 'amp':
        return '&';
      case 'lt':
        return '<';
      case 'gt':
        return '>';
      case 'quot':
        return '"';
      case 'apos':
        return "'";
      default: {
        const code = e[1] === 'x' ? Number.parseInt(e.slice(2), 16) : Number.parseInt(e.slice(1), 10);
        return Number.isFinite(code) && code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : '';
      }
    }
  });
}

const attr = (attrs: string, name: string): string | null => {
  const m = new RegExp(`(?:^|\\s)(?:\\w+:)?${name}\\s*=\\s*"([^"]*)"`).exec(attrs);
  return m ? decodeXmlEntities(m[1] as string) : null;
};

/** Concatena todos os `<t>` de um fragmento (ignorando runs fonéticos `<rPh>`). */
function textRuns(fragment: string): string {
  const clean = fragment.replace(/<(?:\w+:)?rPh\b[\s\S]*?<\/(?:\w+:)?rPh>/g, '');
  let out = '';
  const re = /<(?:\w+:)?t\b[^>]*?(?:\/>|>([\s\S]*?)<\/(?:\w+:)?t>)/g;
  for (let m = re.exec(clean); m; m = re.exec(clean)) out += m[1] ?? '';
  return decodeXmlEntities(out);
}

export function parseSharedStrings(xml: string): string[] {
  const out: string[] = [];
  const re = /<(?:\w+:)?si\b[^>]*?(?:\/>|>([\s\S]*?)<\/(?:\w+:)?si>)/g;
  for (let m = re.exec(xml); m; m = re.exec(xml)) out.push(textRuns(m[1] ?? ''));
  return out;
}

/** Converte letras de coluna (A, B, ..., AA) em índice 0-based. */
export function columnIndex(ref: string): number {
  const letters = /^[A-Z]+/i.exec(ref)?.[0]?.toUpperCase() ?? '';
  let n = 0;
  for (const ch of letters) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n - 1;
}

export function parseSheetXml(xml: string, shared: readonly string[]): (string | null)[][] {
  const rows: (string | null)[][] = [];
  const rowRe = /<(?:\w+:)?row\b([^>]*?)(?:\/>|>([\s\S]*?)<\/(?:\w+:)?row>)/g;
  const cellRe = /<(?:\w+:)?c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/(?:\w+:)?c>)/g;
  const vRe = /<(?:\w+:)?v\b[^>]*?(?:\/>|>([\s\S]*?)<\/(?:\w+:)?v>)/;
  const isRe = /<(?:\w+:)?is\b[^>]*>([\s\S]*?)<\/(?:\w+:)?is>/;
  let lastRow = -1;
  for (let rm = rowRe.exec(xml); rm; rm = rowRe.exec(xml)) {
    const rAttr = attr(rm[1] ?? '', 'r');
    const rowIdx = rAttr && /^\d+$/.test(rAttr) ? Number(rAttr) - 1 : lastRow + 1;
    lastRow = rowIdx;
    const cells: (string | null)[] = [];
    let lastCol = -1;
    const body = rm[2] ?? '';
    cellRe.lastIndex = 0;
    for (let cm = cellRe.exec(body); cm; cm = cellRe.exec(body)) {
      const attrs = cm[1] ?? '';
      const ref = attr(attrs, 'r');
      const col = ref ? columnIndex(ref) : lastCol + 1;
      lastCol = col;
      const type = attr(attrs, 't');
      const inner = cm[2] ?? '';
      let value: string | null = null;
      if (type === 'inlineStr') {
        const is = isRe.exec(inner);
        value = is ? textRuns(is[1] ?? '') : null;
      } else {
        const v = vRe.exec(inner);
        const raw = v ? decodeXmlEntities(v[1] ?? '') : null;
        if (type === 's') {
          const idx = raw === null ? Number.NaN : Number(raw);
          value = Number.isInteger(idx) && idx >= 0 && idx < shared.length ? (shared[idx] as string) : null;
        } else if (type === 'e') {
          value = null;
        } else {
          value = raw;
        }
      }
      while (cells.length < col) cells.push(null);
      cells[col] = value;
    }
    while (rows.length < rowIdx) rows.push([]);
    rows[rowIdx] = cells;
  }
  return rows;
}

function resolveSheetPaths(files: Record<string, Uint8Array>): { name: string; path: string }[] {
  const wb = files['xl/workbook.xml'];
  const rels = files['xl/_rels/workbook.xml.rels'];
  const result: { name: string; path: string }[] = [];
  if (wb && rels) {
    const relXml = decodeText(rels);
    const relMap = new Map<string, string>();
    const relRe = /<(?:\w+:)?Relationship\b([^>]*?)\/?>/g;
    for (let m = relRe.exec(relXml); m; m = relRe.exec(relXml)) {
      const id = attr(m[1] ?? '', 'Id');
      const target = attr(m[1] ?? '', 'Target');
      if (id && target) {
        const clean = target.replace(/^\/+/, '');
        relMap.set(id, clean.startsWith('xl/') ? clean : `xl/${clean}`);
      }
    }
    const wbXml = decodeText(wb);
    const sheetRe = /<(?:\w+:)?sheet\b([^>]*?)\/?>/g;
    for (let m = sheetRe.exec(wbXml); m; m = sheetRe.exec(wbXml)) {
      const name = attr(m[1] ?? '', 'name') ?? `Sheet${result.length + 1}`;
      const rid = attr(m[1] ?? '', 'id');
      const path = rid ? relMap.get(rid) : undefined;
      if (path && files[path]) result.push({ name, path });
    }
  }
  if (result.length === 0) {
    Object.keys(files)
      .filter((p) => /^xl\/worksheets\/sheet\d+\.xml$/.test(p))
      .sort((a, b) => Number(/\d+/.exec(a)?.[0]) - Number(/\d+/.exec(b)?.[0]))
      .forEach((path, i) => {
        result.push({ name: `Sheet${i + 1}`, path });
      });
  }
  return result;
}

/** Lê todas as planilhas de um arquivo XLSX. Lança erro descritivo em arquivos inválidos. */
export function readXlsx(bytes: Uint8Array): SheetTable[] {
  if (bytes.length > MAX_COMPRESSED_BYTES) throw new Error('Arquivo XLSX excede o limite de 50 MB.');
  if (bytes.length < 4 || bytes[0] !== 0x50 || bytes[1] !== 0x4b) {
    throw new Error('Arquivo não é um XLSX válido (assinatura ZIP ausente).');
  }
  let total = 0;
  let files: Record<string, Uint8Array>;
  try {
    files = unzipSync(bytes, {
      filter: (f) => {
        const wanted = (f.name.startsWith('xl/') && f.name.endsWith('.xml')) || f.name.endsWith('.rels');
        if (!wanted) return false;
        total += f.originalSize;
        if (total > MAX_UNCOMPRESSED_BYTES)
          throw new Error('Conteúdo descompactado excede o limite de segurança.');
        return true;
      },
    });
  } catch (e) {
    throw new Error(`Falha ao descompactar XLSX: ${(e as Error).message}`);
  }
  const sharedBytes = files['xl/sharedStrings.xml'];
  const shared = sharedBytes ? parseSharedStrings(decodeText(sharedBytes)) : [];
  const sheets = resolveSheetPaths(files);
  if (sheets.length === 0) throw new Error('Nenhuma planilha encontrada no XLSX.');
  return sheets.map(({ name, path }) => ({
    name,
    rows: parseSheetXml(decodeText(files[path] as Uint8Array), shared),
  }));
}
