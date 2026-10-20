/**
 * Página de Relatórios Científicos (§32).
 */
import type { AppState } from '../app/state';
import { epistemicBadge } from '../components/epistemicBadge';
import { generateScientificReportMarkdown } from '../services/reportService';

export function renderReportsPage(state: AppState): string {
  const an = state.currentAnalysis;
  const outcome = state.currentOutcome;

  if (!an) {
    return `<div class="p-8 text-center text-slate-500">Nenhum relatório disponível. Carregue um dataset no Dashboard.</div>`;
  }

  const reportMd = generateScientificReportMarkdown({
    repro: outcome?.repro ?? {
      datasetHash: state.currentDataset?.hash ?? 'NO_DATASET',
      datasetSize: state.currentContests.length,
      contestStart: state.currentContests[0]?.contest ?? 0,
      contestEnd: state.currentContests[state.currentContests.length - 1]?.contest ?? 0,
      lastContest: an.summary.lastContest ?? 0,
      timestamp: new Date().toISOString(),
      engineVersion: '1.0.0',
      schemaVersion: 1,
      windowSize: an.params.windowSize,
      hotThreshold: an.params.hotThreshold,
      coldThreshold: an.params.coldThreshold,
      weights: state.currentConfig.weights,
      seed: state.currentConfig.seed,
    },
    config: state.currentConfig,
    analysis: an,
    games: outcome?.auditedGames ?? [],
    coverage: outcome?.coverage ?? null,
    hamming: outcome?.hamming ?? null,
  });

  return `
    <div class="space-y-6 max-w-7xl mx-auto">
      <!-- Header -->
      <div class="glass-panel p-5 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div class="flex items-center gap-2 mb-1">
            <h2 class="text-lg font-bold text-white tracking-tight">Relatório Científico & Reprodutibilidade</h2>
            ${epistemicBadge('FATO')}
            ${epistemicBadge('ESTATISTICA')}
          </div>
          <p class="text-xs text-slate-400">
            Documentação técnica formal em Markdown contendo todas as variáveis, testes qui-quadrado, matrizes e apostas geradas.
          </p>
        </div>

        <div class="flex items-center gap-2">
          <button id="btn-copy-report" class="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition">
            Copiar Texto
          </button>
          <button id="btn-download-report" class="px-4 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold shadow-sm transition">
            Baixar Relatório (.md)
          </button>
        </div>
      </div>

      <!-- Report Box -->
      <div class="glass-panel rounded-3xl p-6 overflow-hidden">
        <textarea id="report-text-area" readonly class="w-full h-[65vh] bg-slate-950/80 border border-slate-800 rounded-2xl p-4 font-mono-code text-xs text-slate-300 leading-relaxed resize-none focus:outline-none focus:border-cyan-500">${reportMd}</textarea>
      </div>
    </div>
  `;
}

export function attachReportsEvents(_state: AppState): void {
  const ta = document.getElementById('report-text-area') as HTMLTextAreaElement;

  document.getElementById('btn-copy-report')?.addEventListener('click', async () => {
    if (ta) {
      await navigator.clipboard.writeText(ta.value);
      alert('Relatório copiado para a área de transferência.');
    }
  });

  document.getElementById('btn-download-report')?.addEventListener('click', () => {
    if (ta) {
      const blob = new Blob([ta.value], { type: 'text/markdown;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `relatorio_cientifico_lotofacil_${Date.now()}.md`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  });
}
