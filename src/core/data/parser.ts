/**
 * Ponto de entrada da ingestão: bytes de arquivo → tabela → dataset validado.
 */
import type { ParsedDataset } from '../domain/types';
import { parseCsv } from './csv';
import { decodeText, readXlsx } from './xlsx';
import { emptyReport, validateTable } from './validator';
import { ballHeaderIndex } from './normalizer';

export type SourceFormat = 'xlsx' | 'csv';

export function detectFormat(bytes: Uint8Array, fileName: string): SourceFormat | null {
  if (bytes.length >= 2 && bytes[0] === 0x50 && bytes[1] === 0x4b) return 'xlsx';
  const lower = fileName.toLowerCase();
  if (lower.endsWith('.xlsx')) return 'xlsx';
  if (lower.endsWith('.csv') || lower.endsWith('.txt')) return 'csv';
  return null;
}

/** Escolhe a planilha que contém cabeçalho de dezenas; senão a primeira. */
function pickSheet(sheets: { name: string; rows: (string | null)[][] }[]): {
  name: string;
  rows: (string | null)[][];
} {
  const withBalls = sheets.find((s) =>
    s.rows.slice(0, 20).some((r) => r.filter((h) => ballHeaderIndex(h) !== null).length >= 15),
  );
  return withBalls ?? (sheets[0] as { name: string; rows: (string | null)[][] });
}

export interface ParseOutcome extends ParsedDataset {
  format: SourceFormat | null;
  sheetName: string | null;
}

export function parseHistoryFile(bytes: Uint8Array, fileName: string): ParseOutcome {
  const format = detectFormat(bytes, fileName);
  if (!format) {
    const report = emptyReport();
    report.errors.push('Formato não suportado. Use .xlsx ou .csv.');
    return { contests: [], report, hash: '', format: null, sheetName: null };
  }
  try {
    if (format === 'xlsx') {
      const sheet = pickSheet(readXlsx(bytes));
      return { ...validateTable(sheet.rows), format, sheetName: sheet.name };
    }
    return { ...validateTable(parseCsv(decodeText(bytes))), format, sheetName: null };
  } catch (e) {
    const report = emptyReport();
    report.errors.push((e as Error).message);
    return { contests: [], report, hash: '', format, sheetName: null };
  }
}
