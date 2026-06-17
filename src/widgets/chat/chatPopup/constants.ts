/** Основная вкладка скрывает ChatFooter, пока открыто окно с этим ключом в localStorage (событие storage). */
export const CHAT_POPUP_ACTIVE_STORAGE_KEY = 'alcolock_operator_chat_popup_active_v1';

/** После закрытия /operator-chat-popup основная вкладка восстанавливает открытость панели чата (см. mainChatOpenRestoreFromPopup). */
export const CHAT_MAIN_RESTORE_IS_CHAT_OPEN_FROM_POPUP_KEY =
  'alcolock_operator_chat_main_restore_is_open_from_popup_v1';

/** Одноразово после восстановления isChatOpen=true из popup: не сразу закрывать панель при пустых сессиях. */
export const CHAT_MAIN_RESTORE_SKIP_EMPTY_CLOSE_ONCE_SESSION_KEY =
  'alcolock_chat_main_restore_skip_empty_close_once_v1';

/**
 * Handoff в sessionStorage **родительской** вкладки (window.opener): popup пишет сюда перед закрытием.
 * Так переживаем React Strict Mode (двойной вызов useState init не «съедает» значение из localStorage).
 */
export const CHAT_MAIN_POPUP_RETURN_HANDOFF_SESSION_KEY =
  'alcolock_chat_main_popup_return_handoff_v1';

/** Дубль полного JSON handoff (v2) в localStorage — если opener недоступен или для peek после Strict Mode. */
export const CHAT_MAIN_POPUP_RETURN_V2_LOCAL_STORAGE_KEY =
  'alcolock_chat_main_popup_return_v2_local_v1';

/** Если opener недоступен — флаг bootstrap в localStorage (см. persistMainRestore…). */
export const CHAT_MAIN_RESTORE_SKIP_EMPTY_CLOSE_ONCE_LOCAL_KEY =
  'alcolock_chat_main_restore_skip_empty_close_local_v1';

/** Одноразовый снимок сессий при открытии /operator-chat-popup из основной вкладки (localStorage). */
export const CHAT_MAIN_TO_OPERATOR_POPUP_HANDOFF_LOCAL_KEY =
  'alcolock_chat_main_to_operator_popup_handoff_v1';

/** Snapshot боковых preview-карточек при открытии /operator-chat-popup из основной вкладки. */
export const CHAT_OPERATOR_POPUP_PREVIEW_SNAPSHOT_KEY =
  'alcolock_operator_chat_popup_preview_snapshot_v1';

/**
 * В окне popup: после первого fetch истории/unread по handoff из основной вкладки — не повторять при
 * React Strict Mode (двойной mount в dev).
 */
export const CHAT_POPUP_FROM_MAIN_FETCH_ONCE_SESSION_KEY =
  'alcolock_chat_popup_from_main_fetch_once_v1';

/** Electron desktop: popup закрылся, основное окно должно сбросить состояние чата. */
export const CHAT_DESKTOP_POPUP_CLOSED_EVENT_KEY =
  'alcolock_desktop_operator_chat_popup_closed_v1';

export const OPERATOR_CHAT_POPUP_WINDOW_NAME = 'alcolock-operator-chat';

/** Маркер на `.chatFloatingDock` в окне operator-chat-popup — подгонка размера окна под чат. */
export const OPERATOR_CHAT_POPUP_DOCK_SELECTOR = '[data-operator-chat-dock="1"]';

/** Карточки свёрнутых/непрочитанных превью внутри popup dock. */
export const OPERATOR_CHAT_POPUP_PREVIEW_SELECTOR = '[data-operator-chat-preview="1"]';
