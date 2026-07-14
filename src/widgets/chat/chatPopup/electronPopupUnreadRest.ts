import { isElectronOperatorChatPopup } from './electronPopupAuth';
import { CHAT_POPUP_OPEN_REST_GENERATION_KEY } from './constants';

/** ChatContext слушает это событие и вызывает forceLoadUnreadDialogs для всех сессий. */
export const ELECTRON_POPUP_REQUEST_UNREAD_REST_EVENT = 'alcolock-electron-popup-request-unread-rest';

/** Новое открытие popup из main — сбрасывает «уже загружено» в ChatContext. */
export function markElectronPopupOpenRestGeneration(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(CHAT_POPUP_OPEN_REST_GENERATION_KEY, String(Date.now()));
  } catch {
    /* ignore */
  }
}

export function readElectronPopupOpenRestGeneration(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(CHAT_POPUP_OPEN_REST_GENERATION_KEY);
  } catch {
    return null;
  }
}

export function requestElectronPopupUnreadRest(): void {
  if (typeof window === 'undefined' || !isElectronOperatorChatPopup()) return;
  window.dispatchEvent(new CustomEvent(ELECTRON_POPUP_REQUEST_UNREAD_REST_EVENT));
}
