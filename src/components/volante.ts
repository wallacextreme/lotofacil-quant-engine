/**
 * Componente do Volante 5×5 da Lotofácil (§28).
 *
 * Exibe as 25 dezenas com classificação térmica, frequência, atraso atual e indicadores.
 */
import { FRAME, PRIMES, UNIVERSE_SIZE } from '../core/domain/constants';
import type { DatasetAnalysis } from '../services/analysisService';

export interface VolanteOptions {
  analysis?: DatasetAnalysis | null;
  selectedNumbers?: readonly number[];
  highlightNumbers?: readonly number[];
  onBallClick?: (number: number) => void;
  showStats?: boolean;
}

export function renderVolanteHtml(options: VolanteOptions = {}): string {
  const { analysis, selectedNumbers = [], highlightNumbers = [], showStats = true } = options;
  const selSet = new Set(selectedNumbers);
  const hlSet = new Set(highlightNumbers);
  const primeSet = new Set(PRIMES);
  const frameSet = new Set(FRAME);

  const ballsHtml: string[] = [];

  for (let num = 1; num <= UNIVERSE_SIZE; num++) {
    const isSelected = selSet.has(num);
    const isHighlight = hlSet.has(num);

    let tempClass = 'ball-neutral';
    let tempLabel = 'NEUTRA';
    let freqText = '';
    let delayText = '';

    if (analysis) {
      const zInfo = analysis.zScores.scores[num - 1];
      if (zInfo) {
        if (zInfo.temperature === 'HOT') {
          tempClass = 'ball-hot';
          tempLabel = 'QUENTE';
        } else if (zInfo.temperature === 'COLD') {
          tempClass = 'ball-cold';
          tempLabel = 'FRIA';
        } else {
          tempClass = 'ball-neutral';
          tempLabel = 'NEUTRA';
        }
        freqText = `${(zInfo.globalRelative * 100).toFixed(1)}%`;
      }

      const dInfo = analysis.delays.delays[num - 1];
      if (dInfo) {
        delayText = `Atraso: ${dInfo.currentDelay}`;
      }
    }

    const stateClass = isSelected
      ? 'ball-selected ring-4 ring-emerald-500/50 scale-105'
      : isHighlight
        ? 'ring-4 ring-cyan-400/80 scale-105'
        : tempClass;

    const isFrame = frameSet.has(num);
    const isPrime = primeSet.has(num);

    ballsHtml.push(`
      <div data-number="${num}" class="volante-ball cursor-pointer p-2.5 rounded-2xl glass-panel flex flex-col items-center justify-between transition transform hover:-translate-y-1 hover:shadow-lg hover:border-cyan-500/50 select-none ${stateClass}">
        <div class="w-full flex items-center justify-between text-[9px] text-slate-300 font-mono-code">
          <span class="opacity-70">${isFrame ? 'M' : '·'}</span>
          <span class="opacity-70">${isPrime ? 'P' : '·'}</span>
        </div>
        <div class="text-xl sm:text-2xl font-black font-mono-code my-1">
          ${String(num).padStart(2, '0')}
        </div>
        ${
          showStats && analysis
            ? `
          <div class="w-full text-center space-y-0.5 border-t border-white/10 pt-1 mt-0.5">
            <div class="text-[9px] font-bold tracking-tight">${tempLabel}</div>
            <div class="text-[8px] text-slate-300 font-mono-code">${freqText} | ${delayText}</div>
          </div>
        `
            : `<div class="text-[9px] text-slate-400 font-mono-code">#${num}</div>`
        }
      </div>
    `);
  }

  return `
    <div class="grid grid-cols-5 gap-2 sm:gap-3 max-w-xl mx-auto" id="volante-grid">
      ${ballsHtml.join('')}
    </div>
  `;
}

export function attachVolanteEvents(container: HTMLElement, onBallClick: (number: number) => void): void {
  const balls = container.querySelectorAll<HTMLElement>('.volante-ball');
  balls.forEach((b) => {
    b.addEventListener('click', () => {
      const num = Number(b.dataset.number);
      if (num >= 1 && num <= UNIVERSE_SIZE) {
        onBallClick(num);
      }
    });
  });
}
