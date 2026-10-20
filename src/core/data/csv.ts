/**
 * Parser CSV (RFC 4180) com detecção automática de delimitador (`;`, `,`, TAB, `|`).
 * Remove BOM. Não interpreta fórmulas nem executa conteúdo.
 */

const CANDIDATES = [';', ',', '\t', '|'] as const;

export function detectDelimiter(text: string): string {
  const firstLine = text.split(/\r?\n/).find((l) => l.trim().length > 0) ?? '';
  let best: string = ';';
  let bestCount = -1;
  for (const d of CANDIDATES) {
    let count = 0;
    let inQuotes = false;
    for (const ch of firstLine) {
      if (ch === '"') inQuotes = !inQuotes;
      else if (ch === d && !inQuotes) count++;
    }
    if (count > bestCount) {
      best = d;
      bestCount = count;
    }
  }
  return best;
}

export function parseCsv(input: string, delimiter?: string): (string | null)[][] {
  const text = input.charCodeAt(0) === 0xfeff ? input.slice(1) : input;
  const d = delimiter ?? detectDelimiter(text);
  const rows: (string | null)[][] = [];
  let row: (string | null)[] = [];
  let field = '';
  let inQuotes = false;
  let fieldQuoted = false;
  const pushField = () => {
    const v = fieldQuoted ? field : field.trim();
    row.push(v === '' ? null : v);
    field = '';
    fieldQuoted = false;
  };
  for (let i = 0; i < text.length; i++) {
    const ch = text[i] as string;
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else inQuotes = false;
      } else field += ch;
    } else if (ch === '"' && field.trim() === '') {
      inQuotes = true;
      fieldQuoted = true;
      field = '';
    } else if (ch === d) {
      pushField();
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      pushField();
      rows.push(row);
      row = [];
    } else field += ch;
  }
  if (field !== '' || row.length > 0) {
    pushField();
    rows.push(row);
  }
  return rows;
}
