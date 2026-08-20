import { RoutePaths } from '@shared/config/routePathsEnum';
import { StorageKeys } from '@shared/const/storageKeys';
import { getBearerToken } from '@shared/utils/cookie_manager';

type AuthSessionStamp = {
  fp: string;
  ts: number;
  /** Вход с обязательной сменой пароля — другие вкладки должны открыть /changePassword. */
  needChangePassword?: boolean;
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

function scheduleReplace(target: string): void {
  if (reloadScheduled) return;
  reloadScheduled = true;
  window.location.replace(target);
}

/**
 * Любая вкладка следует фазе сессии: логин / обязательная смена пароля / приложение.
 * Смена раздела внутри приложения (события ↔ настройки) не синхронизируется.
 */
function handleForeignStamp(nextFp: string | null, needChangePassword?: boolean): void {
  const path = window.location.pathname;
  // Шаги восстановления пароля не должны уезжать на /authorization при focus/visibility.
  if (
    path === RoutePaths.resetPassword ||
    path === RoutePaths.confirmPassword ||
    path === RoutePaths.forgetPassword
  ) {
    return;
  }

  const foreign = isForeignSession(nextFp);

  if (nextFp == null) {
    if (!foreign && path === RoutePaths.auth) return;
    scheduleReplace(RoutePaths.auth);
    return;
  }

  if (needChangePassword) {
    if (!foreign && path === RoutePaths.changePassword) return;
    scheduleReplace(RoutePaths.changePassword);
    return;
  }

  if (!foreign) return;
  scheduleReplace(RoutePaths.root);
}

/** Зафиксировать сессию этой вкладки по текущему cookie (после своего login). */
export function bindLocalAuthSessionFromCurrentBearer(): void {
  thisTabFingerprint = currentBearerFingerprint();
}

export function bindLocalAuthSessionLoggedOut(): void {
  thisTabFingerprint = null;
}

/** Сообщить другим вкладкам, что cookie/сессия сменились. */
export function publishAuthSessionFromBearer(options?: { needChangePassword?: boolean }): void {
  bindLocalAuthSessionFromCurrentBearer();
  const fp = thisTabFingerprint;
  if (!fp) {
    clearAuthSessionStamp();
    return;
  }
  const needChangePassword = options?.needChangePassword === true;
  const current = readStamp();
  if (current?.fp === fp && Boolean(current.needChangePassword) === needChangePassword) return;
  const stamp: AuthSessionStamp = {
    fp,
    ts: Date.now(),
    ...(needChangePassword ? { needChangePassword: true } : {}),
  };
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
    let needChangePassword = false;
    if (event.newValue) {
      try {
        const parsed = JSON.parse(event.newValue) as AuthSessionStamp;
        nextFp = parsed?.fp ?? null;
        needChangePassword = parsed?.needChangePassword === true;
      } catch {
        nextFp = null;
      }
    }
    handleForeignStamp(nextFp, needChangePassword);
  };

  const onFocus = () => {
    const stamp = readStamp();
    handleForeignStamp(stamp?.fp ?? null, stamp?.needChangePassword === true);
  };

  const onVisibility = () => {
    if (document.visibilityState === 'visible') onFocus();
  };

  window.addEventListener('storage', onStorage);
  window.addEventListener('focus', onFocus);
  document.addEventListener('visibilitychange', onVisibility);

  const channel = getChannel();
  const onBroadcast = (event: MessageEvent<{ fp?: string | null; needChangePassword?: boolean }>) => {
    try {
      handleForeignStamp(event.data?.fp ?? null, event.data?.needChangePassword === true);
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
