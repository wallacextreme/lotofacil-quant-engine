/**
 * Página de Análise Estatística & Testes de Hipótese (§9, §10, §11, §14).
 */
import type { AppState } from '../app/state';
import { epistemicBadge } from '../components/epistemicBadge';

export function renderStatisticsPage(state: AppState): string {
  const an = state.currentAnalysis;

  if (!an) {
    return `<div class="p-8 text-center text-slate-500">Nenhuma análise disponível. Carregue um dataset no Dashboard.</div>`;
  }

  const { chiSquare, zScores, delays, summary, theoreticalMoments } = an;

  return `
    <div class="space-y-6 max-w-7xl mx-auto">
      <!-- Title & Epistemic Header -->
      <div class="glass-panel p-5 rounded-2xl flex items-center justify-between">
        <div>
          <div class="flex items-center gap-2 mb-1">
            <h2 class="text-lg font-bold text-white tracking-tight">Análise Estatística & Inferência</h2>
            ${epistemicBadge('ESTATISTICA')}
            ${epistemicBadge('FATO')}
          </div>
          <p class="text-xs text-slate-400">
            Amostra de <strong>${summary.contestsCount}</strong> concursos. Teste de equiprobabilidade H0: p_i = 0,60 e momentos teóricos.
          </p>
        </div>
      </div>

      <!-- Teste Qui-Quadrado -->
      <div class="glass-panel p-6 rounded-3xl space-y-4">
        <div class="flex items-center justify-between border-b border-slate-800 pb-3">
          <div>
            <h3 class="text-sm font-bold text-white flex items-center gap-2">
              Teste de Aderência Qui-Quadrado (χ²)
              ${epistemicBadge('ESTATISTICA')}
            </h3>
            <p class="text-xs text-slate-400">Hipótese Nula H0: todas as 25 dezenas possuem a mesma probabilidade p = 15/25 = 0,60 de serem sorteadas.</p>
          </div>
          <span class="text-xs font-mono-code px-3 py-1 rounded-lg bg-slate-900 border border-slate-700 text-slate-300">df = 24</span>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div class="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-1">
            <span class="text-[10px] uppercase font-bold text-slate-400">Pearson Clássico (Ingênuo)</span>
            <div class="text-2xl font-black font-mono-code text-white">χ² = ${chiSquare.statistic.toFixed(4)}</div>
            <div class="text-xs text-slate-400">p-valor: <strong class="text-slate-200 font-mono-code">${chiSquare.pearsonPValue.toFixed(6)}</strong></div>
            <p class="text-[10px] text-slate-500 pt-1">Ignora amostragem sem reposição (E[χ²]=10, não 24).</p>
          </div>

          <div class="p-4 rounded-2xl bg-slate-900/60 border border-cyan-900/50 space-y-1 bg-cyan-950/10">
            <span class="text-[10px] uppercase font-bold text-cyan-400">Qui-Quadrado Ajustado (FPC)</span>
            <div class="text-2xl font-black font-mono-code text-cyan-300">χ²_adj = ${chiSquare.adjustedStatistic.toFixed(4)}</div>
            <div class="text-xs text-slate-400">p-valor rigoroso: <strong class="text-cyan-400 font-mono-code">${chiSquare.pValue < 0.0001 ? chiSquare.pValue.toExponential(4) : chiSquare.pValue.toFixed(6)}</strong></div>
            <p class="text-[10px] text-cyan-500/80 pt-1">Fator FPC = 2.40 (amostragem sem reposição n=15, N=25).</p>
          </div>

          <div class="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-col justify-between">
            <span class="text-[10px] uppercase font-bold text-slate-400">Diagnóstico Rigoroso</span>
            <p class="text-xs text-slate-300 font-medium leading-relaxed my-1">${chiSquare.conclusion}</p>
            <span class="text-[10px] text-slate-500 font-mono-code">Nível de significância: α = 0.05</span>
          </div>
        </div>
      </div>

      <!-- Tabela de Momentos Teóricos vs Médias Observadas -->
      <div class="glass-panel rounded-3xl overflow-hidden">
        <div class="p-4 border-b border-slate-800 flex items-center justify-between">
          <h3 class="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
            Expectativas Teóricas Exatas vs Médias Observadas
            ${epistemicBadge('FATO')}
          </h3>
          <span class="text-xs text-slate-400 font-mono-code">Sem assunção indevida de independência</span>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs border-collapse">
            <thead class="bg-slate-900/80 text-[10px] uppercase font-bold text-slate-400 border-b border-slate-800 font-mono-code">
              <tr>
                <th class="py-3 px-4">Variável</th>
                <th class="py-3 px-4">E[X] Teórico</th>
                <th class="py-3 px-4">σ Teórico</th>
                <th class="py-3 px-4">Média Observada</th>
                <th class="py-3 px-4">Desvio da Média (Δ)</th>
                <th class="py-3 px-4">Método Matemático</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-800/60 font-mono-code">
              ${theoreticalMoments
                .map((m) => {
                  let obs = 0;
                  if (m.key === 'sum') obs = summary.meanSum;
                  else if (m.key === 'even') obs = summary.meanEvens;
                  else if (m.key === 'prime') obs = summary.meanPrimes;
                  else if (m.key === 'frame') obs = summary.meanFrame;
                  else if (m.key === 'core') obs = summary.meanCore;
                  else if (m.key === 'fibonacci') obs = summary.meanFibonacci;
                  else if (m.key === 'repeat') obs = summary.meanRepeated;
                  else if (m.key === 'rowEntropy') obs = an.entropy.meanRowEntropy;
                  else if (m.key === 'colEntropy') obs = an.entropy.meanColEntropy;

                  const delta = obs - m.mean;
                  return `
                  <tr class="hover:bg-slate-800/40 transition">
                    <td class="py-2.5 px-4 font-bold text-white font-sans">${m.label}</td>
                    <td class="py-2.5 px-4 text-cyan-400 font-bold">${m.mean.toFixed(3)}</td>
                    <td class="py-2.5 px-4 text-slate-400">${m.sd.toFixed(3)}</td>
                    <td class="py-2.5 px-4 text-slate-200 font-bold">${obs > 0 ? obs.toFixed(3) : '—'}</td>
                    <td class="py-2.5 px-4 ${Math.abs(delta) < 0.1 ? 'text-emerald-400' : 'text-amber-400'}">${obs > 0 ? (delta > 0 ? '+' : '') + delta.toFixed(3) : '—'}</td>
                    <td class="py-2.5 px-4 text-[10px] text-slate-500 font-sans">${m.method}</td>
                  </tr>
                `;
                })
                .join('')}
            </tbody>
          </table>
        </div>
      </div>

      <!-- Tabela Z-Score e Atrasos das 25 Dezenas -->
      <div class="glass-panel rounded-3xl overflow-hidden">
        <div class="p-4 border-b border-slate-800 flex items-center justify-between">
          <h3 class="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
            Classificação das 25 Dezenas (Z-Score & Atrasos)
            ${epistemicBadge('ESTATISTICA')}
          </h3>
          <span class="text-xs text-slate-400">Janela Local W=${zScores.windowSize}</span>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs border-collapse">
            <thead class="bg-slate-900/80 text-[10px] uppercase font-bold text-slate-400 border-b border-slate-800 font-mono-code">
              <tr>
                <th class="py-3 px-3">Dez</th>
                <th class="py-3 px-3">Freq. Global</th>
                <th class="py-3 px-3">Rel. Global</th>
                <th class="py-3 px-3">Z Global</th>
                <th class="py-3 px-3">Freq. Local</th>
                <th class="py-3 px-3">Z Local</th>
                <th class="py-3 px-3">Classe</th>
                <th class="py-3 px-3">Atraso Atual</th>
                <th class="py-3 px-3">Atraso Médio</th>
                <th class="py-3 px-3">Atraso Máx</th>
                <th class="py-3 px-3">Alerta (>1.5σ)</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-800/60 font-mono-code text-[11px]">
              ${zScores.scores
                .map((z, idx) => {
                  const d = delays.delays[idx]!;
                  return `
                  <tr class="hover:bg-slate-800/40 transition">
                    <td class="py-2 px-3 font-bold text-cyan-400"><span class="ball-mini w-6 h-6 text-[10px]">${String(z.number).padStart(2, '0')}</span></td>
                    <td class="py-2 px-3 text-slate-200">${z.globalFrequency}</td>
                    <td class="py-2 px-3 text-slate-400">${(z.globalRelative * 100).toFixed(2)}%</td>
                    <td class="py-2 px-3 ${z.globalZ > 1 ? 'text-rose-400' : z.globalZ < -1 ? 'text-slate-400' : 'text-slate-300'}">${z.globalZ > 0 ? '+' : ''}${z.globalZ.toFixed(2)}</td>
                    <td class="py-2 px-3 text-slate-200">${z.localFrequency}</td>
                    <td class="py-2 px-3 font-bold ${z.localZ > 1 ? 'text-rose-400' : z.localZ < -1 ? 'text-slate-400' : 'text-sky-400'}">${z.localZ > 0 ? '+' : ''}${z.localZ.toFixed(2)}</td>
                    <td class="py-2 px-3">
                      <span class="px-2 py-0.5 rounded text-[10px] font-bold ${z.temperature === 'HOT' ? 'bg-rose-950 text-rose-300 border border-rose-800' : z.temperature === 'COLD' ? 'bg-slate-800 text-slate-400 border border-slate-700' : 'bg-sky-950 text-sky-300 border border-sky-800'}">
                        ${z.temperature}
                      </span>
                    </td>
                    <td class="py-2 px-3 font-bold text-white">${d.currentDelay}</td>
                    <td class="py-2 px-3 text-slate-400">${d.meanDelay.toFixed(2)}</td>
                    <td class="py-2 px-3 text-slate-400">${d.maxDelay}</td>
                    <td class="py-2 px-3 font-bold ${d.status === 'ABOVE_1_5_SIGMA' ? 'text-rose-400' : d.status === 'ATTENTION' ? 'text-amber-400' : 'text-slate-500'}">
                      ${d.statusLabel}
                    </td>
                  </tr>
                `;
                })
                .join('')}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;
}
