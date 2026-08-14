/**
 * Диагностика непрочитанных, бейджей и скролла при раскрытии чата.
 * Логи с префиксом «[Чат:непрочитанные]».
 * В MessageFeed при скролле к первому непрочитанному смотрите поля «лентаСообщений», «якорь…», «первоеВидимоеСообщениеId».
 *
 * localStorage.CHAT_UNREAD_DEBUG:
 *   '1' — включить логи; иначе выключены (в т.ч. в development).
 */

export const CHAT_UNREAD_DEBUG_TAG = '[Чат:непрочитанные]';

const TAG = CHAT_UNREAD_DEBUG_TAG;

export function isOperatorUnreadDebugEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem('CHAT_UNREAD_DEBUG') === '1';
}

export function operatorUnreadDebug(message: string, payload?: Record<string, unknown>): void {
  if (!isOperatorUnreadDebugEnabled()) return;
  if (payload !== undefined) {
    console.log(`${TAG} ${message}`, payload);
  } else {
    console.log(`${TAG} ${message}`);
  }
}

export function unreadMapSnapshot(map: Map<number, number> | undefined): Record<string, number> {
  const out: Record<string, number> = {};
  if (!map) return out;
  map.forEach((c, id) => {
    if (id > 0 && c > 0) out[String(id)] = c;
  });
  return out;
}
