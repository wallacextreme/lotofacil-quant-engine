/**
 * Página de Cadeias de Markov & Transições Históricas (§13).
 */
import type { AppState } from '../app/state';
import { epistemicBadge } from '../components/epistemicBadge';
import { UNIVERSE_SIZE } from '../core/domain/constants';

export function renderMarkovPage(state: AppState): string {
  const an = state.currentAnalysis;
  if (!an) {
    return `<div class="p-8 text-center text-slate-500">Nenhuma análise disponível. Carregue um dataset no Dashboard.</div>`;
  }

  const { markov } = an;

  return `
    <div class="space-y-6 max-w-7xl mx-auto">
      <!-- Header -->
      <div class="glass-panel p-5 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div class="flex items-center gap-2 mb-1">
            <h2 class="text-lg font-bold text-white tracking-tight">Cadeias de Markov de 1ª Ordem</h2>
            ${epistemicBadge('ESTATISTICA')}
          </div>
          <p class="text-xs text-slate-400">
            Matriz de transição empírica condicional P(X_t(j)=1 | X_{t-1}(i)=1) entre concursos consecutivos (${markov.transitionsCount} pares de transição).
          </p>
        </div>

        <div class="p-3 rounded-xl bg-amber-950/30 border border-amber-800/50 text-[11px] text-amber-300 max-w-md">
          <strong>Aviso Epistemológico:</strong> A matriz de Markov descreve a persistência e alternância observada no histórico. Não constitui previsão nem altera a independência física dos sorteios futuros.
        </div>
      </div>

      <!-- Rankings de Retenção e Alternância -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <!-- Maiores Retenções (Repetição da mesma dezena) -->
        <div class="glass-panel p-5 rounded-3xl space-y-3">
          <h3 class="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
            Maiores Retenções (P(X_t = 1 | X_{t-1} = 1))
            ${epistemicBadge('ESTATISTICA')}
          </h3>
          <p class="text-[11px] text-slate-400">Dezenas que mais repetiram quando saíram no concurso imediatamente anterior.</p>

          <div class="space-y-1.5 font-mono-code text-xs">
            ${markov.highestRetentions
              .slice(0, 5)
              .map(
                (r, idx) => `
              <div class="p-2 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <span class="text-slate-500 font-bold w-4">${idx + 1}.</span>
                  <span class="ball-mini w-6 h-6 text-[10px]">${String(r.number).padStart(2, '0')}</span>
                  <span class="text-slate-200">Dezena ${String(r.number).padStart(2, '0')}</span>
                </div>
                <div class="flex items-center gap-3">
                  <span class="text-[10px] text-slate-400">${r.retentionCount} / ${r.totalOccurrencesPrior}</span>
                  <span class="font-bold text-emerald-400">${(r.retentionProbability * 100).toFixed(2)}%</span>
                </div>
              </div>
            `,
              )
              .join('')}
          </div>
        </div>

        <!-- Maiores Alternâncias (Ausência após presença) -->
        <div class="glass-panel p-5 rounded-3xl space-y-3">
          <h3 class="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
            Maiores Alternâncias (P(X_t = 0 | X_{t-1} = 1))
            ${epistemicBadge('ESTATISTICA')}
          </h3>
          <p class="text-[11px] text-slate-400">Dezenas que mais falharam após terem saído no concurso anterior.</p>

          <div class="space-y-1.5 font-mono-code text-xs">
            ${markov.highestAlternations
              .slice(0, 5)
              .map(
                (r, idx) => `
              <div class="p-2 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <span class="text-slate-500 font-bold w-4">${idx + 1}.</span>
                  <span class="ball-mini w-6 h-6 text-[10px]">${String(r.number).padStart(2, '0')}</span>
                  <span class="text-slate-200">Dezena ${String(r.number).padStart(2, '0')}</span>
                </div>
                <div class="flex items-center gap-3">
                  <span class="text-[10px] text-slate-400">${r.alternationCount} / ${r.totalOccurrencesPrior}</span>
                  <span class="font-bold text-rose-400">${(r.alternationProbability * 100).toFixed(2)}%</span>
                </div>
              </div>
            `,
              )
              .join('')}
          </div>
        </div>
      </div>

      <!-- Matriz 25x25 Completa -->
      <div class="glass-panel rounded-3xl overflow-hidden space-y-2 p-5">
        <div class="flex items-center justify-between pb-2 border-b border-slate-800">
          <h3 class="text-xs font-bold text-white uppercase tracking-wider">Matriz Completa de Transição Cruzada (25×25)</h3>
          <span class="text-[10px] text-slate-400 font-mono-code">Linha: tempo t-1 · Coluna: tempo t</span>
        </div>

        <div class="overflow-x-auto max-h-[500px]">
          <table class="w-full text-center text-[10px] font-mono-code border-collapse">
            <thead>
              <tr class="bg-slate-900 text-slate-400">
                <th class="p-1 border border-slate-800 bg-slate-950">t-1 \\ t</th>
                ${Array.from({ length: UNIVERSE_SIZE }, (_, j) => `<th class="p-1 border border-slate-800">${String(j + 1).padStart(2, '0')}</th>`).join('')}
              </tr>
            </thead>
            <tbody>
              ${markov.presenceTransition
                .map(
                  (row, i) => `
                <tr>
                  <td class="p-1 font-bold text-cyan-400 border border-slate-800 bg-slate-950">${String(i + 1).padStart(2, '0')}</td>
                  ${row
                    .map((p, j) => {
                      const isSelf = i === j;
                      const pct = (p * 100).toFixed(1);
                      // Destaque visual para desvios de 60%
                      const bgStyle =
                        p > 0.63
                          ? 'background: rgba(16, 185, 129, 0.2); color: #6ee7b7;'
                          : p < 0.57
                            ? 'background: rgba(244, 63, 94, 0.15); color: #fda4af;'
                            : 'color: #94a3b8;';
                      return `
                      <td class="p-1 border border-slate-800/60 ${isSelf ? 'font-bold ring-1 ring-cyan-500/40' : ''}" style="${bgStyle}">
                        ${pct}
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
