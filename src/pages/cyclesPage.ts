/**
 * Página do Módulo Estatístico Avançado — Ciclos, Linhas, Relacionamentos e Cobertura.
 *
 * Nome em Português na Interface: Ciclo + Linhas + Relacionamentos + Cobertura.
 *
 * Mandatos Cumpridos:
 * - §1: CycleTracker (status 21/25, ausentes, métricas de duração média/mediana/min/max, histograma).
 * - §2/§4: LineDistributionAnalyzer (5 linhas cartesianas, padrões descobertos, momentum, distâncias).
 * - §5/§6/§7/§8: PairRelationshipAnalyzer (300 pares, Casadas, Brigadas, FDR Benjamini-Hochberg, janelas temporais).
 * - §9: NumberBehaviorAnalyzer (Frequente, Neutra, Atrasada com scores transparentes).
 * - §15/§16: Walk-Forward Backtesting (7 Benchmarks) & Teste de Ablação (6 variantes).
 * - §17: Mapa Interativo 5×5 com gaveta de detalhes ao clicar na dezena.
 * - §18/§19/§20: Honestidade matemática, sem previsões ilusórias, foco em otimização de carteira.
 */
import { type AppState, appState } from '../app/state';
import { epistemicBadge } from '../components/epistemicBadge';
import { UNIVERSE_SIZE } from '../core/domain/constants';

export function renderCyclesPage(state: AppState): string {
  const an = state.currentAnalysis;
  if (!an) {
    return `<div class="p-8 text-center text-slate-500">Nenhuma análise disponível. Carregue um dataset no Dashboard.</div>`;
  }

  const { cycles, lines, relationships, behaviors } = an;
  const curCycle = cycles.currentCycle;
  const selNum = state.selectedNumberForDetail;
  const selBehavior = selNum ? behaviors.numbers.find((n) => n.number === selNum) : null;
  const backtest = state.currentBacktestResult;

  // Encontra casadas e brigadas do número selecionado
  const numCasadas = selNum
    ? relationships.pairs
        .filter(
          (p) =>
            (p.numA === selNum || p.numB === selNum) &&
            (p.classification === 'CASADA_FORTE' || p.classification === 'CASADA_MODERADA'),
        )
        .slice(0, 5)
    : [];

  const numBrigadas = selNum
    ? relationships.pairs
        .filter(
          (p) =>
            (p.numA === selNum || p.numB === selNum) &&
            (p.classification === 'BRIGADA_FORTE' || p.classification === 'BRIGADA_MODERADA'),
        )
        .slice(0, 5)
    : [];

  return `
    <div class="space-y-8 max-w-7xl mx-auto pb-16">
      <!-- Cabeçalho Principal & Mandato Epistêmico -->
      <div class="glass-panel p-6 rounded-3xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6 border border-cyan-500/20 bg-gradient-to-r from-slate-900 via-slate-900/90 to-cyan-950/30">
        <div>
          <div class="flex flex-wrap items-center gap-2 mb-2">
            <h1 class="text-xl font-bold text-white tracking-tight">Ciclo + Linhas + Relacionamentos + Cobertura</h1>
            ${epistemicBadge('FATO')}
            ${epistemicBadge('ESTATISTICA')}
            ${epistemicBadge('ASSUNCAO')}
          </div>
          <p class="text-xs text-slate-300 max-w-3xl leading-relaxed">
            Núcleo de engenharia matemática para análise da estrutura cartesiana do volante (5 linhas), rastreamento reproduzível dos ciclos das 25 dezenas, relacionamentos estatísticos (300 pares com controle FDR de Benjamini-Hochberg) e backtesting walk-forward com ablação científica.
          </p>
        </div>

        <div class="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 text-[11px] text-slate-300 max-w-md shadow-inner">
          <div class="font-bold text-cyan-400 mb-1 flex items-center gap-1.5">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
            Regra Fundamental de Interpretação (§19)
          </div>
          <p class="text-[10px] text-slate-400 leading-normal">
            Todos os jogos individuais de 15 dezenas têm rigorosamente a <strong>mesma probabilidade matemática a priori</strong> em concurso justo. Este módulo atua na <strong>otimização racional da carteira</strong>, mitigando redundância e aumentando a cobertura estrutural sem induzir à ilusão de previsão.
          </p>
        </div>
      </div>

      <!-- PAINEL 1: RASTREAMENTO DO CICLO ATUAL (§1) -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- Status do Ciclo Atual -->
        <div class="glass-panel p-6 rounded-3xl lg:col-span-2 space-y-5 border border-slate-800">
          <div class="flex flex-wrap items-center justify-between gap-3">
            <div>
              <span class="text-[10px] uppercase font-bold tracking-wider text-cyan-400">Rastreamento de Cobertura das 25 Dezenas</span>
              <h2 class="text-base font-bold text-white flex items-center gap-2">
                Ciclo Atual #${curCycle.cycleIndex}
                <span class="px-2.5 py-0.5 rounded-full text-xs font-mono-code font-bold ${curCycle.missingCount === 0 ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' : 'bg-amber-500/20 text-amber-400 border border-amber-500/40'}">
                  ${curCycle.coveredCount}/25 ${curCycle.missingCount === 0 ? '(Completo)' : `(${curCycle.missingCount} ausente${curCycle.missingCount > 1 ? 's' : ''})`}
                </span>
              </h2>
            </div>
            <div class="text-right text-xs font-mono-code text-slate-400">
              Iniciado no concurso <strong>#${curCycle.startContest}</strong> • <strong>${curCycle.consecutiveDraws}</strong> concurso${curCycle.consecutiveDraws > 1 ? 's' : ''} decorrido${curCycle.consecutiveDraws > 1 ? 's' : ''}
            </div>
          </div>

          <!-- Barra de Progresso do Ciclo -->
          <div class="space-y-1.5">
            <div class="w-full bg-slate-950 rounded-full h-3 p-0.5 border border-slate-800 overflow-hidden">
              <div class="bg-gradient-to-r from-cyan-500 to-emerald-400 h-2 rounded-full transition-all duration-500" style="width: ${(curCycle.coveredCount / 25) * 100}%"></div>
            </div>
            <div class="flex justify-between text-[11px] text-slate-400 font-mono-code">
              <span>0 dezenas</span>
              <span class="font-bold text-white">${curCycle.coveredCount} dezenas saíram pelo menos 1 vez (${((curCycle.coveredCount / 25) * 100).toFixed(0)}%)</span>
              <span>25 dezenas (Fechamento)</span>
            </div>
          </div>

          <!-- Dezenas Ausentes em Destaque -->
          <div class="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-2">
            <div class="text-xs font-bold text-slate-300 flex items-center justify-between">
              <span class="flex items-center gap-1.5">
                <span class="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
                Dezenas Ainda Ausentes no Ciclo Atual (${curCycle.missingCount})
              </span>
              <span class="text-[10px] text-slate-400">Oportunidade para fechamento estrutural</span>
            </div>

            ${
              curCycle.missingNumbers.length > 0
                ? `
              <div class="flex flex-wrap gap-2 pt-1">
                ${curCycle.missingNumbers
                  .map(
                    (n) => `
                  <button type="button" class="btn-select-number px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/40 text-amber-300 font-mono-code text-xs font-bold flex items-center gap-2 hover:bg-amber-500/20 transition-all cursor-pointer" data-number="${n}">
                    <span>${String(n).padStart(2, '0')}</span>
                    <span class="text-[10px] text-slate-400 font-normal">Atraso: ${curCycle.currentDelays[n - 1]}</span>
                  </button>
                `,
                  )
                  .join('')}
              </div>
            `
                : `<div class="text-xs text-emerald-400 font-mono-code py-1">Ciclo 100% completo! Todas as 25 dezenas ocorreram. O próximo sorteio iniciará um novo ciclo.</div>`
            }
          </div>
        </div>

        <!-- Métricas Históricas de Duração dos Ciclos -->
        <div class="glass-panel p-6 rounded-3xl space-y-4 border border-slate-800">
          <div class="flex items-center justify-between">
            <h3 class="text-xs font-bold text-white uppercase tracking-wider">Histórico dos Ciclos</h3>
            <span class="text-[10px] text-slate-400 font-mono-code">${cycles.completedCyclesCount} ciclos completos</span>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div class="p-3 rounded-2xl bg-slate-950/60 border border-slate-800/80">
              <div class="text-[10px] text-slate-400">Duração Média</div>
              <div class="text-xl font-bold font-mono-code text-cyan-400">${cycles.metrics.meanDuration.toFixed(2)}</div>
              <div class="text-[9px] text-slate-500">concursos</div>
            </div>
            <div class="p-3 rounded-2xl bg-slate-950/60 border border-slate-800/80">
              <div class="text-[10px] text-slate-400">Mediana</div>
              <div class="text-xl font-bold font-mono-code text-indigo-400">${cycles.metrics.medianDuration}</div>
              <div class="text-[9px] text-slate-500">concursos</div>
            </div>
            <div class="p-3 rounded-2xl bg-slate-950/60 border border-slate-800/80">
              <div class="text-[10px] text-slate-400">Mínimo Histórico</div>
              <div class="text-xl font-bold font-mono-code text-emerald-400">${cycles.metrics.minDuration}</div>
              <div class="text-[9px] text-slate-500">concursos</div>
            </div>
            <div class="p-3 rounded-2xl bg-slate-950/60 border border-slate-800/80">
              <div class="text-[10px] text-slate-400">Máximo Histórico</div>
              <div class="text-xl font-bold font-mono-code text-rose-400">${cycles.metrics.maxDuration}</div>
              <div class="text-[9px] text-slate-500">concursos</div>
            </div>
          </div>

          <!-- Distribuição empírica de duração -->
          <div class="space-y-1.5 pt-1">
            <div class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Durações Mais Frequentes</div>
            <div class="space-y-1 text-xs font-mono-code">
              ${cycles.durationDistribution
                .slice(0, 4)
                .map(
                  (d) => `
                <div class="flex items-center justify-between p-1.5 rounded-lg bg-slate-950/40 border border-slate-900">
                  <span class="text-slate-300">${d.duration} concursos</span>
                  <div class="flex items-center gap-2">
                    <div class="w-16 bg-slate-800 h-1.5 rounded-full overflow-hidden">
                      <div class="bg-cyan-500 h-1.5 rounded-full" style="width: ${d.relativeFrequency * 100}%"></div>
                    </div>
                    <span class="text-cyan-400 font-bold">${(d.relativeFrequency * 100).toFixed(1)}%</span>
                  </div>
                </div>
              `,
                )
                .join('')}
            </div>
          </div>
        </div>
      </div>

      <!-- PAINEL 2: MAPA INTERATIVO 5×5 DO VOLANTE & GAVETA DE DETALHES (§17) -->
      <div class="glass-panel p-6 rounded-3xl space-y-6 border border-slate-800">
        <div class="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div class="flex items-center gap-2 mb-1">
              <h2 class="text-base font-bold text-white tracking-tight">Mapa Cartesiano 5×5 do Volante</h2>
              ${epistemicBadge('FATO')}
              ${epistemicBadge('OTIMIZACAO')}
            </div>
            <p class="text-xs text-slate-400">
              Visualização simultânea de frequência, atraso, ciclo e comportamento. <strong>Clique em qualquer dezena</strong> para inspecionar relacionamentos (Casadas/Brigadas) e métricas detalhadas.
            </p>
          </div>

          <div class="flex items-center gap-3 text-[11px] text-slate-400">
            <span class="flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> Frequente</span>
            <span class="flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-full bg-slate-500"></span> Neutra</span>
            <span class="flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-full bg-amber-500"></span> Atrasada</span>
            <span class="flex items-center gap-1.5"><span class="w-2 h-2 rounded-full border border-dashed border-rose-400"></span> Ausente no Ciclo</span>
          </div>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          <!-- Grade 5x5 -->
          <div class="lg:col-span-2 bg-slate-950/80 p-5 rounded-3xl border border-slate-800">
            <div class="grid grid-cols-5 gap-3 max-w-xl mx-auto">
              ${Array.from({ length: UNIVERSE_SIZE }, (_, i) => {
                const num = i + 1;
                const beh = behaviors.numbers[i];
                const isMissingInCycle = curCycle.missingNumbers.includes(num);
                const isSelected = selNum === num;

                let borderClass = 'border-slate-800 hover:border-cyan-500';
                if (isSelected) borderClass = 'border-cyan-400 ring-2 ring-cyan-500/40 bg-cyan-950/40';
                else if (isMissingInCycle) borderClass = 'border-dashed border-amber-500/80 bg-amber-950/20';

                let badgeColor = 'bg-slate-700 text-slate-300';
                if (beh?.classification === 'FREQUENTE')
                  badgeColor = 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30';
                else if (beh?.classification === 'ATRASADA')
                  badgeColor = 'bg-amber-500/20 text-amber-400 border border-amber-500/30';

                return `
                  <button
                    type="button"
                    class="btn-select-number p-2.5 rounded-2xl border transition-all duration-200 flex flex-col items-center justify-between gap-1 text-center cursor-pointer ${borderClass}"
                    data-number="${num}"
                    title="Clique para inspecionar dezena ${num}"
                  >
                    <div class="flex items-center justify-between w-full px-1">
                      <span class="text-[9px] font-mono-code text-slate-500">#${Math.floor((num - 1) / 5) + 1}</span>
                      <span class="text-[9px] font-bold ${badgeColor} px-1 rounded">${beh?.classification[0]}</span>
                    </div>

                    <div class="text-xl font-black font-mono-code ${isMissingInCycle ? 'text-amber-300' : 'text-white'}">
                      ${String(num).padStart(2, '0')}
                    </div>

                    <div class="w-full text-[10px] font-mono-code text-slate-400 flex items-center justify-between border-t border-slate-800/80 pt-1">
                      <span title="Atraso atual">A:${beh?.currentDelay ?? 0}</span>
                      <span title="Aparições no ciclo" class="${isMissingInCycle ? 'text-rose-400 font-bold' : 'text-slate-300'}">C:${curCycle.appearances[i] ?? 0}</span>
                    </div>
                  </button>
                `;
              }).join('')}
            </div>
          </div>

          <!-- Gaveta Lateral de Inspeção da Dezena -->
          <div class="glass-panel p-5 rounded-3xl border border-slate-800 space-y-4">
            ${
              selNum && selBehavior
                ? `
              <div class="flex items-center justify-between pb-3 border-b border-slate-800">
                <div class="flex items-center gap-3">
                  <div class="ball-medium w-10 h-10 text-base font-black">${String(selNum).padStart(2, '0')}</div>
                  <div>
                    <h4 class="text-sm font-bold text-white">Dezena ${String(selNum).padStart(2, '0')}</h4>
                    <span class="text-[10px] font-mono-code text-cyan-400">Classificação: <strong>${selBehavior.classification}</strong></span>
                  </div>
                </div>
                <button type="button" id="btn-close-detail" class="text-slate-500 hover:text-white text-xs px-2 py-1 rounded bg-slate-800">✕ Fechar</button>
              </div>

              <!-- Métricas Comportamentais (§9) -->
              <div class="grid grid-cols-2 gap-2 text-xs font-mono-code">
                <div class="p-2 rounded-xl bg-slate-950/60 border border-slate-800">
                  <div class="text-[9px] text-slate-500">Freq. Global</div>
                  <div class="text-slate-200 font-bold">${selBehavior.totalFrequency} (${(selBehavior.relativeFrequency * 100).toFixed(1)}%)</div>
                </div>
                <div class="p-2 rounded-xl bg-slate-950/60 border border-slate-800">
                  <div class="text-[9px] text-slate-500">Atraso Atual</div>
                  <div class="text-amber-400 font-bold">${selBehavior.currentDelay} (Máx: ${selBehavior.maxDelay})</div>
                </div>
                <div class="p-2 rounded-xl bg-slate-950/60 border border-slate-800">
                  <div class="text-[9px] text-slate-500">Ciclo Atual</div>
                  <div class="text-slate-200 font-bold">${curCycle.appearances[selNum - 1]} aparições</div>
                </div>
                <div class="p-2 rounded-xl bg-slate-950/60 border border-slate-800">
                  <div class="text-[9px] text-slate-500">Tendência Móvel</div>
                  <div class="text-indigo-400 font-bold">${selBehavior.trend}</div>
                </div>
              </div>

              <!-- Top Casadas da Dezena (§6) -->
              <div class="space-y-1.5 pt-2">
                <div class="text-[10px] font-bold text-emerald-400 uppercase tracking-wider flex items-center justify-between">
                  <span>Principais Casadas (Lift > 1)</span>
                  <span class="text-[9px] text-slate-500">FDR BH</span>
                </div>
                ${
                  numCasadas.length > 0
                    ? `
                  <div class="space-y-1 font-mono-code text-[11px]">
                    ${numCasadas
                      .map((p) => {
                        const other = p.numA === selNum ? p.numB : p.numA;
                        return `
                        <div class="p-1.5 rounded-lg bg-emerald-950/20 border border-emerald-500/20 flex items-center justify-between text-slate-300">
                          <span class="font-bold text-white">+ Dezena ${String(other).padStart(2, '0')}</span>
                          <span class="text-emerald-400">Lift: ${p.lift.toFixed(2)}</span>
                          <span class="text-[9px] text-slate-400">${p.jointCount} jtas</span>
                        </div>
                      `;
                      })
                      .join('')}
                  </div>
                `
                    : `<div class="text-[11px] text-slate-500 italic p-2 bg-slate-950 rounded-lg">Sem casadas com significância após FDR.</div>`
                }
              </div>

              <!-- Top Brigadas da Dezena (§7) -->
              <div class="space-y-1.5 pt-1">
                <div class="text-[10px] font-bold text-rose-400 uppercase tracking-wider flex items-center justify-between">
                  <span>Principais Brigadas (Lift < 1)</span>
                  <span class="text-[9px] text-slate-500">p_adj < 0.05</span>
                </div>
                ${
                  numBrigadas.length > 0
                    ? `
                  <div class="space-y-1 font-mono-code text-[11px]">
                    ${numBrigadas
                      .map((p) => {
                        const other = p.numA === selNum ? p.numB : p.numA;
                        return `
                        <div class="p-1.5 rounded-lg bg-rose-950/20 border border-rose-500/20 flex items-center justify-between text-slate-300">
                          <span class="font-bold text-white">+ Dezena ${String(other).padStart(2, '0')}</span>
                          <span class="text-rose-400">Lift: ${p.lift.toFixed(2)}</span>
                          <span class="text-[9px] text-slate-400">${p.jointCount} jtas</span>
                        </div>
                      `;
                      })
                      .join('')}
                  </div>
                `
                    : `<div class="text-[11px] text-slate-500 italic p-2 bg-slate-950 rounded-lg">Sem evidência estatística de conflito.</div>`
                }
              </div>
            `
                : `
              <div class="text-center py-10 space-y-3 text-slate-400">
                <svg class="w-10 h-10 mx-auto text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122"></path></svg>
                <div class="text-xs font-bold text-white">Nenhuma Dezena Selecionada</div>
                <p class="text-[11px] text-slate-500">
                  Clique em qualquer uma das 25 dezenas no volante ao lado para carregar a auditoria completa de casadas, brigadas, atrasos e scores.
                </p>
              </div>
            `
            }
          </div>
        </div>
      </div>

      <!-- PAINEL 3: ANÁLISE DAS 5 LINHAS DO VOLANTE (§2, §3, §4) -->
      <div class="glass-panel p-6 rounded-3xl space-y-6 border border-slate-800">
        <div class="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div class="flex items-center gap-2 mb-1">
              <h2 class="text-base font-bold text-white tracking-tight">Análise Cartesiana das 5 Linhas do Volante</h2>
              ${epistemicBadge('FATO')}
              ${epistemicBadge('ESTATISTICA')}
            </div>
            <p class="text-xs text-slate-400">
              Distribuição empírica das 15 dezenas entre as 5 linhas estruturais (∑ l_i = 15). O sistema descobre a partir dos dados quais padrões são frequentes e quais são raros.
            </p>
          </div>

          <div class="text-right text-xs font-mono-code text-slate-400">
            Repetição consecutiva do mesmo padrão: <strong>${(lines.patternRepetitionRate * 100).toFixed(2)}%</strong> • Distância média Manhattan: <strong>${lines.meanManhattanDistance.toFixed(2)}</strong>
          </div>
        </div>

        <!-- 5 Linhas Estatísticas -->
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          ${lines.lines
            .map(
              (l) => `
            <div class="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-2">
              <div class="flex items-center justify-between">
                <span class="text-xs font-bold text-white">Linha ${l.lineIndex}</span>
                <span class="text-[10px] font-mono-code text-cyan-400">${l.rangeText}</span>
              </div>
              <div class="flex items-baseline justify-between font-mono-code">
                <span class="text-[10px] text-slate-400">Média:</span>
                <span class="text-sm font-bold text-white">${l.mean.toFixed(2)}</span>
              </div>
              <div class="flex items-baseline justify-between font-mono-code">
                <span class="text-[10px] text-slate-400">Desvio:</span>
                <span class="text-xs text-slate-300">±${l.stdDev.toFixed(2)}</span>
              </div>
              <div class="flex items-baseline justify-between font-mono-code pt-1 border-t border-slate-800/80">
                <span class="text-[10px] text-slate-400">Momentum:</span>
                <span class="text-[10px] font-bold ${l.momentum === 'CRESCIMENTO' ? 'text-emerald-400' : l.momentum === 'REDUCAO' ? 'text-amber-400' : 'text-slate-400'}">${l.momentum}</span>
              </div>
            </div>
          `,
            )
            .join('')}
        </div>

        <!-- Top Padrões de Linha Descobertos -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-3">
            <div class="text-xs font-bold text-white uppercase tracking-wider flex items-center justify-between">
              <span>Padrões de Linhas Mais Frequentes</span>
              <span class="text-[10px] text-slate-400 font-mono-code">Top 6 Empíricos</span>
            </div>
            <div class="space-y-1.5 font-mono-code text-xs">
              ${lines.mostFrequentPatterns
                .slice(0, 6)
                .map(
                  (p, idx) => `
                <div class="p-2 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
                  <div class="flex items-center gap-2">
                    <span class="text-slate-500 w-4">${idx + 1}.</span>
                    <span class="text-white font-bold bg-slate-800 px-2 py-0.5 rounded text-[11px]">[${p.pattern}]</span>
                  </div>
                  <div class="flex items-center gap-3">
                    <span class="text-slate-400 text-[11px]">${p.occurrenceCount}x</span>
                    <span class="text-cyan-400 font-bold">${(p.relativeFrequency * 100).toFixed(2)}%</span>
                    <span class="text-[10px] text-slate-400">Atraso: ${p.currentDelay}</span>
                  </div>
                </div>
              `,
                )
                .join('')}
            </div>
          </div>

          <div class="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-3">
            <div class="text-xs font-bold text-white uppercase tracking-wider flex items-center justify-between">
              <span>Padrões Raros ou Inexistentes</span>
              <span class="text-[10px] text-slate-400 font-mono-code">Cauda Longa</span>
            </div>
            <div class="space-y-1.5 font-mono-code text-xs">
              ${lines.leastFrequentPatterns
                .slice(0, 6)
                .map(
                  (p, idx) => `
                <div class="p-2 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
                  <div class="flex items-center gap-2">
                    <span class="text-slate-500 w-4">${idx + 1}.</span>
                    <span class="text-slate-300 font-bold bg-slate-800/80 px-2 py-0.5 rounded text-[11px]">[${p.pattern}]</span>
                  </div>
                  <div class="flex items-center gap-3">
                    <span class="text-slate-400 text-[11px]">${p.occurrenceCount}x</span>
                    <span class="text-rose-400 font-bold">${(p.relativeFrequency * 100).toFixed(2)}%</span>
                    <span class="text-[10px] text-slate-400">Atraso: ${p.currentDelay}</span>
                  </div>
                </div>
              `,
                )
                .join('')}
            </div>
          </div>
        </div>
      </div>

      <!-- PAINEL 4: RELACIONAMENTOS — CASADAS E BRIGADAS COM CONTROLE FDR (§5, §6, §7, §8) -->
      <div class="glass-panel p-6 rounded-3xl space-y-6 border border-slate-800">
        <div class="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div class="flex items-center gap-2 mb-1">
              <h2 class="text-base font-bold text-white tracking-tight">Dezenas Casadas e Brigadas (300 Pares)</h2>
              ${epistemicBadge('ESTATISTICA')}
              ${epistemicBadge('ASSUNCAO')}
            </div>
            <p class="text-xs text-slate-400">
              Controle estrito de falsos positivos via <strong>Procedimento de Benjamini-Hochberg (FDR q=0.05)</strong> sobre todos os 300 pares C(25,2). Dezenas brigadas são rigorosamente separadas de dezenas com baixa frequência marginal!
            </p>
          </div>

          <div class="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-[10px] font-mono-code text-slate-300">
            Casadas com significância: <strong class="text-emerald-400">${relationships.topCasadas.length}</strong> • Brigadas com significância: <strong class="text-rose-400">${relationships.topBrigadas.length}</strong>
          </div>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <!-- Tabela de Top Casadas -->
          <div class="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-3">
            <div class="flex items-center justify-between">
              <h3 class="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-2">
                Pares "Casados" (Forte Associação Conjunta)
              </h3>
              <span class="text-[10px] text-slate-500 font-mono-code">Lift > 1 & q < 0.05</span>
            </div>

            <div class="space-y-1.5 font-mono-code text-xs">
              ${
                relationships.topCasadas.length > 0
                  ? relationships.topCasadas
                      .slice(0, 8)
                      .map(
                        (p) => `
                    <div class="p-2 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
                      <div class="flex items-center gap-2">
                        <span class="ball-mini w-6 h-6 text-[10px]">${String(p.numA).padStart(2, '0')}</span>
                        <span class="text-slate-500">+</span>
                        <span class="ball-mini w-6 h-6 text-[10px]">${String(p.numB).padStart(2, '0')}</span>
                        <span class="text-[10px] text-slate-400 font-sans ml-1">${p.jointCount} jtas</span>
                      </div>
                      <div class="flex items-center gap-3">
                        <span class="text-emerald-400 font-bold">Lift ${p.lift.toFixed(2)}</span>
                        <span class="text-[10px] text-cyan-400">Jaccard ${(p.jaccard * 100).toFixed(1)}%</span>
                        <span class="text-[9px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">${p.stability}</span>
                      </div>
                    </div>
                  `,
                      )
                      .join('')
                  : `<div class="p-4 text-center text-slate-500 text-xs italic">Nenhum par ultrapassou o limiar de significância estatística de Benjamini-Hochberg (SEM EVIDÊNCIA SUFICIENTE).</div>`
              }
            </div>
          </div>

          <!-- Tabela de Top Brigadas -->
          <div class="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-3">
            <div class="flex items-center justify-between">
              <h3 class="text-xs font-bold text-rose-400 uppercase tracking-wider flex items-center gap-2">
                Pares "Brigados" (Associação Conjunta Inferior ao Esperado)
              </h3>
              <span class="text-[10px] text-slate-500 font-mono-code">Lift < 1 & q < 0.05</span>
            </div>

            <div class="space-y-1.5 font-mono-code text-xs">
              ${
                relationships.topBrigadas.length > 0
                  ? relationships.topBrigadas
                      .slice(0, 8)
                      .map(
                        (p) => `
                    <div class="p-2 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
                      <div class="flex items-center gap-2">
                        <span class="ball-mini w-6 h-6 text-[10px]">${String(p.numA).padStart(2, '0')}</span>
                        <span class="text-slate-500">+</span>
                        <span class="ball-mini w-6 h-6 text-[10px]">${String(p.numB).padStart(2, '0')}</span>
                        <span class="text-[10px] text-slate-400 font-sans ml-1">${p.jointCount} jtas</span>
                      </div>
                      <div class="flex items-center gap-3">
                        <span class="text-rose-400 font-bold">Lift ${p.lift.toFixed(2)}</span>
                        <span class="text-[10px] text-slate-400">Esp: ${p.expectedCount.toFixed(0)}</span>
                        <span class="text-[9px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">${p.stability}</span>
                      </div>
                    </div>
                  `,
                      )
                      .join('')
                  : `<div class="p-4 text-center text-slate-500 text-xs italic">Nenhum par apresentou baixa coocorrência estatisticamente isolável de suas frequências marginais (SEM EVIDÊNCIA SUFICIENTE).</div>`
              }
            </div>
          </div>
        </div>
      </div>

      <!-- PAINEL 5: WALK-FORWARD BACKTESTING & TESTE DE ABLAÇÃO (§15, §16) -->
      <div class="glass-panel p-6 rounded-3xl space-y-6 border border-slate-800">
        <div class="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div class="flex items-center gap-2 mb-1">
              <h2 class="text-base font-bold text-white tracking-tight">Walk-Forward Backtest & Teste de Ablação</h2>
              ${epistemicBadge('OTIMIZACAO')}
              ${epistemicBadge('HEURISTICA')}
            </div>
            <p class="text-xs text-slate-400">
              Validação retrospectiva out-of-sample simulando a geração de carteiras no passado congelado, comparando os <strong>7 Benchmarks Obrigatórios</strong> e o <strong>Teste de Ablação</strong> (FULL vs componentes removidos).
            </p>
          </div>

          <div class="flex items-center gap-3">
            <select id="backtest-mode-select" class="bg-slate-900 border border-slate-700 text-white rounded-xl px-3 py-2 text-xs font-mono-code focus:outline-none focus:border-cyan-500">
              <option value="FAST" selected>FAST (Proxy Heurístico)</option>
              <option value="PRODUCTION">PRODUCTION (Equivalente Produção)</option>
            </select>

            <select id="backtest-eval-points" class="bg-slate-900 border border-slate-700 text-white rounded-xl px-3 py-2 text-xs font-mono-code focus:outline-none focus:border-cyan-500">
              <option value="20">Últimos 20 concursos</option>
              <option value="30" selected>Últimos 30 concursos</option>
              <option value="50">Últimos 50 concursos</option>
            </select>

            <button
              type="button"
              id="btn-run-backtest"
              class="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white font-bold text-xs shadow-lg shadow-cyan-900/30 transition-all flex items-center gap-2 cursor-pointer ${state.isProcessing ? 'opacity-50 cursor-not-allowed' : ''}"
              ${state.isProcessing ? 'disabled' : ''}
            >
              <svg class="w-4 h-4 ${state.isProcessing ? 'animate-spin' : ''}" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
              ${state.isProcessing ? 'Executando Backtest...' : 'Executar Walk-Forward Backtesting'}
            </button>
          </div>
        </div>

        ${
          backtest
            ? `
          <!-- Resultados do Backtest -->
          <div class="space-y-6">
            <div class="p-3 rounded-2xl bg-cyan-950/20 border border-cyan-500/20 flex flex-wrap items-center justify-between gap-2 text-xs font-mono-code text-slate-300">
              <div class="flex items-center gap-2">
                <span class="px-2 py-0.5 rounded text-[10px] font-bold ${backtest.mode === 'PRODUCTION' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'}">
                  MODO: ${backtest.mode}
                </span>
                <span>Pontos: <strong>${backtest.evaluationPoints}</strong> concursos (#${backtest.startContest} ao #${backtest.endContest})</span>
              </div>
              <span>Tempo: <strong>${(backtest.executionTimeMs / 1000).toFixed(2)}s</strong></span>
            </div>

            <div class="p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-[11px] text-slate-400">
              <strong class="text-slate-300">Metodologia:</strong> ${backtest.modeDescription}
            </div>

            <!-- Tabela dos 7 Benchmarks Obrigatórios (§15) -->
            <div class="space-y-3">
              <h3 class="text-xs font-bold text-white uppercase tracking-wider">Tabela de Benchmarks (§15)</h3>
              <div class="overflow-x-auto">
                <table class="w-full text-left border-collapse text-xs font-mono-code">
                  <thead>
                    <tr class="border-b border-slate-800 text-[10px] text-slate-400 uppercase tracking-wider">
                      <th class="py-2.5 px-3">Estratégia / Benchmark</th>
                      <th class="py-2.5 px-3 text-right">Média Acertos</th>
                      <th class="py-2.5 px-3 text-right">Mediana</th>
                      <th class="py-2.5 px-3 text-right">11 Acertos</th>
                      <th class="py-2.5 px-3 text-right">12 Acertos</th>
                      <th class="py-2.5 px-3 text-right">13 Acertos</th>
                      <th class="py-2.5 px-3 text-right">14 Acertos</th>
                      <th class="py-2.5 px-3 text-right">15 Acertos</th>
                      <th class="py-2.5 px-3 text-right">Cobertura</th>
                      <th class="py-2.5 px-3 text-right">Sobreposição</th>
                      <th class="py-2.5 px-3 text-right">ROI Teórico</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-slate-800/60">
                    ${backtest.benchmarks
                      .map(
                        (b, idx) => `
                      <tr class="${idx === 6 ? 'bg-cyan-950/30 font-bold text-white' : 'hover:bg-slate-900/40 text-slate-300'}">
                        <td class="py-2 px-3">${b.name}</td>
                        <td class="py-2 px-3 text-right font-bold text-cyan-400">${b.meanHits.toFixed(3)}</td>
                        <td class="py-2 px-3 text-right">${b.medianHits}</td>
                        <td class="py-2 px-3 text-right text-emerald-400">${b.hitsDistribution.hits11}</td>
                        <td class="py-2 px-3 text-right text-emerald-400">${b.hitsDistribution.hits12}</td>
                        <td class="py-2 px-3 text-right text-emerald-400">${b.hitsDistribution.hits13}</td>
                        <td class="py-2 px-3 text-right text-amber-400 font-bold">${b.hitsDistribution.hits14}</td>
                        <td class="py-2 px-3 text-right text-purple-400 font-bold">${b.hitsDistribution.hits15}</td>
                        <td class="py-2 px-3 text-right">${b.averageCoverage} / 25</td>
                        <td class="py-2 px-3 text-right">${b.averageOverlap}</td>
                        <td class="py-2 px-3 text-right font-bold ${b.roi >= 0 ? 'text-emerald-400' : 'text-slate-400'}">${(b.roi * 100).toFixed(1)}%</td>
                      </tr>
                    `,
                      )
                      .join('')}
                  </tbody>
                </table>
              </div>
            </div>

            <!-- Tabela de Testes de Ablação (§16) -->
            <div class="space-y-3 pt-4 border-t border-slate-800">
              <div class="flex items-center justify-between">
                <h3 class="text-xs font-bold text-white uppercase tracking-wider">Testes de Ablação Científica (§16)</h3>
                <span class="text-[10px] text-slate-500 font-mono-code">Mede a contribuição marginal isolada de cada módulo</span>
              </div>

              <div class="overflow-x-auto">
                <table class="w-full text-left border-collapse text-xs font-mono-code">
                  <thead>
                    <tr class="border-b border-slate-800 text-[10px] text-slate-400 uppercase tracking-wider">
                      <th class="py-2 px-3">Configuração</th>
                      <th class="py-2 px-3 text-right">Média Acertos</th>
                      <th class="py-2 px-3 text-right">Mediana</th>
                      <th class="py-2 px-3 text-right">Premiações (≥11)</th>
                      <th class="py-2 px-3 text-right">Delta vs FULL</th>
                      <th class="py-2 px-3 text-right">Cobertura</th>
                      <th class="py-2 px-3 text-right">ROI Teórico</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-slate-800/60">
                    ${backtest.ablations
                      .map((a, idx) => {
                        const fullMean = backtest.ablations[0]!.meanHits;
                        const delta = a.meanHits - fullMean;
                        const totalPrizes =
                          a.hitsDistribution.hits11 +
                          a.hitsDistribution.hits12 +
                          a.hitsDistribution.hits13 +
                          a.hitsDistribution.hits14 +
                          a.hitsDistribution.hits15;

                        return `
                        <tr class="${idx === 0 ? 'bg-indigo-950/30 font-bold text-white' : 'hover:bg-slate-900/40 text-slate-300'}">
                          <td class="py-2 px-3">${a.name}</td>
                          <td class="py-2 px-3 text-right font-bold text-cyan-400">${a.meanHits.toFixed(3)}</td>
                          <td class="py-2 px-3 text-right">${a.medianHits}</td>
                          <td class="py-2 px-3 text-right text-emerald-400">${totalPrizes}</td>
                          <td class="py-2 px-3 text-right font-bold ${delta > 0 ? 'text-emerald-400' : delta < 0 ? 'text-rose-400' : 'text-slate-400'}">
                            ${delta > 0 ? '+' : ''}${delta.toFixed(3)}
                          </td>
                          <td class="py-2 px-3 text-right">${a.averageCoverage} / 25</td>
                          <td class="py-2 px-3 text-right ${a.roi >= 0 ? 'text-emerald-400' : 'text-slate-400'}">${(a.roi * 100).toFixed(1)}%</td>
                        </tr>
                      `;
                      })
                      .join('')}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        `
            : `
          <div class="p-8 rounded-2xl bg-slate-950/60 border border-slate-800/80 text-center space-y-3">
            <svg class="w-12 h-12 mx-auto text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path></svg>
            <div class="text-sm font-bold text-white">Nenhum Backtest Executado Nesta Sessão</div>
            <p class="text-xs text-slate-400 max-w-lg mx-auto">
              Clique no botão acima para rodar a simulação walk-forward. O processo é executado pelo Web Worker de forma assíncrona, comparando as estratégias contra os resultados oficiais dos últimos concursos.
            </p>
          </div>
        `
        }
      </div>
    </div>
  `;
}

/**
 * Registra ouvintes de evento da página de ciclos e relacionamentos.
 */
export function setupCyclesPageListeners(): void {
  // Seleção de dezenas para detalhe no mapa 5x5
  const numberButtons = document.querySelectorAll('.btn-select-number');
  for (const btn of numberButtons) {
    btn.addEventListener('click', () => {
      const numStr = (btn as HTMLElement).dataset.number;
      if (numStr) {
        const num = Number.parseInt(numStr, 10);
        appState.setSelectedNumberForDetail(num);
      }
    });
  }

  // Fechar detalhe
  const btnClose = document.getElementById('btn-close-detail');
  if (btnClose) {
    btnClose.addEventListener('click', () => {
      appState.setSelectedNumberForDetail(null);
    });
  }

  // Executar backtest
  const btnBacktest = document.getElementById('btn-run-backtest');
  if (btnBacktest) {
    btnBacktest.addEventListener('click', () => {
      const select = document.getElementById('backtest-eval-points') as HTMLSelectElement | null;
      const modeSelect = document.getElementById('backtest-mode-select') as HTMLSelectElement | null;
      const evalPoints = select ? Number.parseInt(select.value, 10) : 30;
      const mode = modeSelect?.value === 'PRODUCTION' ? 'PRODUCTION' : 'FAST';
      appState.runBacktest(evalPoints, 42, mode);
    });
  }
}
