import { useEffect, useState } from 'react';

import { CHAT_POPUP_ACTIVE_STORAGE_KEY } from './constants';
import { CHAT_POPUP_HEARTBEAT_MS, readMainChatFooterSuppressedByPopup } from './popupPresence';

/**
 * Пока открыто живое окно /operator-chat-popup, в основной вкладке не показываем ChatFooter
 * (избегаем двух независимых экземпляров SocketProvider).
 * Метка — timestamp с heartbeat; без обновлений считается протухшей (см. popupPresence).
 */
export function useSuppressMainChatFooterForPopup(isOperatorChatPopupRoute: boolean): boolean {
  const [suppressed, setSuppressed] = useState(() => readMainChatFooterSuppressedByPopup());

  useEffect(() => {
    if (isOperatorChatPopupRoute) {
      setSuppressed(false);
      return;
    }

    setSuppressed(readMainChatFooterSuppressedByPopup());

    const onStorage = (e: StorageEvent) => {
      if (e.key !== CHAT_POPUP_ACTIVE_STORAGE_KEY) return;
      setSuppressed(readMainChatFooterSuppressedByPopup());
    };

    window.addEventListener('storage', onStorage);

    const poll = window.setInterval(() => {
      setSuppressed(readMainChatFooterSuppressedByPopup());
    }, CHAT_POPUP_HEARTBEAT_MS);

    return () => {
      window.removeEventListener('storage', onStorage);
      window.clearInterval(poll);
    };
  }, [isOperatorChatPopupRoute]);

  return isOperatorChatPopupRoute ? false : suppressed;
}
