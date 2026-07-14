import { useEffect, useLayoutEffect, useRef } from 'react';

import { useSelectedBranchOfficeSync } from '@features/nav_bar_branch_select/hooks/useSelectedBranchOfficeSync';
import { cookieManager, getBearerToken, isValidJwtFormat } from '@shared/utils/cookie_manager';
import { CHAT_POPUP_ACTIVE_STORAGE_KEY } from '@widgets/chat/chatPopup/constants';
import {
  DESKTOP_AUTH_READY_EVENT,
  isElectronOperatorChatPopup,
  notifyDesktopAuthReady,
  syncElectronOperatorChatPopupAuthFromUrl,
} from '@widgets/chat/chatPopup/electronPopupAuth';
import {
  bootstrapElectronOperatorChatPopupSession,
  DESKTOP_BRANCH_READY_EVENT,
  ensureElectronPopupBearerCookie,
  syncElectronPopupBranchFromStorage,
} from '@widgets/chat/chatPopup/electronPopupSessionBootstrap';
import {
  ELECTRON_POPUP_REQUEST_UNREAD_REST_EVENT,
  fetchElectronPopupUnreadDialogs,
  requestElectronPopupUnreadRest,
} from '@widgets/chat/chatPopup/electronPopupUnreadRest';
import { CHAT_POPUP_HEARTBEAT_MS } from '@widgets/chat/chatPopup/popupPresence';
import { installOperatorChatPopupResizeObserverErrorGuard } from '@widgets/chat/chatPopup/suppressResizeObserverLoopError';
import { useOperatorChatPopupWindowFrame } from '@widgets/chat/chatPopup/useOperatorChatPopupWindowFrame';

/**
 * Синхронизация филиала с OFFICE — как в NavBar, иначе в popup нет selectedBranchState и списки с branchId не грузятся.
 * Electron: JWT из URL/IPC → cookie bearer + localStorage для STOMP и REST.
 */
export default function OperatorChatPopupPage(): null {
  useSelectedBranchOfficeSync();
  useOperatorChatPopupWindowFrame();

  useLayoutEffect(() => {
    if (!isElectronOperatorChatPopup()) return;

    if (syncElectronOperatorChatPopupAuthFromUrl()) {
      notifyDesktopAuthReady();
    }
    ensureElectronPopupBearerCookie();
    syncElectronPopupBranchFromStorage();
  }, []);

  useEffect(() => {
    if (!isElectronOperatorChatPopup()) return;

    const mountedRef = { current: true };
    let inflight = false;

    const triggerUnreadRest = () => {
      if (!mountedRef.current || inflight) return;
      if (!getBearerToken()) return;
      inflight = true;
      requestElectronPopupUnreadRest();
      void fetchElectronPopupUnreadDialogs().finally(() => {
        inflight = false;
      });
    };

    void bootstrapElectronOperatorChatPopupSession().then(triggerUnreadRest);

    const ensureDesktopAuth = async () => {
      if (getBearerToken()) {
        notifyDesktopAuthReady();
        triggerUnreadRest();
        return;
      }
      try {
        const token = await window.alcolockDesktop?.getAuthToken();
        if (!mountedRef.current || !token || !isValidJwtFormat(token)) return;
        localStorage.setItem('authToken', token);
        cookieManager.set('bearer', token);
        notifyDesktopAuthReady();
        triggerUnreadRest();
      } catch {
        /* ignore */
      }
    };

    void ensureDesktopAuth();

    window.addEventListener(DESKTOP_AUTH_READY_EVENT, triggerUnreadRest);
    window.addEventListener(DESKTOP_BRANCH_READY_EVENT, triggerUnreadRest);
    window.addEventListener(ELECTRON_POPUP_REQUEST_UNREAD_REST_EVENT, triggerUnreadRest);

    let attempts = 0;
    const pollId = window.setInterval(() => {
      attempts += 1;
      triggerUnreadRest();
      if (attempts >= 40) {
        window.clearInterval(pollId);
      }
    }, 250);

    return () => {
      mountedRef.current = false;
      window.clearInterval(pollId);
      window.removeEventListener(DESKTOP_AUTH_READY_EVENT, triggerUnreadRest);
      window.removeEventListener(DESKTOP_BRANCH_READY_EVENT, triggerUnreadRest);
      window.removeEventListener(ELECTRON_POPUP_REQUEST_UNREAD_REST_EVENT, triggerUnreadRest);
    };
  }, []);

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
