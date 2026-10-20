/**
 * Serviço de Exportação Multiformato (§33, §44).
 *
 * Formatos suportados:
 * - TXT: Jogos formatados (uma aposta por linha com zeros à esquerda) ou com cabeçalho de auditoria
 * - CSV: Tabela estruturada (ID, Bola1..15, Soma, Pares, Primos, Moldura, Score, Status)
 * - JSON: Payload completo com metadados de reprodutibilidade, parâmetros, auditoria e breakdown
 * - XLSX: Arquivo Excel gerado de forma nativa e leve via compressão ZIP (fflate)
 *
 * Segurança (§44):
 * - Nomes de arquivo e metadados sanitizados contra injeções.
 */
import type { GameAudit, GeneratorConfig, ReproMeta } from '../core/domain/types';
import type { CoverageReport } from '../core/combinatorial/coverage';
import type { HammingAnalysis } from '../core/combinatorial/hamming';
import { formatCombination } from '../core/domain/models';
import { zipSync } from 'fflate';

export function sanitizeFileName(name: string): string {
  return name.replace(/[/\\?%*:|"<>]/g, '_').trim();
}

export function exportAsTxt(
  games: readonly GameAudit[],
  includeMetadata = true,
  repro?: ReproMeta | null,
): string {
  const lines: string[] = [];

  if (includeMetadata && repro) {
    lines.push('================================================================');
    lines.push('LOTOFÁCIL QUANT ENGINE — RELATÓRIO DE APOSTAS AUDITADAS');
    lines.push(`Gerado em: ${repro.timestamp}`);
    lines.push(`Engine: v${repro.engineVersion} | Seed: ${repro.seed}`);
    lines.push(`Dataset Hash: ${repro.datasetHash}`);
    lines.push(`Total de Concursos Analisados: ${repro.datasetSize} (Último: #${repro.lastContest})`);
    lines.push('================================================================\n');
  }

  for (let i = 0; i < games.length; i++) {
    const g = games[i]!;
    const numStr = formatCombination(g.numbers);
    if (includeMetadata) {
      lines.push(
        `Jogo ${String(i + 1).padStart(2, '0')}: ${numStr} | Soma=${g.sum} Par=${g.evenCount} Prim=${g.primeCount} Mold=${g.frameCount} Fib=${g.fibonacciCount} Rep=${g.repeatedCount} Score=${g.score.toFixed(2)} [${g.status}]`,
      );
    } else {
      lines.push(numStr);
    }
  }

  return lines.join('\n');
}

export function exportAsCsv(games: readonly GameAudit[]): string {
  const header = [
    'Jogo',
    'Bola1',
    'Bola2',
    'Bola3',
    'Bola4',
    'Bola5',
    'Bola6',
    'Bola7',
    'Bola8',
    'Bola9',
    'Bola10',
    'Bola11',
    'Bola12',
    'Bola13',
    'Bola14',
    'Bola15',
    'Soma',
    'Pares',
    'Impares',
    'Primos',
    'Moldura',
    'Miolo',
    'Fibonacci',
    'Repetidas',
    'Quentes',
    'Neutras',
    'Frias',
    'DistHammingMin',
    'Score',
    'Status',
  ].join(';');

  const rows = games.map((g) => {
    const balls = g.numbers.map((n) => String(n).padStart(2, '0'));
    return [
      g.id,
      ...balls,
      g.sum,
      g.evenCount,
      g.oddCount,
      g.primeCount,
      g.frameCount,
      g.coreCount,
      g.fibonacciCount,
      g.repeatedCount,
      g.hotCount,
      g.neutralCount,
      g.coldCount,
      g.minHamming ?? '—',
      g.score.toFixed(4).replace('.', ','),
      g.status,
    ].join(';');
  });

  return [header, ...rows].join('\r\n');
}

export function exportAsJson(
  games: readonly GameAudit[],
  config: GeneratorConfig,
  repro: ReproMeta,
  coverage: CoverageReport | null,
  hamming: HammingAnalysis | null,
): string {
  const payload = {
    lotofacilQuantEngine: {
      exportedAt: new Date().toISOString(),
      reproducibility: repro,
      configuration: config,
      summary: {
        totalGames: games.length,
        allValid: games.every((g) => g.status === 'VALID'),
        coverage: coverage
          ? {
              numbersCovered: coverage.numbersCoveredCount,
              numbersRatio: coverage.numbersCoverageRatio,
              pairsCovered: coverage.uniquePairsCoveredCount,
              pairsRatio: coverage.pairsCoverageRatio,
            }
          : null,
        hamming: hamming
          ? {
              minDistance: hamming.minDistance,
              meanDistance: hamming.meanDistance,
              maxDistance: hamming.maxDistance,
            }
          : null,
      },
      games,
    },
  };

  return JSON.stringify(payload, null, 2);
}

/**
 * Constrói um arquivo XLSX nativo e minimalista sem bibliotecas externas pesadas.
 */
export function exportAsXlsx(games: readonly GameAudit[], _repro?: ReproMeta | null): Uint8Array {
  const enc = new TextEncoder();

  // Constrói XML da planilha
  const rowsXml: string[] = [];

  // Cabeçalho
  const headers = [
    'Jogo',
    'Bola 01',
    'Bola 02',
    'Bola 03',
    'Bola 04',
    'Bola 05',
    'Bola 06',
    'Bola 07',
    'Bola 08',
    'Bola 09',
    'Bola 10',
    'Bola 11',
    'Bola 12',
    'Bola 13',
    'Bola 14',
    'Bola 15',
    'Soma',
    'Pares',
    'Ímpares',
    'Primos',
    'Moldura',
    'Miolo',
    'Fibonacci',
    'Repetidas',
    'Quentes',
    'Neutras',
    'Frias',
    'Hamming Mín.',
    'Score',
    'Status',
  ];

  let r1Cells = '';
  headers.forEach((h) => {
    r1Cells += `<c t="inlineStr"><is><t>${h}</t></is></c>`;
  });
  rowsXml.push(`<row r="1">${r1Cells}</row>`);

  games.forEach((g, idx) => {
    const rowNo = idx + 2;
    let cells = `<c t="n"><v>${g.id}</v></c>`;
    for (const num of g.numbers) {
      cells += `<c t="n"><v>${num}</v></c>`;
    }
    cells += `<c t="n"><v>${g.sum}</v></c>`;
    cells += `<c t="n"><v>${g.evenCount}</v></c>`;
    cells += `<c t="n"><v>${g.oddCount}</v></c>`;
    cells += `<c t="n"><v>${g.primeCount}</v></c>`;
    cells += `<c t="n"><v>${g.frameCount}</v></c>`;
    cells += `<c t="n"><v>${g.coreCount}</v></c>`;
    cells += `<c t="n"><v>${g.fibonacciCount}</v></c>`;
    cells += `<c t="n"><v>${g.repeatedCount}</v></c>`;
    cells += `<c t="n"><v>${g.hotCount}</v></c>`;
    cells += `<c t="n"><v>${g.neutralCount}</v></c>`;
    cells += `<c t="n"><v>${g.coldCount}</v></c>`;
    cells += `<c t="n"><v>${g.minHamming ?? 0}</v></c>`;
    cells += `<c t="n"><v>${g.score.toFixed(4)}</v></c>`;
    cells += `<c t="inlineStr"><is><t>${g.status}</t></is></c>`;
    rowsXml.push(`<row r="${rowNo}">${cells}</row>`);
  });

  const sheetXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <sheetData>
    ${rowsXml.join('\n    ')}
  </sheetData>
</worksheet>`;

  const workbookXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets>
    <sheet name="Jogos_Auditados" sheetId="1" r:id="rId1"/>
  </sheets>
</workbook>`;

  const workbookRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
</Relationships>`;

  const rootRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`;

  const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
</Types>`;

  const files: Record<string, Uint8Array> = {
    '[Content_Types].xml': enc.encode(contentTypes),
    '_rels/.rels': enc.encode(rootRels),
    'xl/_rels/workbook.xml.rels': enc.encode(workbookRels),
    'xl/workbook.xml': enc.encode(workbookXml),
    'xl/worksheets/sheet1.xml': enc.encode(sheetXml),
  };

  return zipSync(files);
}
