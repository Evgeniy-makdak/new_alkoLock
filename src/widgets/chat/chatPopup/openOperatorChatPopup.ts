import { RoutePaths } from '@shared/config/routePathsEnum';

import { CHAT_POPUP_ACTIVE_STORAGE_KEY, OPERATOR_CHAT_POPUP_WINDOW_NAME } from './constants';
import { estimateOperatorChatPopupOuterSize } from './estimateOperatorChatPopupWindowSize';
import {
  clearMainRestoreIsChatOpenFromPopup,
  readOperatorPopupPreviewSnapshot,
} from './mainChatOpenRestoreFromPopup';
import { writeOperatorChatPopupFrameLock } from './operatorChatPopupFrameLock';
import { clearOperatorChatPopupLayoutStorage } from './popupLayoutStorage';

/**
 * Отдельное окно с тем же origin (сессия из storage).
 * `popup=yes` — в Chromium открывается не вкладка, а всплывающее окно с урезанным UI (см. window.open features).
 * Размер задаётся здесь; в popup только восстановление lock при сбое ОС (без подгонки по dock).
 */
export function openOperatorChatPopup(): void {
  clearOperatorChatPopupLayoutStorage();
  clearMainRestoreIsChatOpenFromPopup();
  const url = `${window.location.origin}${RoutePaths.operatorChatPopup}`;
  const desktopBridge = window.alcolockDesktop;
  const hasPreviewSnapshot = readOperatorPopupPreviewSnapshot().length > 0;
  const { outerW: estOuterW, outerH: estOuterH } = estimateOperatorChatPopupOuterSize({
    includePreviewColumn: Boolean(desktopBridge) || hasPreviewSnapshot,
    compactWebPopup: !desktopBridge,
  });
  let outerW = Math.min(window.screen.availWidth, estOuterW);
  let outerH = Math.min(window.screen.availHeight, estOuterH);
  outerW = Math.max(estOuterW, outerW);
  outerH = Math.max(estOuterH, outerH);

  const scr = window.screen as Screen & { availLeft?: number; availTop?: number };
  const availLeft = scr.availLeft ?? 0;
  const availTop = scr.availTop ?? 0;
  const desktopMarginPx = 16;
  const desktopVisiblePanelH = Math.min(outerH, 560);
  const left = desktopBridge
    ? availLeft + Math.max(0, scr.availWidth - outerW - desktopMarginPx)
    : availLeft + Math.max(0, (scr.availWidth - outerW) / 2);
  const top = desktopBridge
    ? availTop + Math.max(0, scr.availHeight - desktopVisiblePanelH - desktopMarginPx)
    : availTop + Math.max(0, (scr.availHeight - outerH) / 2);

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
    /* Без ручного ресайза краёв; maximize у ОС перехватываем в useOperatorChatPopupWindowFrame. */
    'resizable=no',
  ].join(',');

  writeOperatorChatPopupFrameLock({
    outerW: Math.round(outerW),
    outerH: Math.round(outerH),
    left: Math.round(left),
    top: Math.round(top),
  });

  if (desktopBridge) {
    try {
      localStorage.setItem(CHAT_POPUP_ACTIVE_STORAGE_KEY, String(Date.now()));
    } catch {
      /* ignore */
    }
    void desktopBridge.openOperatorChatPopup({
      url,
      lock: {
        outerW: Math.round(outerW),
        outerH: Math.round(outerH),
        left: Math.round(left),
        top: Math.round(top),
      },
    });
    return;
  }

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
  if (window.alcolockDesktop) {
    void window.alcolockDesktop.closeCurrentWindow();
    return;
  }
  window.close();
}
