class CookieManager {
  set(name: string | number, value: string | number, days?: number | null) {
    const pathPart = 'path=/';
    if (days == null) {
      document.cookie = `${name}=${value};${pathPart}`;
      return;
    }
    const date = new Date();
    date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000);
    const expires = `expires=${date.toUTCString()}`;
    document.cookie = `${name}=${value};${expires};${pathPart}`;
  }

  get(name: string | number) {
    const nameEQ = `${name}=`;
    const ca = document.cookie.split(';');
    for (let i = 0; i < ca.length; i++) {
      let c = ca[i];
      while (c.charAt(0) === ' ') c = c.substring(1, c.length);
      if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
    }
    return null;
  }

  update(name: string | number, value: string | number, days?: number | null) {
    this.set(name, value, days);
  }

  remove(name: string | number) {
    document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
  }

  removeAll() {
    const cookies = document.cookie.split(';');
    for (let i = 0; i < cookies.length; i++) {
      let cookie = cookies[i];
      while (cookie.charAt(0) === ' ') cookie = cookie.substring(1);
      const eqPos = cookie.indexOf('=');
      const name = eqPos > -1 ? cookie.substring(0, eqPos) : cookie;
      if (!name) continue;
      document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
    }
  }
}

export function isValidJwtFormat(token: string | null | undefined): token is string {
  if (typeof token !== 'string' || !token.trim()) return false;
  const parts = token.split('.');
  return parts.length === 3 && parts.every((part) => part.length > 0);
}

export function getBearerToken(): string | null {
  const token = cookieManager.get('bearer');
  return isValidJwtFormat(token) ? token : null;
}

export const cookieManager = new CookieManager();
