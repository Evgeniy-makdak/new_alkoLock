import { CHAT_POPUP_ACTIVE_STORAGE_KEY } from './constants';

/** Как часто окно чата обновляет метку в localStorage */
export const CHAT_POPUP_HEARTBEAT_MS = 4000;

/** Если метка не обновлялась дольше — считаем окно мёртвым и показываем чат в основной вкладке */
export const CHAT_POPUP_STALE_MS = CHAT_POPUP_HEARTBEAT_MS * 4;

/**
 * Основная вкладка скрывает чат только пока «живо» отдельное окно (свежее время в storage).
 * Старое значение '1' без heartbeat залипало и навсегда прятало ChatFooter.
 */
export function readMainChatFooterSuppressedByPopup(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const raw = localStorage.getItem(CHAT_POPUP_ACTIVE_STORAGE_KEY);
    if (raw == null) return false;
    if (raw === '1') {
      localStorage.removeItem(CHAT_POPUP_ACTIVE_STORAGE_KEY);
      return false;
    }
    const t = Number(raw);
    if (!Number.isFinite(t)) {
      localStorage.removeItem(CHAT_POPUP_ACTIVE_STORAGE_KEY);
      return false;
    }
    return Date.now() - t < CHAT_POPUP_STALE_MS;
  } catch {
    return false;
  }
}
