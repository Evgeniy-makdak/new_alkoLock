import { useEffect } from 'react';

import { subscribeAuthSessionSync } from '@shared/lib/authSessionSync';

/** Перезагружает вкладку, если в другом окне того же браузера сменили пользователя. */
export function useAuthSessionSync(): void {
  useEffect(() => subscribeAuthSessionSync(), []);
}
