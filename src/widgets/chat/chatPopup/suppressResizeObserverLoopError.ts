/** Popup чата: debounce ResizeObserver + подавление dev-overlay «ResizeObserver loop…». */
let installed = false;

function isResizeObserverLoopMessage(message: unknown): boolean {
  const text = message instanceof Error ? message.message : String(message ?? '');
  return text.includes('ResizeObserver loop');
}

function installDebouncedResizeObserver(): void {
  const NativeResizeObserver = window.ResizeObserver;
  if (!NativeResizeObserver) return;

  window.ResizeObserver = class PopupDebouncedResizeObserver extends NativeResizeObserver {
    constructor(callback: ResizeObserverCallback) {
      let frameId = 0;
      super((entries, observer) => {
        if (frameId) cancelAnimationFrame(frameId);
        frameId = requestAnimationFrame(() => {
          frameId = 0;
          callback(entries, observer);
        });
      });
    }
  };
}

export function installOperatorChatPopupResizeObserverErrorGuard(): void {
  if (installed || typeof window === 'undefined') return;
  installed = true;

  installDebouncedResizeObserver();

  window.addEventListener(
    'error',
    (event) => {
      if (!isResizeObserverLoopMessage(event.message) && !isResizeObserverLoopMessage(event.error)) {
        return;
      }
      event.preventDefault();
      event.stopImmediatePropagation();
    },
    true,
  );

  const reportError = window.reportError?.bind(window);
  if (reportError) {
    window.reportError = (error?: unknown) => {
      if (isResizeObserverLoopMessage(error)) return;
      reportError(error);
    };
  }
}
