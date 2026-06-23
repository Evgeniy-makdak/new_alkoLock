import { StorageKeys } from '@shared/const/storageKeys';

export type RememberedAccount = {
  username: string;
  password: string;
};

const MAX_ACCOUNTS = 20;

function getAccountsStorageKey(): string {
  return `${StorageKeys.AUTH_REMEMBERED_ACCOUNTS}_${window.location.origin}`;
}

function migrateLegacyRememberMe(): void {
  const legacyUsername = localStorage.getItem(StorageKeys.AUTH_REMEMBER_USERNAME);
  const rememberMe = localStorage.getItem(StorageKeys.AUTH_REMEMBER_ME) === 'true';
  if (!rememberMe || !legacyUsername) return;

  const raw = localStorage.getItem(getAccountsStorageKey());
  let accounts: RememberedAccount[] = [];

  if (raw) {
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (Array.isArray(parsed)) {
        accounts = parsed
          .filter((item): item is RememberedAccount => {
            return Boolean(item && typeof item.username === 'string' && item.username.trim());
          })
          .map((item) => ({
            username: item.username.trim(),
            password: typeof item.password === 'string' ? item.password : '',
          }));
      }
    } catch {
      accounts = [];
    }
  }

  const normalizedUsername = legacyUsername.trim();
  if (accounts.some((account) => account.username === normalizedUsername)) return;

  accounts.unshift({ username: normalizedUsername, password: '' });
  localStorage.setItem(
    getAccountsStorageKey(),
    JSON.stringify(accounts.slice(0, MAX_ACCOUNTS)),
  );
}

export function loadRememberedAccounts(): RememberedAccount[] {
  try {
    migrateLegacyRememberMe();
    const raw = localStorage.getItem(getAccountsStorageKey());
    if (!raw) return [];

    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter((item): item is RememberedAccount => {
        return Boolean(item && typeof item.username === 'string' && item.username.trim());
      })
      .map((item) => ({
        username: item.username.trim(),
        password: typeof item.password === 'string' ? item.password : '',
      }));
  } catch {
    return [];
  }
}

export function saveRememberedAccount(username: string, password: string): void {
  const normalizedUsername = username.trim();
  if (!normalizedUsername) return;

  const accounts = loadRememberedAccounts().filter(
    (account) => account.username !== normalizedUsername,
  );
  accounts.unshift({ username: normalizedUsername, password });

  localStorage.setItem(
    getAccountsStorageKey(),
    JSON.stringify(accounts.slice(0, MAX_ACCOUNTS)),
  );
  localStorage.setItem(StorageKeys.AUTH_REMEMBER_ME, 'true');
  localStorage.setItem(StorageKeys.AUTH_REMEMBER_USERNAME, normalizedUsername);
}

export function clearRememberMePreference(): void {
  localStorage.removeItem(StorageKeys.AUTH_REMEMBER_ME);
  localStorage.removeItem(StorageKeys.AUTH_REMEMBER_USERNAME);
}

export function getLastRememberedAccount(): RememberedAccount | null {
  const rememberMe = localStorage.getItem(StorageKeys.AUTH_REMEMBER_ME) === 'true';
  if (!rememberMe) return null;

  const username = localStorage.getItem(StorageKeys.AUTH_REMEMBER_USERNAME)?.trim();
  if (!username) return null;

  const account = loadRememberedAccounts().find((item) => item.username === username);
  return account ?? { username, password: '' };
}

export function findRememberedPassword(username: string): string {
  const normalizedUsername = username.trim();
  if (!normalizedUsername) return '';

  const account = loadRememberedAccounts().find((item) => item.username === normalizedUsername);
  return account?.password ?? '';
}
