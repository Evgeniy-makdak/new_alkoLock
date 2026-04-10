/**
 * Диагностика непрочитанных, бейджей и скролла при раскрытии чата.
 * Логи с префиксом «[Чат:непрочитанные]».
 *
 * localStorage.CHAT_UNREAD_DEBUG:
 *   не задано — в development логи включены;
 *   '1' — включить явно; '0' — выключить полностью.
 */

const TAG = '[Чат:непрочитанные]';

export function isOperatorUnreadDebugEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  const v = localStorage.getItem('CHAT_UNREAD_DEBUG');
  if (v === '0') return false;
  if (v === '1') return true;
  return process.env.NODE_ENV === 'development';
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
