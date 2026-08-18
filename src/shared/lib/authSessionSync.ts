import { RoutePaths } from '@shared/config/routePathsEnum';
import { StorageKeys } from '@shared/const/storageKeys';
import { getBearerToken } from '@shared/utils/cookie_manager';

type AuthSessionStamp = {
  fp: string;
  ts: number;
};

const CHANNEL_NAME = 'alcolock-auth-session';

/** Отпечаток сессии этой вкладки на момент её загрузки / своего login-logout. */
let thisTabFingerprint: string | null | undefined;

let reloadScheduled = false;
let broadcast: BroadcastChannel | null | undefined;

function fingerprintBearer(token: string): string {
  let hash = 0;
  for (let i = 0; i < token.length; i += 1) {
    hash = (Math.imul(31, hash) + token.charCodeAt(i)) | 0;
  }
  return `${token.length}:${hash}`;
}

function readStamp(): AuthSessionStamp | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(StorageKeys.AUTH_SESSION);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AuthSessionStamp;
    if (!parsed || typeof parsed.fp !== 'string') return null;
    return parsed;
  } catch {
    return null;
  }
}

function getChannel(): BroadcastChannel | null {
  if (typeof window === 'undefined' || typeof BroadcastChannel === 'undefined') return null;
  if (broadcast === undefined) {
    try {
      broadcast = new BroadcastChannel(CHANNEL_NAME);
    } catch {
      broadcast = null;
    }
  }
  return broadcast;
}

function currentBearerFingerprint(): string | null {
  const token = getBearerToken();
  return token ? fingerprintBearer(token) : null;
}

function ensureThisTabFingerprint(): string | null {
  if (thisTabFingerprint === undefined) {
    thisTabFingerprint = currentBearerFingerprint();
  }
  return thisTabFingerprint;
}

function isForeignSession(nextFp: string | null): boolean {
  return ensureThisTabFingerprint() !== nextFp;
}

function scheduleOpenStartPage(loggedOut: boolean): void {
  if (reloadScheduled) return;
  reloadScheduled = true;
  const target = loggedOut ? RoutePaths.auth : RoutePaths.root;
  window.location.replace(target);
}

function handleForeignStamp(nextFp: string | null): void {
  if (!isForeignSession(nextFp)) return;
  scheduleOpenStartPage(nextFp == null);
}

/** Зафиксировать сессию этой вкладки по текущему cookie (после своего login). */
export function bindLocalAuthSessionFromCurrentBearer(): void {
  thisTabFingerprint = currentBearerFingerprint();
}

export function bindLocalAuthSessionLoggedOut(): void {
  thisTabFingerprint = null;
}

/** Сообщить другим вкладкам, что cookie/сессия сменились. */
export function publishAuthSessionFromBearer(): void {
  bindLocalAuthSessionFromCurrentBearer();
  const fp = thisTabFingerprint;
  if (!fp) {
    clearAuthSessionStamp();
    return;
  }
  const current = readStamp();
  if (current?.fp === fp) return;
  const stamp: AuthSessionStamp = { fp, ts: Date.now() };
  try {
    localStorage.setItem(StorageKeys.AUTH_SESSION, JSON.stringify(stamp));
  } catch {
    /* ignore quota / private mode */
  }
  try {
    getChannel()?.postMessage(stamp);
  } catch {
    /* ignore */
  }
}

export function clearAuthSessionStamp(): void {
  bindLocalAuthSessionLoggedOut();
  try {
    if (localStorage.getItem(StorageKeys.AUTH_SESSION) != null) {
      localStorage.removeItem(StorageKeys.AUTH_SESSION);
    }
  } catch {
    /* ignore */
  }
  try {
    getChannel()?.postMessage({ fp: null, ts: Date.now() });
  } catch {
    /* ignore */
  }
}

/** Слушать смену сессии в других вкладках того же браузера (не Incognito). */
export function subscribeAuthSessionSync(): () => void {
  ensureThisTabFingerprint();

  const onStorage = (event: StorageEvent) => {
    if (event.key !== StorageKeys.AUTH_SESSION) return;
    let nextFp: string | null = null;
    if (event.newValue) {
      try {
        const parsed = JSON.parse(event.newValue) as AuthSessionStamp;
        nextFp = parsed?.fp ?? null;
      } catch {
        nextFp = null;
      }
    }
    handleForeignStamp(nextFp);
  };

  const onFocus = () => {
    handleForeignStamp(readStamp()?.fp ?? null);
  };

  const onVisibility = () => {
    if (document.visibilityState === 'visible') onFocus();
  };

  window.addEventListener('storage', onStorage);
  window.addEventListener('focus', onFocus);
  document.addEventListener('visibilitychange', onVisibility);

  const channel = getChannel();
  const onBroadcast = (event: MessageEvent<{ fp?: string | null }>) => {
    try {
      handleForeignStamp(event.data?.fp ?? null);
    } catch {
      /* ignore */
    }
  };
  channel?.addEventListener('message', onBroadcast);

  return () => {
    window.removeEventListener('storage', onStorage);
    window.removeEventListener('focus', onFocus);
    document.removeEventListener('visibilitychange', onVisibility);
    channel?.removeEventListener('message', onBroadcast);
  };
}
