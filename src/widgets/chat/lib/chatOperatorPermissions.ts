import { Permissions } from '@shared/config/permissionsEnums';
import { appStore } from '@shared/model/app_store/AppStore';

export function normalizeUserId(raw: unknown): number | null {
  const normalized = Number(raw);
  return Number.isFinite(normalized) && normalized > 0 ? normalized : null;
}

export function isSameUserId(a: unknown, b: unknown): boolean {
  const left = normalizeUserId(a);
  const right = normalizeUserId(b);
  return left != null && right != null && left === right;
}

export function getCurrentOperatorUserId(): number | null {
  return normalizeUserId(appStore.getState().authId);
}

export function hasChatCreateAndEditPermissions(permissions: string[] | undefined): boolean {
  const list = permissions ?? [];
  return (
    list.includes(Permissions.PERMISSION_OPERATOR_CHATS_CREATE) &&
    list.includes(Permissions.PERMISSION_OPERATOR_CHATS_EDIT)
  );
}

export function isCurrentOperatorUser(userId: unknown): boolean {
  return isSameUserId(userId, getCurrentOperatorUserId());
}

export function filterOutCurrentOperatorUsers<T extends { id?: unknown }>(users: T[]): T[] {
  const currentUserId = getCurrentOperatorUserId();
  if (currentUserId == null) return users;
  return (users || []).filter((user) => !isSameUserId(user.id, currentUserId));
}

export function filterUnreadDialogsForCurrentOperator<
  T extends { owner?: { id?: unknown } | null },
>(dialogs: T[]): T[] {
  const currentUserId = getCurrentOperatorUserId();
  if (currentUserId == null) return dialogs || [];
  return (dialogs || []).filter((dialog) => !isSameUserId(dialog.owner?.id, currentUserId));
}

export function shouldExcludeUserFromChatTransfer(userId: unknown, excludeUserIds: unknown[]): boolean {
  return excludeUserIds.some((excludeId) => isSameUserId(userId, excludeId));
}
