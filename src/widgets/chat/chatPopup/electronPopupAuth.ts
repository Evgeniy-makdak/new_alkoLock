import { cookieManager, getBearerToken, isValidJwtFormat } from '@shared/utils/cookie_manager';

/** Событие: в Electron синхронизирован JWT (cookie/localStorage). */
export const DESKTOP_AUTH_READY_EVENT = 'alcolock-desktop-auth-ready';

export function isElectronOperatorChatPopup(): boolean {
  return (
    typeof window !== 'undefined' &&
    Boolean(window.alcolockDesktop) &&
    window.location.pathname.includes('/operator-chat-popup')
  );
}

export function notifyDesktopAuthReady(): void {
  if (typeof window === 'undefined' || !window.alcolockDesktop) return;
  window.dispatchEvent(new CustomEvent(DESKTOP_AUTH_READY_EVENT));
}

/** JWT из ?token= → cookie bearer + localStorage (до mount React). */
export function syncElectronOperatorChatPopupAuthFromUrl(): string | null {
  if (typeof window === 'undefined' || !isElectronOperatorChatPopup()) return null;

  let token: string | null = null;
  try {
    token = new URLSearchParams(window.location.search).get('token');
  } catch {
    /* ignore */
  }

  if (!token) {
    token = getBearerToken();
  }

  if (!token || !isValidJwtFormat(token)) {
    return null;
  }

  try {
    localStorage.setItem('authToken', token);
    cookieManager.set('bearer', token);
    window.history.replaceState({}, '', window.location.pathname);
  } catch {
    /* ignore */
  }

  return token;
}

/** Вызвать в index.tsx до ReactDOM.render для popup Electron. */
export function primeElectronOperatorChatPopupAuth(): void {
  if (syncElectronOperatorChatPopupAuthFromUrl()) {
    notifyDesktopAuthReady();
  }
}
