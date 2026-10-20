/**
 * Página de Coocorrência, Trincas & Matriz de Covariância (§15, §16).
 */
import type { AppState } from '../app/state';
import { epistemicBadge } from '../components/epistemicBadge';
import { UNIVERSE_SIZE } from '../core/domain/constants';

export function renderCooccurrencePage(state: AppState): string {
  const an = state.currentAnalysis;
  if (!an) {
    return `<div class="p-8 text-center text-slate-500">Nenhuma análise disponível. Carregue um dataset no Dashboard.</div>`;
  }

  const { cooccurrence, covariance } = an;

  return `
    <div class="space-y-6 max-w-7xl mx-auto">
      <!-- Title & Epistemic Header -->
      <div class="glass-panel p-5 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div class="flex items-center gap-2 mb-1">
            <h2 class="text-lg font-bold text-white tracking-tight">Coocorrência, Trincas & Covariância Estrutural</h2>
            ${epistemicBadge('FATO')}
            ${epistemicBadge('ESTATISTICA')}
          </div>
          <p class="text-xs text-slate-400">
            Baselines teóricos: <strong>P(par) = 0,3500 (35%)</strong> e <strong>P(trinca) = 0,1978 (19,78%)</strong> sob amostragem uniforme de 15 dezenas sem reposição.
          </p>
        </div>

        <div class="p-3 rounded-xl bg-slate-900 border border-slate-800 text-[11px] text-slate-300 max-w-sm">
          <strong>Dependência Estrutural (§16):</strong> A covariância teórica entre duas dezenas quaisquer é rigorosamente <code class="text-rose-400">-0.0100</code> (correlação <code class="text-rose-400">-0.0417</code>), decorrente da soma fixa de 15 dezenas por jogo.
        </div>
      </div>

      <!-- Rankings: Pares e Trincas -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <!-- Top Pares -->
        <div class="glass-panel p-5 rounded-3xl space-y-3">
          <div class="flex items-center justify-between">
            <h3 class="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
              Pares com Maior Frequência (Top 8)
              ${epistemicBadge('ESTATISTICA')}
            </h3>
            <span class="text-[10px] text-slate-400 font-mono-code">Baseline: 35.0%</span>
          </div>

          <div class="space-y-1.5 font-mono-code text-xs">
            ${cooccurrence.topPairs
              .slice(0, 8)
              .map(
                (p, idx) => `
              <div class="p-2 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <span class="text-slate-500 font-bold w-4">${idx + 1}.</span>
                  <div class="flex gap-1">
                    <span class="ball-mini w-6 h-6 text-[10px]">${String(p.numA).padStart(2, '0')}</span>
                    <span class="ball-mini w-6 h-6 text-[10px]">${String(p.numB).padStart(2, '0')}</span>
                  </div>
                  <span class="text-slate-300 text-[11px] font-sans">Par [${p.numA}, ${p.numB}]</span>
                </div>
                <div class="flex items-center gap-3">
                  <span class="text-[10px] text-slate-400">${p.occurrenceCount} vezes</span>
                  <span class="font-bold text-cyan-400">${(p.relativeFrequency * 100).toFixed(2)}%</span>
                  <span class="text-[10px] ${p.standardizedDifference > 0 ? 'text-emerald-400' : 'text-slate-400'}">Z=${p.standardizedDifference > 0 ? '+' : ''}${p.standardizedDifference.toFixed(2)}</span>
                </div>
              </div>
            `,
              )
              .join('')}
          </div>
        </div>

        <!-- Top Trincas -->
        <div class="glass-panel p-5 rounded-3xl space-y-3">
          <div class="flex items-center justify-between">
            <h3 class="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
              Trincas Mais Frequentes (Top 8)
              ${epistemicBadge('ESTATISTICA')}
            </h3>
            <span class="text-[10px] text-slate-400 font-mono-code">Baseline: 19.78%</span>
          </div>

          <div class="space-y-1.5 font-mono-code text-xs">
            ${cooccurrence.topTriplets
              .slice(0, 8)
              .map(
                (t, idx) => `
              <div class="p-2 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <span class="text-slate-500 font-bold w-4">${idx + 1}.</span>
                  <div class="flex gap-1">
                    <span class="ball-mini w-6 h-6 text-[10px]">${String(t.numA).padStart(2, '0')}</span>
                    <span class="ball-mini w-6 h-6 text-[10px]">${String(t.numB).padStart(2, '0')}</span>
                    <span class="ball-mini w-6 h-6 text-[10px]">${String(t.numC).padStart(2, '0')}</span>
                  </div>
                  <span class="text-slate-300 text-[11px] font-sans">[${t.numA}, ${t.numB}, ${t.numC}]</span>
                </div>
                <div class="flex items-center gap-3">
                  <span class="text-[10px] text-slate-400">${t.occurrenceCount} vezes</span>
                  <span class="font-bold text-indigo-400">${(t.relativeFrequency * 100).toFixed(2)}%</span>
                  <span class="text-[10px] ${t.standardizedDifference > 0 ? 'text-emerald-400' : 'text-slate-400'}">Z=${t.standardizedDifference > 0 ? '+' : ''}${t.standardizedDifference.toFixed(2)}</span>
                </div>
              </div>
            `,
              )
              .join('')}
          </div>
        </div>
      </div>

      <!-- Matriz de Correlação dos Indicadores Binários (25x25) -->
      <div class="glass-panel rounded-3xl overflow-hidden p-5 space-y-3">
        <div class="flex items-center justify-between pb-2 border-b border-slate-800">
          <div>
            <h3 class="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
              Matriz de Correlação de Pearson (25×25)
              ${epistemicBadge('ESTATISTICA')}
            </h3>
            <p class="text-[11px] text-slate-400">Correlação linear entre os indicadores binários de presença das dezenas.</p>
          </div>
          <span class="text-[10px] text-slate-400 font-mono-code">Diagonal = 1.000 · Referência = -0.042</span>
        </div>

        <div class="overflow-x-auto max-h-[500px]">
          <table class="w-full text-center text-[10px] font-mono-code border-collapse">
            <thead>
              <tr class="bg-slate-900 text-slate-400">
                <th class="p-1 border border-slate-800 bg-slate-950">Dez</th>
                ${Array.from({ length: UNIVERSE_SIZE }, (_, j) => `<th class="p-1 border border-slate-800">${String(j + 1).padStart(2, '0')}</th>`).join('')}
              </tr>
            </thead>
            <tbody>
              ${covariance.correlationMatrix
                .map(
                  (row, i) => `
                <tr>
                  <td class="p-1 font-bold text-cyan-400 border border-slate-800 bg-slate-950">${String(i + 1).padStart(2, '0')}</td>
                  ${row
                    .map((r, j) => {
                      const isDiag = i === j;
                      const rStr = r.toFixed(3);
                      const bgStyle = isDiag
                        ? 'background: #0f172a; color: #38bdf8;'
                        : r > 0
                          ? 'background: rgba(16, 185, 129, 0.15); color: #6ee7b7;'
                          : r < -0.07
                            ? 'background: rgba(244, 63, 94, 0.15); color: #fda4af;'
                            : 'color: #94a3b8;';
                      return `
                      <td class="p-1 border border-slate-800/60" style="${bgStyle}">
                        ${rStr}
                      </td>
                    `;
                    })
                    .join('')}
                </tr>
              `,
                )
                .join('')}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;
}
