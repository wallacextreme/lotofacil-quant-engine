/**
 * Gerador de Relatório Científico Consolidado (§32).
 *
 * Produz documento textual/Markdown completo e auditável contendo todas as seções
 * estatísticas, diagnósticos metodológicos, parâmetros, sementes e portfólios auditados.
 */
import type { GameAudit, GeneratorConfig, ReproMeta } from '../core/domain/types';
import type { DatasetAnalysis } from './analysisService';
import type { CoverageReport } from '../core/combinatorial/coverage';
import type { HammingAnalysis } from '../core/combinatorial/hamming';
import { formatCombination } from '../core/domain/models';

export interface ScientificReportPayload {
  repro: ReproMeta;
  config: GeneratorConfig;
  analysis: DatasetAnalysis;
  games: GameAudit[];
  coverage: CoverageReport | null;
  hamming: HammingAnalysis | null;
}

export function generateScientificReportMarkdown(payload: ScientificReportPayload): string {
  const { repro, config, analysis, games, coverage, hamming } = payload;
  const { summary, chiSquare, zScores, delays, cooccurrence } = analysis;

  const lines: string[] = [];

  lines.push('# LOTOFÁCIL QUANT ENGINE — RELATÓRIO TÉCNICO E CIENTÍFICO');
  lines.push(`**Versão do Engine:** \`v${repro.engineVersion}\` | **Data:** \`${repro.timestamp}\``);
  lines.push(`**Seed PRNG (xoshiro128**):** \`${repro.seed}\` | **Schema:** \`v${repro.schemaVersion}\``);
  lines.push('');

  lines.push('---');
  lines.push('## 1. IDENTIFICAÇÃO DO DATASET E INTEGRIDADE');
  lines.push(`- **Hash Criptográfico Canônico (SHA-256):** \`${repro.datasetHash}\``);
  lines.push(`- **Total de Concursos Analisados:** ${summary.contestsCount}`);
  lines.push(`- **Primeiro Concurso:** #${summary.firstContest ?? 'N/A'}`);
  lines.push(
    `- **Último Concurso Analisado:** #${summary.lastContest ?? 'N/A'} (${summary.lastDrawDate ?? 'Sem data'})`,
  );
  lines.push(`- **Dezenas Sorteadas no Último Concurso:** \`${formatCombination(summary.lastDrawNumbers)}\``);
  lines.push('');

  lines.push('---');
  lines.push('## 2. TESTE DE EQUIPROBABILIDADE (QUI-QUADRADO DE PEARSON)');
  lines.push('> [!NOTE]');
  lines.push(
    '> **Ajuste para Amostragem Sem Reposição:** Como cada concurso sorteia 15 dezenas sem reposição de uma urna com 25 bolas, a soma clássica de Pearson é reduzida por (10/24). Reportamos tanto o Pearson ingênuo quanto a estatística ajustada por população finita (FPC).',
  );
  lines.push('');
  lines.push(`- **Estatística Pearson Clássica:** \`χ² = ${chiSquare.statistic.toFixed(4)}\` (gl = 24)`);
  lines.push(`- **p-valor Ingênuo (Pearson sem correção):** \`${chiSquare.pearsonPValue.toFixed(6)}\``);
  lines.push(`- **Fator FPC (N-1)/(N-n):** \`2.40\``);
  lines.push(
    `- **Estatística Qui-Quadrado Ajustada:** \`χ²_adj = ${chiSquare.adjustedStatistic.toFixed(4)}\``,
  );
  lines.push(`- **p-valor Rigoroso Ajustado:** \`${chiSquare.pValue.toExponential(4)}\``);
  lines.push(`- **Diagnóstico Epistemológico:** ${chiSquare.conclusion}`);
  lines.push('');

  lines.push('---');
  lines.push('## 3. EXPECTATIVAS TEÓRICAS VS MÉDIAS OBSERVADAS');
  lines.push('| Variável | E[X] Teórico | Desv. Padrão Teórico | Média Observada | Desvio da Média |');
  lines.push('|---|---|---|---|---|');
  lines.push(
    `| Soma das 15 dezenas | 195.000 | 18.028 | ${summary.meanSum.toFixed(3)} | ${(summary.meanSum - 195).toFixed(3)} |`,
  );
  lines.push(
    `| Pares | 7.200 | 1.249 | ${summary.meanEvens.toFixed(3)} | ${(summary.meanEvens - 7.2).toFixed(3)} |`,
  );
  lines.push(
    `| Primos | 5.400 | 1.200 | ${summary.meanPrimes.toFixed(3)} | ${(summary.meanPrimes - 5.4).toFixed(3)} |`,
  );
  lines.push(
    `| Moldura (16 dezenas) | 9.600 | 1.200 | ${summary.meanFrame.toFixed(3)} | ${(summary.meanFrame - 9.6).toFixed(3)} |`,
  );
  lines.push(
    `| Miolo (9 dezenas) | 5.400 | 1.200 | ${summary.meanCore.toFixed(3)} | ${(summary.meanCore - 5.4).toFixed(3)} |`,
  );
  lines.push(
    `| Fibonacci (7 dezenas) | 4.200 | 1.122 | ${summary.meanFibonacci.toFixed(3)} | ${(summary.meanFibonacci - 4.2).toFixed(3)} |`,
  );
  lines.push(
    `| Repetição do Concurso Anterior | 9.000 | 1.225 | ${summary.meanRepeated.toFixed(3)} | ${(summary.meanRepeated - 9.0).toFixed(3)} |`,
  );
  lines.push('');

  lines.push('---');
  lines.push('## 4. ANÁLISE TÉRMICA (Z-SCORE LOCAL E GLOBAL)');
  lines.push(`- **Janela Local:** Últimos ${zScores.windowSize} concursos`);
  lines.push(
    `- **Limiares:** Quente se Z > +${zScores.hotThreshold.toFixed(1)}, Fria se Z < ${zScores.coldThreshold.toFixed(1)}`,
  );
  lines.push(`- **Distribuição de Dezenas Disponíveis:**`);
  lines.push(
    `  - **Quentes (${zScores.counts.hot}):** \`${zScores.hotNumbers.map((n) => String(n).padStart(2, '0')).join(' ')}\``,
  );
  lines.push(
    `  - **Neutras (${zScores.counts.neutral}):** \`${zScores.neutralNumbers.map((n) => String(n).padStart(2, '0')).join(' ')}\``,
  );
  lines.push(
    `  - **Frias (${zScores.counts.cold}):** \`${zScores.coldNumbers.map((n) => String(n).padStart(2, '0')).join(' ')}\``,
  );
  lines.push('');

  lines.push('---');
  lines.push('## 5. ATRASOS (GAPS DE AUSÊNCIA) E ANOMALIAS');
  const alertDelays = delays.delays.filter((d) => d.status === 'ABOVE_1_5_SIGMA');
  const attentionDelays = delays.delays.filter((d) => d.status === 'ATTENTION');
  lines.push(
    `- **Dezenas em Estado de Alerta (> μ + 1.5σ):** ${alertDelays.length > 0 ? alertDelays.map((d) => `Dezena ${String(d.number).padStart(2, '0')} (atraso atual ${d.currentDelay} > limiar ${d.threshold1_5Sigma.toFixed(1)})`).join(', ') : 'Nenhuma'}`,
  );
  lines.push(
    `- **Dezenas em Atenção (> μ + 1.0σ):** ${attentionDelays.length > 0 ? attentionDelays.map((d) => `Dezena ${String(d.number).padStart(2, '0')} (atraso ${d.currentDelay})`).join(', ') : 'Nenhuma'}`,
  );
  lines.push(
    `- **Maior Atraso Histórico Registrado:** Dezena ${String(delays.longestDelayOverall.number).padStart(2, '0')} com ${delays.longestDelayOverall.maxDelay} concursos consecutivos ausente.`,
  );
  lines.push('');

  lines.push('---');
  lines.push('## 6. COOCORRÊNCIA E DEPENDÊNCIA ESTRUTURAL');
  lines.push(`- **Baseline Teórico de Pares:** \`P(i, j) = 0.3500 (35.0%)\``);
  lines.push(`- **Baseline Teórico de Trincas:** \`P(i, j, k) ≈ 0.1978 (19.78%)\``);
  lines.push(`- **Top 5 Pares com Maior Frequência:**`);
  cooccurrence.topPairs.slice(0, 5).forEach((p, idx) => {
    lines.push(
      `  ${idx + 1}. Par [${String(p.numA).padStart(2, '0')}, ${String(p.numB).padStart(2, '0')}]: ${p.occurrenceCount} vezes (${(p.relativeFrequency * 100).toFixed(2)}%, excesso Z=${p.standardizedDifference.toFixed(2)})`,
    );
  });
  lines.push('');

  lines.push('---');
  lines.push('## 7. PORTFÓLIO DE JOGOS GERADOS E AUDITORIA DE CONFORMIDADE');
  lines.push(`- **Total de Jogos Solicitados:** ${config.count}`);
  lines.push(`- **Distância Mínima de Hamming Exigida:** \`d_H >= ${config.minHamming}\``);
  lines.push(
    `- **Status da Auditoria Zero-Trust:** **${games.every((g) => g.status === 'VALID') ? 'TODOS OS JOGOS VÁLIDOS (100% CONFORMES)' : 'INCONSISTÊNCIA DETECTADA'}**`,
  );
  lines.push('');
  lines.push(
    '| Jogo | Dezenas | Soma | Par/Ímp | Prim | Mold | Fib | Rep | Q/N/F | Score | dH Mín | Status |',
  );
  lines.push('|---|---|---|---|---|---|---|---|---|---|---|---|');
  games.forEach((g) => {
    lines.push(
      `| #${g.id} | \`${formatCombination(g.numbers)}\` | ${g.sum} | ${g.evenCount}/${g.oddCount} | ${g.primeCount} | ${g.frameCount} | ${g.fibonacciCount} | ${g.repeatedCount} | ${g.hotCount}/${g.neutralCount}/${g.coldCount} | ${g.score.toFixed(2)} | ${g.minHamming ?? '—'} | **${g.status}** |`,
    );
  });
  lines.push('');

  if (hamming) {
    lines.push('### Métrica de Diversidade e Hamming do Portfólio');
    lines.push(
      `- **Distância de Hamming Mínima Observada:** \`${hamming.minDistance}\` (Requisito: >= ${config.minHamming})`,
    );
    lines.push(`- **Distância Média entre Jogos:** \`${hamming.meanDistance.toFixed(2)}\``);
    lines.push(`- **Distância Máxima:** \`${hamming.maxDistance}\``);
    lines.push('');
  }

  if (coverage) {
    lines.push('### Cobertura do Portfólio (Covering Design Heurístico)');
    lines.push(
      `- **Dezenas Únicas Cobertas:** ${coverage.numbersCoveredCount} de 25 (${(coverage.numbersCoverageRatio * 100).toFixed(1)}%)`,
    );
    lines.push(
      `- **Pares Únicos Cobertos:** ${coverage.uniquePairsCoveredCount} de 300 (${(coverage.pairsCoverageRatio * 100).toFixed(1)}%)`,
    );
    lines.push(`- **Média de Dezenas Comuns entre Jogos:** ${coverage.meanIntersection.toFixed(2)} dezenas`);
    lines.push('');
  }

  lines.push('================================================================');
  lines.push('*Relatório gerado automaticamente por Lotofácil Quant Engine.*');

  return lines.join('\n');
}
