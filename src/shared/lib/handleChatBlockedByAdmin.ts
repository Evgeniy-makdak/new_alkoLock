import { enqueueSnackbar } from 'notistack';

import { mobileFeaturesStore } from '@shared/model/mobile_features_store/mobileFeaturesStore';

const CHAT_BLOCKED_RE =
  /функция\s*чат\s*заблокирован|чат\s*заблокирован.*администратор|chat\s*(function\s*)?(is\s*)?blocked/i;

const DEFAULT_CHAT_BLOCKED_MESSAGE = 'Функция Чат заблокирована Администратором системы';

type ChatBlockedPayload = {
  status?: number | string | null;
  detail?: unknown;
  message?: unknown;
  title?: unknown;
  path?: unknown;
};

let lastSnackAt = 0;
const SNACK_DEDUP_MS = 2500;

const collectText = (payload: ChatBlockedPayload | string | null | undefined): string => {
  if (payload == null) return '';
  if (typeof payload === 'string') return payload;
  return [payload.detail, payload.message, payload.title, payload.path]
    .filter((part) => typeof part === 'string' && part.trim().length > 0)
    .join(' ');
};

const resolveSnackMessage = (
  payload: ChatBlockedPayload | string | null | undefined,
): string => {
  if (typeof payload === 'string' && payload.trim()) {
    // Если пришла сырая строка с JSON — пытаемся вытащить detail
    try {
      const parsed = JSON.parse(payload) as ChatBlockedPayload;
      if (typeof parsed?.detail === 'string' && parsed.detail.trim()) return parsed.detail.trim();
    } catch {
      // не JSON — показываем как есть, если похоже на человекочитаемый текст
      if (CHAT_BLOCKED_RE.test(payload)) return payload.trim();
    }
    return DEFAULT_CHAT_BLOCKED_MESSAGE;
  }

  if (payload && typeof payload === 'object') {
    if (typeof payload.detail === 'string' && payload.detail.trim()) return payload.detail.trim();
    if (typeof payload.message === 'string' && CHAT_BLOCKED_RE.test(payload.message)) {
      return payload.message.trim();
    }
  }

  return DEFAULT_CHAT_BLOCKED_MESSAGE;
};

/** 409 + текст «Функция Чат заблокирована Администратором системы» (и похожие формулировки). */
export const isChatBlockedByAdminError = (
  payload: ChatBlockedPayload | string | null | undefined,
): boolean => {
  const text = collectText(payload);
  if (!text || !CHAT_BLOCKED_RE.test(text)) return false;

  if (payload && typeof payload === 'object') {
    const status = Number(payload.status);
    if (Number.isFinite(status) && status !== 0 && status !== 409) return false;
  }

  return true;
};

/**
 * Если ошибка означает блокировку чата админом — сразу выключает chatEnabled
 * (скрываются иконка и диалоговые окна через App) и показывает snackbar.
 * @returns true, если ошибка обработана как блокировка чата
 */
export const handleChatBlockedByAdminResponse = (
  payload: ChatBlockedPayload | string | null | undefined,
): boolean => {
  if (!isChatBlockedByAdminError(payload)) return false;

  mobileFeaturesStore.getState().disableChat();

  const now = Date.now();
  if (now - lastSnackAt > SNACK_DEDUP_MS) {
    lastSnackAt = now;
    enqueueSnackbar(resolveSnackMessage(payload), { variant: 'error' });
  }

  return true;
};
