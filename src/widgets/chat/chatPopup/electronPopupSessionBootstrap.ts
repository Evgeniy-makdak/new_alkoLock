import { StorageKeys } from '@shared/const/storageKeys';
import { appStore, type SelectedBranchState } from '@shared/model/app_store/AppStore';
import { getItem, setItem } from '@shared/model/store/localStorage';
import { cookieManager, getBearerToken, isValidJwtFormat } from '@shared/utils/cookie_manager';

import { isElectronOperatorChatPopup, notifyDesktopAuthReady } from './electronPopupAuth';

/** Electron popup: selectedBranchState готов (из OFFICE / IPC). */
export const DESKTOP_BRANCH_READY_EVENT = 'alcolock-desktop-branch-ready';

export function notifyDesktopBranchReady(): void {
  if (typeof window === 'undefined' || !window.alcolockDesktop) return;
  window.dispatchEvent(new CustomEvent(DESKTOP_BRANCH_READY_EVENT));
}

/** localStorage authToken → cookie bearer (useAppApi и getBearerToken читают cookie). */
export function ensureElectronPopupBearerCookie(): boolean {
  if (!isElectronOperatorChatPopup()) return false;
  if (getBearerToken()) return true;

  let token: string | null = null;
  try {
    token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
  } catch {
    return false;
  }
  if (!token || !isValidJwtFormat(token)) return false;

  try {
    cookieManager.set('bearer', token);
    notifyDesktopAuthReady();
    return true;
  } catch {
    return false;
  }
}

/** OFFICE из shared Electron session → selectedBranchState (STOMP требует branchId). */
export function syncElectronPopupBranchFromStorage(): SelectedBranchState | null {
  if (!isElectronOperatorChatPopup()) return null;

  const office = getItem<SelectedBranchState>(StorageKeys.OFFICE);
  if (!office?.id) return null;

  const current = appStore.getState().selectedBranchState;
  if (current?.id === office.id) return office;

  const branch: SelectedBranchState = {
    id: office.id,
    name: office.name || '',
  };
  appStore.setState({ selectedBranchState: branch });
  notifyDesktopBranchReady();
  return branch;
}

/** Полная подготовка сессии popup: JWT cookie + филиал (storage и IPC из основного окна). */
export async function bootstrapElectronOperatorChatPopupSession(): Promise<void> {
  if (!isElectronOperatorChatPopup()) return;

  ensureElectronPopupBearerCookie();
  syncElectronPopupBranchFromStorage();

  if (appStore.getState().selectedBranchState?.id) return;

  try {
    const branch = await window.alcolockDesktop?.getSelectedBranchState?.();
    if (!branch?.id) return;

    const value: SelectedBranchState = {
      id: branch.id,
      name: branch.name || '',
    };
    setItem(StorageKeys.OFFICE, value);
    appStore.setState({ selectedBranchState: value });
    notifyDesktopBranchReady();
  } catch {
    /* ignore */
  }
}
