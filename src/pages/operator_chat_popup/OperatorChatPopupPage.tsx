import { useEffect } from 'react';

import { useSelectedBranchOfficeSync } from '@features/nav_bar_branch_select/hooks/useSelectedBranchOfficeSync';
import { CHAT_POPUP_ACTIVE_STORAGE_KEY } from '@widgets/chat/chatPopup/constants';
import { CHAT_POPUP_HEARTBEAT_MS } from '@widgets/chat/chatPopup/popupPresence';
import { installOperatorChatPopupResizeObserverErrorGuard } from '@widgets/chat/chatPopup/suppressResizeObserverLoopError';
import { useOperatorChatPopupWindowFrame } from '@widgets/chat/chatPopup/useOperatorChatPopupWindowFrame';

/**
 * Пульс timestamp в localStorage: основная вкладка скрывает ChatFooter только пока метка «свежая».
 * Синхронизация филиала с OFFICE — как в NavBar, иначе в popup нет selectedBranchState и списки с branchId не грузятся.
 */
export default function OperatorChatPopupPage(): null {
  useSelectedBranchOfficeSync();
  useOperatorChatPopupWindowFrame();

  useEffect(() => {
    installOperatorChatPopupResizeObserverErrorGuard();
  }, []);

  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const root = document.getElementById('root');
    const popupClassName = 'operator-chat-popup-transparent';

    const prevHtmlBackground = html.style.background;
    const prevBodyBackground = body.style.background;
    const prevRootBackground = root?.style.background ?? '';

    html.classList.add(popupClassName);
    body.classList.add(popupClassName);
    root?.classList.add(popupClassName);
    html.style.background = 'transparent';
    body.style.background = 'transparent';
    if (root) {
      root.style.background = 'transparent';
    }

    const pulse = () => {
      try {
        localStorage.setItem(CHAT_POPUP_ACTIVE_STORAGE_KEY, String(Date.now()));
      } catch {
        /* ignore */
      }
    };

    pulse();
    const interval = window.setInterval(pulse, CHAT_POPUP_HEARTBEAT_MS);

    const unmark = () => {
      window.clearInterval(interval);
      try {
        localStorage.removeItem(CHAT_POPUP_ACTIVE_STORAGE_KEY);
      } catch {
        /* ignore */
      }
    };

    window.addEventListener('beforeunload', unmark);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener('beforeunload', unmark);
      html.classList.remove(popupClassName);
      body.classList.remove(popupClassName);
      root?.classList.remove(popupClassName);
      html.style.background = prevHtmlBackground;
      body.style.background = prevBodyBackground;
      if (root) {
        root.style.background = prevRootBackground;
      }
    };
  }, []);

  return null;
}
