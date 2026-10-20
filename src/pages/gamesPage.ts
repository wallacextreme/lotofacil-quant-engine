/**
 * Página de Jogos Gerados, Auditoria Zero-Trust & Exportação (§31, §33).
 */
import { appState, type AppState } from '../app/state';
import { epistemicBadge } from '../components/epistemicBadge';
import { exportAsCsv, exportAsJson, exportAsTxt, exportAsXlsx } from '../services/exportService';

function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function renderGamesPage(state: AppState): string {
  const outcome = state.currentOutcome;

  if (!outcome || outcome.auditedGames.length === 0) {
    return `
      <div class="space-y-6 max-w-xl mx-auto my-12 text-center glass-panel p-8 rounded-3xl border-dashed border-2 border-slate-700">
        <div class="w-16 h-16 rounded-2xl bg-cyan-950/80 border border-cyan-800 text-cyan-400 mx-auto flex items-center justify-center">
          <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"/></svg>
        </div>
        <h2 class="text-xl font-bold text-white tracking-tight">Nenhum Jogo Gerado no Momento</h2>
        <p class="text-xs text-slate-400 leading-relaxed">
          Configure as restrições duras e os pesos heurísticos na aba <strong>Gerador Combinatório</strong> e clique em <em>GERAR JOGOS</em>.
        </p>
        <button id="btn-goto-generator" class="px-5 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs transition shadow-md">
          Abrir Gerador
        </button>
      </div>
    `;
  }

  const { auditedGames, coverage, hamming, repro } = outcome;
  const allValid = auditedGames.every((g) => g.status === 'VALID');

  return `
    <div class="space-y-6 max-w-7xl mx-auto">
      <!-- Header & Export Toolbar -->
      <div class="glass-panel p-5 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div class="flex items-center gap-2 mb-1">
            <h2 class="text-lg font-bold text-white tracking-tight">Portfólio de Jogos & Auditoria Zero-Trust</h2>
            ${epistemicBadge('OTIMIZACAO')}
            <span class="px-2.5 py-0.5 rounded text-[11px] font-bold ${allValid ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : 'bg-rose-950 text-rose-300 border border-rose-800'}">
              ${allValid ? '100% VÁLIDOS' : 'INCONSISTENTE'}
            </span>
          </div>
          <p class="text-xs text-slate-400">
            Total: <strong>${auditedGames.length} apostas</strong> · Seed PRNG: <code class="text-cyan-400 font-mono-code">${repro.seed}</code> · Min Hamming: <code class="text-cyan-400 font-mono-code">dH >= ${outcome.config.minHamming}</code>
          </p>
        </div>

        <!-- Export Buttons (§33) -->
        <div class="flex flex-wrap items-center gap-2">
          <button id="btn-export-txt" class="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition">
            Exportar TXT
          </button>
          <button id="btn-export-csv" class="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition">
            Exportar CSV
          </button>
          <button id="btn-export-xlsx" class="px-3 py-1.5 rounded-xl bg-emerald-950/60 hover:bg-emerald-900/60 text-emerald-300 text-xs font-semibold border border-emerald-800 transition">
            Exportar XLSX
          </button>
          <button id="btn-export-json" class="px-3 py-1.5 rounded-xl bg-indigo-950/60 hover:bg-indigo-900/60 text-indigo-300 text-xs font-semibold border border-indigo-800 transition">
            Exportar JSON
          </button>
        </div>
      </div>

      <!-- Métricas Rápidas de Portfólio: Hamming & Cobertura -->
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono-code text-xs">
        <div class="glass-panel p-3.5 rounded-2xl">
          <span class="text-[10px] font-sans text-slate-500 uppercase block font-bold">Hamming Mínimo</span>
          <span class="text-xl font-bold text-white">${hamming?.minDistance ?? '—'}</span>
          <span class="text-[10px] font-sans text-slate-400 block mt-0.5">Exigido: >= ${outcome.config.minHamming}</span>
        </div>

        <div class="glass-panel p-3.5 rounded-2xl">
          <span class="text-[10px] font-sans text-slate-500 uppercase block font-bold">Hamming Médio</span>
          <span class="text-xl font-bold text-cyan-400">${hamming ? hamming.meanDistance.toFixed(1) : '—'}</span>
          <span class="text-[10px] font-sans text-slate-400 block mt-0.5">Máx: ${hamming?.maxDistance ?? '—'}</span>
        </div>

        <div class="glass-panel p-3.5 rounded-2xl">
          <span class="text-[10px] font-sans text-slate-500 uppercase block font-bold">1-Cobertura (Dezenas)</span>
          <span class="text-xl font-bold text-emerald-400">${coverage ? `${coverage.numbersCoveredCount} / 25` : '—'}</span>
          <span class="text-[10px] font-sans text-slate-400 block mt-0.5">${coverage ? `${(coverage.numbersCoverageRatio * 100).toFixed(1)}% coberto` : ''}</span>
        </div>

        <div class="glass-panel p-3.5 rounded-2xl">
          <span class="text-[10px] font-sans text-slate-500 uppercase block font-bold">2-Cobertura (Pares)</span>
          <span class="text-xl font-bold text-indigo-400">${coverage ? `${coverage.uniquePairsCoveredCount} / 300` : '—'}</span>
          <span class="text-[10px] font-sans text-slate-400 block mt-0.5">${coverage ? `${(coverage.pairsCoverageRatio * 100).toFixed(1)}% dos pares` : ''}</span>
        </div>
      </div>

      <!-- Painel de Cobertura Exata C(25, 15) = 3.268.760 (§FASE 4 e 6) -->
      ${
        outcome.exactCoverage
          ? `
        <div class="glass-panel p-5 rounded-3xl space-y-4">
          <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-3 border-b border-slate-800 gap-2">
            <div>
              <div class="flex items-center gap-2 mb-1">
                <h3 class="text-xs font-bold text-white uppercase tracking-wider">
                  Avaliação Exata do Espaço Amostral C(25, 15) = 3.268.760 Estados
                </h3>
                ${epistemicBadge('FATO')}
              </div>
              <p class="text-[11px] text-slate-400">
                Enumeração bitwise determinística exata de todos os 3.268.760 sorteios equiprováveis possíveis.
              </p>
            </div>
            <div class="flex items-center gap-2">
              <span class="px-2.5 py-0.5 rounded text-[10px] font-mono-code font-bold bg-cyan-950 text-cyan-300 border border-cyan-800">
                ${outcome.exactCoverage.executionTimeMs.toFixed(0)} ms
              </span>
              <span class="px-2.5 py-0.5 rounded text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-800">
                100% ENUMERADO
              </span>
            </div>
          </div>

          <!-- Métricas de Probabilidade Exata da Carteira -->
          <div class="grid grid-cols-2 sm:grid-cols-5 gap-3 font-mono-code text-xs">
            <div class="p-3 rounded-2xl bg-slate-950/70 border border-slate-800/80">
              <span class="text-[10px] font-sans text-slate-400 uppercase block font-semibold">P(Acerto &ge; 11)</span>
              <span class="text-base font-bold text-cyan-300">
                ${(outcome.exactCoverage.exactProbabilities.atLeast11 * 100).toFixed(2)}%
              </span>
              <span class="text-[9px] font-sans text-slate-500 block mt-0.5">
                1 em ${(1 / outcome.exactCoverage.exactProbabilities.atLeast11).toFixed(1)}
              </span>
            </div>
            <div class="p-3 rounded-2xl bg-slate-950/70 border border-slate-800/80">
              <span class="text-[10px] font-sans text-slate-400 uppercase block font-semibold">P(Acerto &ge; 12)</span>
              <span class="text-base font-bold text-cyan-300">
                ${(outcome.exactCoverage.exactProbabilities.atLeast12 * 100).toFixed(2)}%
              </span>
              <span class="text-[9px] font-sans text-slate-500 block mt-0.5">
                1 em ${(1 / outcome.exactCoverage.exactProbabilities.atLeast12).toFixed(1)}
              </span>
            </div>
            <div class="p-3 rounded-2xl bg-slate-950/70 border border-slate-800/80">
              <span class="text-[10px] font-sans text-slate-400 uppercase block font-semibold">P(Acerto &ge; 13)</span>
              <span class="text-base font-bold text-indigo-300">
                ${(outcome.exactCoverage.exactProbabilities.atLeast13 * 100).toFixed(3)}%
              </span>
              <span class="text-[9px] font-sans text-slate-500 block mt-0.5">
                1 em ${(1 / outcome.exactCoverage.exactProbabilities.atLeast13).toFixed(0)}
              </span>
            </div>
            <div class="p-3 rounded-2xl bg-slate-950/70 border border-slate-800/80">
              <span class="text-[10px] font-sans text-slate-400 uppercase block font-semibold">P(Acerto &ge; 14)</span>
              <span class="text-base font-bold text-amber-300">
                ${(outcome.exactCoverage.exactProbabilities.atLeast14 * 100).toFixed(4)}%
              </span>
              <span class="text-[9px] font-sans text-slate-500 block mt-0.5">
                1 em ${(1 / outcome.exactCoverage.exactProbabilities.atLeast14).toFixed(0)}
              </span>
            </div>
            <div class="p-3 rounded-2xl bg-slate-950/70 border border-slate-800/80">
              <span class="text-[10px] font-sans text-slate-400 uppercase block font-semibold">P(Acerto = 15)</span>
              <span class="text-base font-bold text-emerald-300">
                ${(outcome.exactCoverage.exactProbabilities.exact15 * 100).toFixed(5)}%
              </span>
              <span class="text-[9px] font-sans text-slate-500 block mt-0.5">
                ${outcome.exactCoverage.uniqueGamesCount} em 3.268.760
              </span>
            </div>
          </div>

          <!-- Subconjuntos & Eficiência da União de Boole -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1 text-xs">
            <div class="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800/80 space-y-2">
              <span class="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                Cobertura Combinatória de Subconjuntos (Covering Designs)
              </span>
              <div class="grid grid-cols-3 gap-2 font-mono-code text-[11px]">
                <div class="p-2 rounded-xl bg-slate-900/60 border border-slate-800">
                  <span class="text-[9px] text-slate-500 block">Pares (2-Cob)</span>
                  <strong class="text-emerald-400">${outcome.exactCoverage.subsetCoverage.pairsCovered}</strong> / 300
                  <span class="text-[9px] text-slate-400 block">${(outcome.exactCoverage.subsetCoverage.pairsCoverageRatio * 100).toFixed(1)}%</span>
                </div>
                <div class="p-2 rounded-xl bg-slate-900/60 border border-slate-800">
                  <span class="text-[9px] text-slate-500 block">Ternos (3-Cob)</span>
                  <strong class="text-cyan-400">${outcome.exactCoverage.subsetCoverage.triplesCovered}</strong> / 2.300
                  <span class="text-[9px] text-slate-400 block">${(outcome.exactCoverage.subsetCoverage.triplesCoverageRatio * 100).toFixed(1)}%</span>
                </div>
                <div class="p-2 rounded-xl bg-slate-900/60 border border-slate-800">
                  <span class="text-[9px] text-slate-500 block">Quadras (4-Cob)</span>
                  <strong class="text-indigo-400">${outcome.exactCoverage.subsetCoverage.quadruplesCovered}</strong> / 12.650
                  <span class="text-[9px] text-slate-400 block">${(outcome.exactCoverage.subsetCoverage.quadruplesCoverageRatio * 100).toFixed(1)}%</span>
                </div>
              </div>
            </div>

            <div class="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800/80 space-y-2">
              <span class="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                Eficiência Relativa ao Limite da União de Boole (Union Bound)
              </span>
              <div class="grid grid-cols-3 gap-2 font-mono-code text-[11px]">
                <div class="p-2 rounded-xl bg-slate-900/60 border border-slate-800">
                  <span class="text-[9px] text-slate-500 block">Eficiência &ge; 11</span>
                  <strong class="text-cyan-300">${(outcome.exactCoverage.unionBoundEfficiency.atLeast11 * 100).toFixed(1)}%</strong>
                  <span class="text-[9px] text-slate-500 block">Dispersão real</span>
                </div>
                <div class="p-2 rounded-xl bg-slate-900/60 border border-slate-800">
                  <span class="text-[9px] text-slate-500 block">Eficiência &ge; 12</span>
                  <strong class="text-indigo-300">${(outcome.exactCoverage.unionBoundEfficiency.atLeast12 * 100).toFixed(1)}%</strong>
                  <span class="text-[9px] text-slate-500 block">Dispersão real</span>
                </div>
                <div class="p-2 rounded-xl bg-slate-900/60 border border-slate-800">
                  <span class="text-[9px] text-slate-500 block">Eficiência &ge; 13</span>
                  <strong class="text-emerald-300">${(outcome.exactCoverage.unionBoundEfficiency.atLeast13 * 100).toFixed(1)}%</strong>
                  <span class="text-[9px] text-slate-500 block">Dispersão real</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      `
          : ''
      }

      <!-- Tabela de Jogos Auditados (§31) -->
      <div class="glass-panel rounded-3xl overflow-hidden">
        <div class="p-4 border-b border-slate-800 flex items-center justify-between">
          <h3 class="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
            Apostas Auditadas pelo Validator Independente
            ${epistemicBadge('FATO')}
          </h3>
          <span class="text-xs text-slate-400">Clique em qualquer aposta para detalhes</span>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs border-collapse">
            <thead class="bg-slate-900/80 text-[10px] uppercase font-bold text-slate-400 border-b border-slate-800 font-mono-code">
              <tr>
                <th class="py-3 px-3">#</th>
                <th class="py-3 px-3">Dezenas (15)</th>
                <th class="py-3 px-3">Soma</th>
                <th class="py-3 px-3">P/I</th>
                <th class="py-3 px-3">Prim</th>
                <th class="py-3 px-3">Mold</th>
                <th class="py-3 px-3">Fib</th>
                <th class="py-3 px-3">Rep</th>
                <th class="py-3 px-3">Q/N/F</th>
                <th class="py-3 px-3">Linhas</th>
                <th class="py-3 px-3">Score</th>
                <th class="py-3 px-3">dH Mín</th>
                <th class="py-3 px-3">Status</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-800/60 font-mono-code text-[11px]">
              ${auditedGames
                .map(
                  (g) => `
                <tr class="hover:bg-slate-800/40 transition cursor-pointer">
                  <td class="py-2.5 px-3 font-bold text-cyan-400">#${g.id}</td>
                  <td class="py-2.5 px-3">
                    <div class="flex flex-wrap gap-1">
                      ${g.numbers.map((n) => `<span class="ball-mini w-6 h-6 text-[10px]">${String(n).padStart(2, '0')}</span>`).join('')}
                    </div>
                  </td>
                  <td class="py-2.5 px-3 font-bold text-white">${g.sum}</td>
                  <td class="py-2.5 px-3 text-slate-300">${g.evenCount}P / ${g.oddCount}I</td>
                  <td class="py-2.5 px-3 text-slate-300">${g.primeCount}</td>
                  <td class="py-2.5 px-3 text-slate-300">${g.frameCount}</td>
                  <td class="py-2.5 px-3 text-slate-300">${g.fibonacciCount}</td>
                  <td class="py-2.5 px-3 text-slate-300">${g.repeatedCount}</td>
                  <td class="py-2.5 px-3 text-slate-300 font-mono-code">${g.hotCount}/${g.neutralCount}/${g.coldCount}</td>
                  <td class="py-2.5 px-3 text-cyan-400 font-bold">${g.linePattern ?? '—'}</td>
                  <td class="py-2.5 px-3 font-bold text-cyan-300">${g.score.toFixed(2)}</td>
                  <td class="py-2.5 px-3 font-bold text-emerald-400">${g.minHamming ?? '—'}</td>
                  <td class="py-2.5 px-3">
                    <span class="px-2 py-0.5 rounded text-[10px] font-bold ${g.status === 'VALID' ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : 'bg-rose-950 text-rose-300 border border-rose-800'}">
                      ${g.status}
                    </span>
                  </td>
                </tr>
              `,
                )
                .join('')}
            </tbody>
          </table>
        </div>
      </div>

      <!-- Explicações Auditáveis das Apostas Geradas (§18) -->
      <div class="glass-panel p-5 rounded-3xl space-y-4">
        <div class="flex items-center justify-between pb-2 border-b border-slate-800">
          <div>
            <h3 class="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
              Explicações Auditáveis de Seleção por Jogo (§18)
              ${epistemicBadge('OTIMIZACAO')}
            </h3>
            <p class="text-[11px] text-slate-400">Transparência analítica: justificativa matemática e decomposição de fatores estruturais para cada aposta.</p>
          </div>
          <span class="text-[10px] font-mono-code text-cyan-400">Auditabilidade Total</span>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          ${auditedGames
            .map((g) => {
              const exp = g.explanation;
              if (!exp) return '';
              return `
              <div class="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-2 text-xs">
                <div class="flex items-center justify-between">
                  <span class="font-bold text-cyan-400">Jogo #${g.id} • Padrão de Linhas [${exp.lineDistribution}]</span>
                  <span class="text-[10px] text-slate-400 font-mono-code">Score: ${g.score.toFixed(2)}</span>
                </div>
                <p class="text-[11px] text-slate-300 leading-relaxed">${exp.whySelected}</p>
                <div class="grid grid-cols-2 gap-2 text-[10px] font-mono-code pt-1 border-t border-slate-800/80">
                  <div>Dezenas do Ciclo: <strong class="text-white">${exp.cycleNumbersCount}</strong></div>
                  <div>Atrasadas Controladas: <strong class="text-amber-400">${exp.delayedNumbersCount}</strong></div>
                  <div>Pares Casados: <strong class="text-emerald-400">${exp.casadasPresent.length}</strong></div>
                  <div>Pares Conflitantes: <strong class="text-rose-400">${exp.brigadasPresent.length}</strong></div>
                </div>
                ${
                  exp.casadasPresent.length > 0
                    ? `
                  <div class="text-[10px] text-emerald-400/90 font-mono-code">
                    Pares Casados: ${exp.casadasPresent.join(', ')}
                  </div>
                `
                    : ''
                }
              </div>
            `;
            })
            .join('')}
        </div>
      </div>

      <!-- Matriz de Distância de Hamming do Portfólio (§22) -->
      ${
        hamming
          ? `
        <div class="glass-panel p-5 rounded-3xl space-y-3">
          <div class="flex items-center justify-between pb-2 border-b border-slate-800">
            <h3 class="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
              Matriz de Distância de Hamming (d_H) entre as Apostas Geradas
              ${epistemicBadge('FATO')}
            </h3>
            <span class="text-[10px] text-slate-400 font-mono-code">d_H(A, B) = popcount(A ⊕ B)</span>
          </div>

          <div class="overflow-x-auto">
            <table class="w-full text-center text-xs font-mono-code border-collapse">
              <thead>
                <tr class="bg-slate-900 text-slate-400">
                  <th class="p-2 border border-slate-800">Jogo</th>
                  ${auditedGames.map((g) => `<th class="p-2 border border-slate-800">#${g.id}</th>`).join('')}
                </tr>
              </thead>
              <tbody>
                ${hamming.matrix
                  .map(
                    (row, i) => `
                  <tr>
                    <td class="p-2 font-bold text-cyan-400 border border-slate-800 bg-slate-950">#${i + 1}</td>
                    ${row
                      .map((d, j) => {
                        const isDiag = i === j;
                        const isViolation = !isDiag && d < outcome.config.minHamming;
                        const bgStyle = isDiag
                          ? 'background: #0f172a; color: #475569;'
                          : isViolation
                            ? 'background: rgba(244, 63, 94, 0.2); color: #fda4af; font-weight: bold;'
                            : 'color: #38bdf8;';
                        return `
                        <td class="p-2 border border-slate-800/60" style="${bgStyle}">
                          ${d}
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
      `
          : ''
      }
    </div>
  `;
}

export function attachGamesEvents(state: AppState): void {
  document.getElementById('btn-goto-generator')?.addEventListener('click', () => {
    appState.navigateTo('gerador');
  });

  const outcome = state.currentOutcome;
  if (!outcome) return;

  document.getElementById('btn-export-txt')?.addEventListener('click', () => {
    const text = exportAsTxt(outcome.auditedGames, true, outcome.repro);
    triggerDownload(
      new Blob([text], { type: 'text/plain;charset=utf-8' }),
      `lotofacil_apostas_${Date.now()}.txt`,
    );
  });

  document.getElementById('btn-export-csv')?.addEventListener('click', () => {
    const csv = exportAsCsv(outcome.auditedGames);
    triggerDownload(
      new Blob([csv], { type: 'text/csv;charset=utf-8' }),
      `lotofacil_apostas_${Date.now()}.csv`,
    );
  });

  document.getElementById('btn-export-json')?.addEventListener('click', () => {
    const json = exportAsJson(
      outcome.auditedGames,
      outcome.config,
      outcome.repro,
      outcome.coverage,
      outcome.hamming,
    );
    triggerDownload(
      new Blob([json], { type: 'application/json;charset=utf-8' }),
      `lotofacil_apostas_${Date.now()}.json`,
    );
  });

  document.getElementById('btn-export-xlsx')?.addEventListener('click', () => {
    const bytes = exportAsXlsx(outcome.auditedGames, outcome.repro);
    triggerDownload(
      new Blob([bytes as BlobPart], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      }),
      `lotofacil_apostas_${Date.now()}.xlsx`,
    );
  });
}
