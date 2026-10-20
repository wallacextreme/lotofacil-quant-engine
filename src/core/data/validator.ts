/**
 * Validação do histórico importado → `ValidationReport` + concursos canônicos.
 *
 * Política (nada é descartado silenciosamente — tudo é registrado no relatório):
 * - Linha totalmente vazia: ignorada e contada em `emptyRowsSkipped`.
 * - Concurso ausente/não inteiro/≤0: linha INVÁLIDA (`contestIssues` / `missingValues`).
 * - Dezena ausente: INVÁLIDA (`missingValues`). Não inteira ou fora de 1..25: INVÁLIDA (`invalidNumbers`).
 * - Dezena repetida na linha: INVÁLIDA (`duplicates`).
 * - Dezenas fora de ordem crescente: AVISO (`orderingIssues`); normalizadas por ordenação.
 * - Data ausente/inválida: AVISO (`dateIssues`); data = null. Data decrescente: AVISO.
 * - Concurso repetido com conteúdo idêntico: mantém o primeiro, cópias extras INVÁLIDAS (`duplicates`).
 * - Concurso repetido com conteúdo divergente: TODAS as cópias INVÁLIDAS (`duplicates` + `errors`).
 * - Lacunas na sequência de concursos: AVISO (`contestIssues`).
 * Invariante: validRows + invalidRows + emptyRowsSkipped = totalRows.
 */
import { PICK_SIZE, UNIVERSE_SIZE } from '../domain/constants';
import type { Contest, ParsedDataset, ValidationReport } from '../domain/types';
import { sha256Hex } from '../util/sha256';
import { ballHeaderIndex, isContestHeader, isDateHeader, parseDate, parseStrictInteger } from './normalizer';

interface ColumnMap {
  headerRow: number; // −1 quando não há cabeçalho
  contest: number;
  date: number | null;
  balls: number[]; // 15 índices de coluna
  labels: { contest: string | null; date: string | null; balls: string[] };
}

function cellText(row: readonly (string | null)[] | undefined, col: number): string | null {
  const v = row?.[col];
  return v === undefined || v === null ? null : String(v);
}

/** Localiza cabeçalho com Bola1..Bola15 (ou equivalentes) nas primeiras 20 linhas. */
export function detectColumns(rows: readonly (string | null)[][]): ColumnMap | null {
  const limit = Math.min(rows.length, 20);
  for (let r = 0; r < limit; r++) {
    const row = rows[r] ?? [];
    const balls = new Array<number>(PICK_SIZE).fill(-1);
    let contest = -1;
    let date: number | null = null;
    row.forEach((h, c) => {
      const bi = ballHeaderIndex(h);
      if (bi !== null && balls[bi - 1] === -1) balls[bi - 1] = c;
      else if (contest === -1 && isContestHeader(h)) contest = c;
      else if (date === null && isDateHeader(h)) date = c;
    });
    if (balls.every((b) => b >= 0) && contest >= 0) {
      return {
        headerRow: r,
        contest,
        date,
        balls,
        labels: {
          contest: cellText(row, contest),
          date: date === null ? null : cellText(row, date),
          balls: balls.map((b) => cellText(row, b) ?? ''),
        },
      };
    }
  }
  // Layout posicional claramente detectável: [concurso, data, 15 dezenas]
  const first = rows.find((r) => r.some((v) => v !== null && v.trim() !== ''));
  if (first) {
    const contestOk = parseStrictInteger(first[0]).ok;
    const dateOk = parseDate(first[1]).ok;
    const ballsOk = Array.from({ length: PICK_SIZE }, (_, i) => parseStrictInteger(first[i + 2])).every(
      (p) => p.ok && p.value >= 1 && p.value <= UNIVERSE_SIZE,
    );
    if (contestOk && dateOk && ballsOk) {
      return {
        headerRow: -1,
        contest: 0,
        date: 1,
        balls: Array.from({ length: PICK_SIZE }, (_, i) => i + 2),
        labels: {
          contest: '(coluna A)',
          date: '(coluna B)',
          balls: Array.from({ length: PICK_SIZE }, (_, i) => `(col ${i + 3})`),
        },
      };
    }
  }
  return null;
}

export function emptyReport(): ValidationReport {
  return {
    totalRows: 0,
    validRows: 0,
    invalidRows: 0,
    emptyRowsSkipped: 0,
    duplicates: [],
    invalidNumbers: [],
    missingValues: [],
    orderingIssues: [],
    dateIssues: [],
    contestIssues: [],
    warnings: [],
    errors: [],
    detectedColumns: { contest: null, date: null, balls: [] },
  };
}

/** Forma canônica usada no hash do dataset (estável entre versões do schema 1). */
export function canonicalDatasetString(contests: readonly Contest[]): string {
  const lines = contests.map((c) => `${c.contest};${c.date ?? ''};${c.numbers.join(',')}`);
  return `LQE-DATASET-V1\n${lines.join('\n')}`;
}

export function datasetHash(contests: readonly Contest[]): string {
  return sha256Hex(canonicalDatasetString(contests));
}

interface Candidate {
  row: number;
  contest: Contest;
}

export function validateTable(rows: readonly (string | null)[][]): ParsedDataset {
  const report = emptyReport();
  const map = detectColumns(rows);
  if (!map) {
    report.errors.push(
      'Colunas não identificadas: é necessário um cabeçalho com "Concurso" e "Bola1".."Bola15" (ou equivalentes), ' +
        'ou o layout posicional [concurso, data, 15 dezenas].',
    );
    return { contests: [], report, hash: datasetHash([]) };
  }
  report.detectedColumns = map.labels;
  if (map.headerRow < 0)
    report.warnings.push(
      'Cabeçalho não encontrado: layout posicional [concurso, data, 15 dezenas] assumido.',
    );
  if (map.date === null)
    report.warnings.push('Coluna de data não identificada: datas serão registradas como ausentes.');

  const candidates: Candidate[] = [];
  for (let r = map.headerRow + 1; r < rows.length; r++) {
    const row = rows[r] ?? [];
    const fileRow = r + 1;
    report.totalRows++;
    if (!row.some((v) => v !== null && String(v).trim() !== '')) {
      report.emptyRowsSkipped++;
      continue;
    }
    let invalid = false;
    const pc = parseStrictInteger(cellText(row, map.contest));
    let contestNo: number | null = null;
    if (!pc.ok) {
      invalid = true;
      const issue = { row: fileRow, contest: null, message: `Concurso inválido: ${pc.reason}` };
      if (pc.reason === 'valor ausente') report.missingValues.push(issue);
      report.contestIssues.push(issue);
    } else if (pc.value <= 0) {
      invalid = true;
      report.contestIssues.push({
        row: fileRow,
        contest: pc.value,
        message: 'Número de concurso deve ser positivo',
      });
    } else contestNo = pc.value;

    const nums: number[] = [];
    for (let b = 0; b < PICK_SIZE; b++) {
      const p = parseStrictInteger(cellText(row, map.balls[b] as number));
      if (!p.ok) {
        invalid = true;
        const issue = { row: fileRow, contest: contestNo, message: `Bola${b + 1}: ${p.reason}` };
        if (p.reason === 'valor ausente') report.missingValues.push(issue);
        else report.invalidNumbers.push(issue);
      } else if (p.value < 1 || p.value > UNIVERSE_SIZE) {
        invalid = true;
        report.invalidNumbers.push({
          row: fileRow,
          contest: contestNo,
          message: `Bola${b + 1}: ${p.value} fora de 1..25`,
        });
      } else nums.push(p.value);
    }
    if (nums.length === PICK_SIZE) {
      const dupes = nums.filter((n, i) => nums.indexOf(n) !== i);
      if (dupes.length > 0) {
        invalid = true;
        report.duplicates.push({
          row: fileRow,
          contest: contestNo,
          message: `Dezena(s) repetida(s) na linha: ${[...new Set(dupes)].join(', ')}`,
        });
      }
      if (!invalid && nums.some((n, i) => i > 0 && n <= (nums[i - 1] as number))) {
        report.orderingIssues.push({
          row: fileRow,
          contest: contestNo,
          message: 'Dezenas fora de ordem crescente (normalizadas por ordenação)',
        });
      }
    }

    let date: string | null = null;
    if (map.date !== null) {
      const pd = parseDate(cellText(row, map.date));
      if (pd.ok) date = pd.value;
      else report.dateIssues.push({ row: fileRow, contest: contestNo, message: `Data: ${pd.reason}` });
    }

    if (invalid || contestNo === null) {
      report.invalidRows++;
      continue;
    }
    candidates.push({
      row: fileRow,
      contest: { contest: contestNo, date, numbers: [...nums].sort((a, b) => a - b) },
    });
  }

  // Concursos duplicados
  const byContest = new Map<number, Candidate[]>();
  for (const c of candidates) {
    const list = byContest.get(c.contest.contest);
    if (list) list.push(c);
    else byContest.set(c.contest.contest, [c]);
  }
  const accepted: Contest[] = [];
  for (const [no, list] of byContest) {
    if (list.length === 1) {
      accepted.push((list[0] as Candidate).contest);
      continue;
    }
    const first = list[0] as Candidate;
    const key = (c: Candidate) => `${c.contest.date ?? ''}|${c.contest.numbers.join(',')}`;
    const identical = list.every((c) => key(c) === key(first));
    if (identical) {
      accepted.push(first.contest);
      for (const extra of list.slice(1)) {
        report.duplicates.push({
          row: extra.row,
          contest: no,
          message: `Concurso ${no} duplicado (idêntico à linha ${first.row}); cópia descartada`,
        });
        report.invalidRows++;
      }
    } else {
      for (const c of list) {
        report.duplicates.push({
          row: c.row,
          contest: no,
          message: `Concurso ${no} aparece com conteúdos divergentes`,
        });
        report.invalidRows++;
      }
      report.errors.push(
        `Concurso ${no}: ${list.length} registros divergentes — todos excluídos da análise.`,
      );
    }
  }

  const inputOrder = candidates.map((c) => c.contest.contest);
  if (inputOrder.some((v, i) => i > 0 && v < (inputOrder[i - 1] as number))) {
    report.warnings.push('Concursos fora de ordem no arquivo: reordenados por número de concurso.');
  }
  accepted.sort((a, b) => a.contest - b.contest);

  // Lacunas na sequência
  const gaps: string[] = [];
  let missingTotal = 0;
  for (let i = 1; i < accepted.length; i++) {
    const prev = (accepted[i - 1] as Contest).contest;
    const cur = (accepted[i] as Contest).contest;
    if (cur - prev > 1) {
      missingTotal += cur - prev - 1;
      gaps.push(cur - prev === 2 ? `${prev + 1}` : `${prev + 1}–${cur - 1}`);
    }
  }
  if (gaps.length > 0) {
    report.contestIssues.push({
      row: 0,
      contest: null,
      message: `Sequência com ${missingTotal} concurso(s) ausente(s): ${gaps.slice(0, 30).join(', ')}${gaps.length > 30 ? ', …' : ''}`,
    });
    report.warnings.push(
      `${missingTotal} concurso(s) ausente(s) na sequência. Atrasos e Markov assumem concursos consecutivos no arquivo.`,
    );
  }

  // Monotonicidade das datas
  for (let i = 1; i < accepted.length; i++) {
    const a = accepted[i - 1] as Contest;
    const b = accepted[i] as Contest;
    if (a.date && b.date && b.date < a.date) {
      report.dateIssues.push({
        row: 0,
        contest: b.contest,
        message: `Data ${b.date} anterior à do concurso ${a.contest} (${a.date})`,
      });
    }
  }

  report.validRows = accepted.length;
  if (report.orderingIssues.length)
    report.warnings.push(
      `${report.orderingIssues.length} linha(s) com dezenas fora de ordem (normalizadas).`,
    );
  if (report.dateIssues.length)
    report.warnings.push(`${report.dateIssues.length} problema(s) de data registrados.`);
  if (report.emptyRowsSkipped)
    report.warnings.push(`${report.emptyRowsSkipped} linha(s) vazia(s) ignorada(s).`);
  if (report.invalidRows > 0) {
    report.errors.push(
      `${report.invalidRows} linha(s) inválida(s) excluída(s) da análise (detalhes por categoria).`,
    );
  }
  if (accepted.length === 0) report.errors.push('Nenhum concurso válido encontrado.');

  return { contests: accepted, report, hash: datasetHash(accepted) };
}
