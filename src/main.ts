/**
 * Ponto de Entrada Principal da Aplicação LOTOFÁCIL QUANT ENGINE.
 */
import { appState, type AppRoute, type AppState } from './app/state';
import { renderDashboardPage, attachDashboardEvents } from './pages/dashboardPage';
import { renderHistoryPage, attachHistoryEvents } from './pages/historyPage';
import { renderStatisticsPage } from './pages/statisticsPage';
import { renderCyclesPage, setupCyclesPageListeners } from './pages/cyclesPage';
import { renderMarkovPage } from './pages/markovPage';
import { renderCooccurrencePage } from './pages/cooccurrencePage';
import { renderEntropyPage } from './pages/entropyPage';
import { renderGeneratorPage, attachGeneratorEvents } from './pages/generatorPage';
import { renderGamesPage, attachGamesEvents } from './pages/gamesPage';
import { renderReportsPage, attachReportsEvents } from './pages/reportsPage';
import { renderConfigPage, attachConfigEvents } from './pages/configPage';
import { showModal } from './components/modal';

function updateNavigationUi(currentRoute: AppRoute): void {
  const navButtons = document.querySelectorAll<HTMLElement>('#app-nav .nav-item');
  navButtons.forEach((btn) => {
    const route = btn.dataset.nav as AppRoute;
    if (route === currentRoute) {
      btn.classList.add('bg-slate-800/80', 'text-white', 'shadow-sm');
      btn.classList.remove('text-slate-400');
    } else {
      btn.classList.remove('bg-slate-800/80', 'text-white', 'shadow-sm');
      btn.classList.add('text-slate-400');
    }
  });
}

function updateTopPill(state: AppState): void {
  const pillText = document.getElementById('dataset-status-text');
  const pill = document.getElementById('dataset-status-pill');
  if (!pillText || !pill) return;

  if (state.currentDataset) {
    pillText.textContent = `${state.currentDataset.name} (${state.currentContests.length} conc.)`;
    pill.classList.remove('text-slate-400');
    pill.classList.add('text-cyan-300');
    pill.querySelector('span')?.classList.remove('bg-amber-500');
    pill.querySelector('span')?.classList.add('bg-emerald-400');
  } else {
    pillText.textContent = 'Nenhum histórico carregado';
    pill.classList.add('text-slate-400');
    pill.classList.remove('text-cyan-300');
    pill.querySelector('span')?.classList.add('bg-amber-500');
    pill.querySelector('span')?.classList.remove('bg-emerald-400');
  }
}

function renderCurrentView(state: AppState): void {
  const mainView = document.getElementById('app-view');
  if (!mainView) return;

  updateNavigationUi(state.currentRoute);
  updateTopPill(state);

  switch (state.currentRoute) {
    case 'dashboard':
      mainView.innerHTML = renderDashboardPage(state);
      attachDashboardEvents(state);
      break;
    case 'historico':
      mainView.innerHTML = renderHistoryPage(state);
      attachHistoryEvents(state);
      break;
    case 'estatistica':
      mainView.innerHTML = renderStatisticsPage(state);
      break;
    case 'ciclos':
      mainView.innerHTML = renderCyclesPage(state);
      setupCyclesPageListeners();
      break;
    case 'markov':
      mainView.innerHTML = renderMarkovPage(state);
      break;
    case 'coocorrencia':
      mainView.innerHTML = renderCooccurrencePage(state);
      break;
    case 'entropia':
      mainView.innerHTML = renderEntropyPage(state);
      break;
    case 'gerador':
      mainView.innerHTML = renderGeneratorPage(state);
      attachGeneratorEvents(state);
      break;
    case 'jogos':
      mainView.innerHTML = renderGamesPage(state);
      attachGamesEvents(state);
      break;
    case 'relatorios':
      mainView.innerHTML = renderReportsPage(state);
      attachReportsEvents(state);
      break;
    case 'configuracoes':
      mainView.innerHTML = renderConfigPage(state);
      attachConfigEvents(state);
      break;
  }
}

// Inicialização de Eventos Globais
document.addEventListener('DOMContentLoaded', async () => {
  // Configuração dos botões de navegação
  const navContainer = document.getElementById('app-nav');
  navContainer?.addEventListener('click', (e) => {
    const target = (e.target as HTMLElement).closest<HTMLElement>('.nav-item');
    if (target && target.dataset.nav) {
      appState.navigateTo(target.dataset.nav as AppRoute);
    }
  });

  // Botão de importação rápida no topo
  document.getElementById('btn-quick-import')?.addEventListener('click', () => {
    document.getElementById('file-importer-input')?.click();
  });

  // Input de importação de arquivo histórico (.xlsx/.csv)
  const fileInput = document.getElementById('file-importer-input') as HTMLInputElement;
  fileInput?.addEventListener('change', async (e) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;

    try {
      const buffer = await file.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      await appState.importFile(bytes, file.name);
      alert(`Histórico '${file.name}' importado com sucesso!`);
    } catch (err) {
      showModal({
        title: 'Erro na Ingestão de Histórico',
        bodyHtml: `<p class="text-rose-400 text-xs">${(err as Error).message.replace(/\n/g, '<br/>')}</p>`,
      });
    } finally {
      fileInput.value = '';
    }
  });

  // Registro do Service Worker para PWA Offline (§36)
  if ('serviceWorker' in navigator && import.meta.env.PROD) {
    try {
      await navigator.serviceWorker.register('/sw.js');
      console.log('Service Worker registrado com sucesso (PWA offline-ready).');
    } catch (e) {
      console.warn('Falha no registro do Service Worker:', e);
    }
  }

  // Se inscreve no estado
  appState.subscribe(renderCurrentView);

  // Inicializa o estado persistido do IndexedDB
  await appState.initialize();

  // Se não houver nenhum dataset carregado na inicialização, tenta auto-carregar o fixture interno se em dev
  const curState = appState.getState();
  if (!curState.currentDataset) {
    try {
      // Se houver um dataset salvo no IndexedDB após primeiro uso, ele já é carregado;
      // Caso contrário, o usuário vê a tela de boas-vindas com botão de importação.
    } catch {
      // noop
    }
  }
});
