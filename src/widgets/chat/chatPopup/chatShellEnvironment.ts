/** Установленная PWA (standalone / minimal-ui). */
export function isPwaDisplayMode(): boolean {
  if (typeof window === 'undefined') return false;
  const nav = window.navigator as Navigator & { standalone?: boolean };
  return (
    nav.standalone === true ||
    window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: minimal-ui)').matches
  );
}

export function isElectronChatShell(): boolean {
  return typeof window !== 'undefined' && Boolean(window.alcolockDesktop);
}

/** Обычный браузер: не Electron и не PWA. */
export function isBrowserWebChatShell(): boolean {
  return !isElectronChatShell() && !isPwaDisplayMode();
}

/** Electron: основное окно (чат в отдельном popup, не /operator-chat-popup). */
export function isElectronMainChatHost(): boolean {
  return (
    isElectronChatShell() &&
    typeof window !== 'undefined' &&
    !window.location.pathname.includes('/operator-chat-popup')
  );
}
