import { useAuthSessionSync } from '@shared/hooks/useAuthSessionSync';

export function AuthSessionSync(): null {
  useAuthSessionSync();
  return null;
}
