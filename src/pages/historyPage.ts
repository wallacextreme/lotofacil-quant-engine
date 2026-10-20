/**
 * Página de Histórico e Ingestão de Concursos (§7).
 */
import type { AppState } from '../app/state';
import { formatDateBR } from '../core/data/normalizer';
import { epistemicBadge } from '../components/epistemicBadge';
import { computeFeatures } from '../core/domain/features';

export function renderHistoryPage(state: AppState): string {
  const contests = state.currentContests;
  const ds = state.currentDataset;

  return `
    <div class="space-y-6 max-w-7xl mx-auto">
      <!-- Header & Import Action -->
      <div class="glass-panel p-5 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div class="flex items-center gap-2 mb-1">
            <h2 class="text-lg font-bold text-white tracking-tight">Histórico de Concursos</h2>
            ${epistemicBadge('FATO')}
          </div>
          <p class="text-xs text-slate-400">
            Total de concursos registrados: <strong class="text-slate-200 font-mono-code">${contests.length}</strong>
            ${ds ? `· Importado via ${ds.sourceFormat.toUpperCase()}` : ''}
          </p>
        </div>

        <div class="flex items-center gap-3">
          <button id="btn-import-history" class="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs transition shadow-sm flex items-center gap-2">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/></svg>
            Importar Novo Histórico (.xlsx / .csv)
          </button>
        </div>
      </div>

      <!-- Contests Table -->
      <div class="glass-panel rounded-3xl overflow-hidden">
        <div class="p-4 border-b border-slate-800 flex items-center justify-between">
          <h3 class="text-xs font-bold text-white uppercase tracking-wider">Concursos Ordenados</h3>
          <span class="text-xs text-slate-400">Exibindo os concursos mais recentes primeiro</span>
        </div>

        <div class="overflow-x-auto max-h-[65vh]">
          <table class="w-full text-left text-xs border-collapse">
            <thead class="sticky top-0 bg-slate-900/90 backdrop-blur-md text-[10px] uppercase font-bold text-slate-400 border-b border-slate-800">
              <tr>
                <th class="py-3 px-4">Concurso</th>
                <th class="py-3 px-4">Data</th>
                <th class="py-3 px-4">Dezenas Sorteadas (15)</th>
                <th class="py-3 px-4">Soma</th>
                <th class="py-3 px-4">Par/Ímp</th>
                <th class="py-3 px-4">Primos</th>
                <th class="py-3 px-4">Moldura</th>
                <th class="py-3 px-4">Repetidas</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-800/60 font-mono-code">
              ${
                contests.length === 0
                  ? `<tr><td colspan="8" class="text-center py-12 text-slate-500 font-sans">Nenhum concurso carregado.</td></tr>`
                  : [...contests]
                      .reverse()
                      .slice(0, 100)
                      .map((c, idx, arr) => {
                        const prev = idx < arr.length - 1 ? arr[idx + 1]!.numbers : null;
                        const feats = computeFeatures(c.numbers, prev);
                        return `
                        <tr class="hover:bg-slate-800/40 transition">
                          <td class="py-2.5 px-4 font-bold text-cyan-400">#${c.contest}</td>
                          <td class="py-2.5 px-4 text-slate-400 text-[11px] font-sans">${formatDateBR(c.date)}</td>
                          <td class="py-2.5 px-4">
                            <div class="flex flex-wrap gap-1">
                              ${c.numbers.map((n) => `<span class="ball-mini text-[10px] w-6 h-6">${String(n).padStart(2, '0')}</span>`).join('')}
                            </div>
                          </td>
                          <td class="py-2.5 px-4 text-slate-300 font-bold">${feats.sum}</td>
                          <td class="py-2.5 px-4 text-slate-400">${feats.evenCount}P / ${feats.oddCount}I</td>
                          <td class="py-2.5 px-4 text-slate-400">${feats.primeCount}</td>
                          <td class="py-2.5 px-4 text-slate-400">${feats.frameCount}</td>
                          <td class="py-2.5 px-4 text-slate-400">${feats.repeatedCount ?? '—'}</td>
                        </tr>
                      `;
                      })
                      .join('')
              }
            </tbody>
          </table>
        </div>
        ${contests.length > 100 ? `<div class="p-3 text-center text-xs text-slate-500 border-t border-slate-800">Mostrando os 100 concursos mais recentes de ${contests.length} registrados.</div>` : ''}
      </div>
    </div>
  `;
}

export function attachHistoryEvents(_state: AppState): void {
  document.getElementById('btn-import-history')?.addEventListener('click', () => {
    document.getElementById('file-importer-input')?.click();
  });
}
