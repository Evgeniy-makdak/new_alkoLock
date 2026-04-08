/** Трассировка счётчиков непрочитанного: WS → Zustand/React state → рендер бейджей. */

export const CHAT_UNREAD_LOG_TAG = '[ChatUnread]';

/** Раскрытие / свёртывание сессий, дедупликация — отдельный тег, чтобы фильтровать в консоли. */
export const CHAT_SESSION_LOG_TAG = '[ChatSession]';

export function chatUnreadTrace(stage: string, payload?: Record<string, unknown>) {
  if (payload === undefined) {
    console.log(`${CHAT_UNREAD_LOG_TAG} ${stage}`);
  } else {
    console.log(`${CHAT_UNREAD_LOG_TAG} ${stage}`, payload);
  }
}

export function chatSessionTrace(stage: string, payload?: Record<string, unknown>) {
  if (payload === undefined) {
    console.log(`${CHAT_SESSION_LOG_TAG} ${stage}`);
  } else {
    console.log(`${CHAT_SESSION_LOG_TAG} ${stage}`, payload);
  }
}

export function unreadMapToRecord(map: Map<number, number>): Record<string, number> {
  const out: Record<string, number> = {};
  map.forEach((v, k) => {
    out[String(k)] = v;
  });
  return out;
}
