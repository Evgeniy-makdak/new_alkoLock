import { RoutePaths } from '@shared/config/routePathsEnum';

import { CHAT_POPUP_ACTIVE_STORAGE_KEY, OPERATOR_CHAT_POPUP_WINDOW_NAME } from './constants';
import { estimateOperatorChatPopupInnerSize } from './estimateOperatorChatPopupWindowSize';
import { clearOperatorChatPopupLayoutStorage } from './popupLayoutStorage';

/**
 * Отдельное окно с тем же origin (сессия из storage).
 * `popup=yes` — в Chromium открывается не вкладка, а всплывающее окно с урезанным UI (см. window.open features).
 * Точная подгонка под dock — в useOperatorChatPopupWindowFrame после монтирования.
 */
export function openOperatorChatPopup(): void {
  clearOperatorChatPopupLayoutStorage();
  const url = `${window.location.origin}${RoutePaths.operatorChatPopup}`;
  const { innerW, innerH } = estimateOperatorChatPopupInnerSize();
  const chromePadW = 24;
  const chromePadH = 64;
  let outerW = Math.min(window.screen.availWidth, innerW + chromePadW);
  let outerH = Math.min(window.screen.availHeight, innerH + chromePadH);
  outerW = Math.max(360, outerW);
  outerH = Math.max(320, outerH);

  const scr = window.screen as Screen & { availLeft?: number; availTop?: number };
  const availLeft = scr.availLeft ?? 0;
  const availTop = scr.availTop ?? 0;
  const left = availLeft + Math.max(0, (scr.availWidth - outerW) / 2);
  const top = availTop + Math.max(0, (scr.availHeight - outerH) / 2);

  const features = [
    'popup=yes',
    `width=${Math.round(outerW)}`,
    `height=${Math.round(outerH)}`,
    `left=${Math.round(left)}`,
    `top=${Math.round(top)}`,
    'menubar=no',
    'toolbar=no',
    'location=no',
    'status=no',
    'scrollbars=no',
    'resizable=yes',
  ].join(',');

  const win = window.open(url, OPERATOR_CHAT_POPUP_WINDOW_NAME, features);
  win?.focus();
}

/** Снимает подавление чата в основной вкладке, фокусирует её и закрывает окно popup. */
export function closeOperatorChatPopupAndRestoreMain(): void {
  try {
    localStorage.removeItem(CHAT_POPUP_ACTIVE_STORAGE_KEY);
  } catch {
    /* ignore */
  }
  try {
    window.opener?.focus();
  } catch {
    /* ignore */
  }
  window.close();
}
