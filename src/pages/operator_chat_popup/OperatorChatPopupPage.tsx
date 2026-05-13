import { useEffect } from 'react';

import { useSelectedBranchOfficeSync } from '@features/nav_bar_branch_select/hooks/useSelectedBranchOfficeSync';
import { CHAT_POPUP_ACTIVE_STORAGE_KEY } from '@widgets/chat/chatPopup/constants';
import { CHAT_POPUP_HEARTBEAT_MS } from '@widgets/chat/chatPopup/popupPresence';
import { useOperatorChatPopupWindowFrame } from '@widgets/chat/chatPopup/useOperatorChatPopupWindowFrame';

/**
 * Пульс timestamp в localStorage: основная вкладка скрывает ChatFooter только пока метка «свежая».
 * Синхронизация филиала с OFFICE — как в NavBar, иначе в popup нет selectedBranchState и списки с branchId не грузятся.
 */
export default function OperatorChatPopupPage(): null {
  useSelectedBranchOfficeSync();
  useOperatorChatPopupWindowFrame();

  useEffect(() => {
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
    };
  }, []);

  return null;
}
