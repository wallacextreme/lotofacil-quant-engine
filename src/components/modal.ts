/**
 * Componente Modal Reutilizável para Diagnósticos, Relatórios e Backups.
 */
export interface ModalOptions {
  title: string;
  bodyHtml: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm?: () => void;
  onCancel?: () => void;
}

export function showModal(options: ModalOptions): void {
  const container = document.getElementById('modal-container');
  const content = document.getElementById('modal-content');
  if (!container || !content) return;

  const confirmBtnHtml = options.confirmText
    ? `<button id="modal-confirm-btn" class="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-medium text-xs transition shadow-sm">${options.confirmText}</button>`
    : '';

  const cancelBtnHtml = options.cancelText
    ? `<button id="modal-cancel-btn" class="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs transition border border-slate-700">${options.cancelText}</button>`
    : `<button id="modal-cancel-btn" class="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs transition border border-slate-700">Fechar</button>`;

  content.innerHTML = `
    <div class="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
      <h3 class="text-sm font-bold text-white tracking-wide">${options.title}</h3>
      <button id="modal-close-x" class="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
      </button>
    </div>
    <div class="px-6 py-5 overflow-y-auto flex-1 text-xs text-slate-300 space-y-4">
      ${options.bodyHtml}
    </div>
    <div class="px-6 py-4 border-t border-slate-800 flex items-center justify-end gap-3 bg-slate-950/40">
      ${cancelBtnHtml}
      ${confirmBtnHtml}
    </div>
  `;

  container.classList.remove('hidden');

  const close = () => {
    container.classList.add('hidden');
    content.innerHTML = '';
  };

  document.getElementById('modal-close-x')?.addEventListener('click', () => {
    if (options.onCancel) options.onCancel();
    close();
  });

  document.getElementById('modal-cancel-btn')?.addEventListener('click', () => {
    if (options.onCancel) options.onCancel();
    close();
  });

  document.getElementById('modal-confirm-btn')?.addEventListener('click', () => {
    if (options.onConfirm) options.onConfirm();
    close();
  });
}

export function hideModal(): void {
  const container = document.getElementById('modal-container');
  if (container) container.classList.add('hidden');
}
