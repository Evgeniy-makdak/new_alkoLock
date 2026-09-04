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

/** Диспетчер видит все диалоги, включая чужие CLOSED — фильтр claimer на него не действует. */
export function hasDispatcherAccountPermission(
  permissions: string[] | undefined = appStore.getState().permissions,
): boolean {
  return (permissions ?? []).includes(Permissions.SYSTEM_DISPATCHER_ACCOUNT);
}

export function filterOutCurrentOperatorUsers<T extends { id?: unknown }>(users: T[]): T[] {
  const currentUserId = getCurrentOperatorUserId();
  if (currentUserId == null) return users;
  return (users || []).filter((user) => !isSameUserId(user.id, currentUserId));
}

/** lastOperator / last_operator с корня или вложенного dialog. */
export function getDialogClaimOperatorId(dialog: {
  lastOperator?: { id?: unknown } | null;
  last_operator?: { id?: unknown } | null;
  dialog?: {
    lastOperator?: { id?: unknown } | null;
    last_operator?: { id?: unknown } | null;
  } | null;
} | null | undefined): number | null {
  if (!dialog) return null;
  const lo =
    dialog.lastOperator ??
    dialog.last_operator ??
    dialog.dialog?.lastOperator ??
    dialog.dialog?.last_operator ??
    null;
  return normalizeUserId(lo?.id);
}

/**
 * CLOSED в превью/REST-счётчике — только если забран текущим оператором.
 * Не-CLOSED (ACTIVE/OPEN и т.п.) — видимы как раньше.
 * CLOSED без lastOperator — скрываем (нельзя подтвердить «забран мной»).
 * Диспетчер (SYSTEM_DISPATCHER_ACCOUNT) — всегда true.
 */
export function isClosedDialogVisibleToCurrentOperator(dialog: {
  status?: unknown;
  lastOperator?: { id?: unknown } | null;
  last_operator?: { id?: unknown } | null;
  dialog?: {
    status?: unknown;
    lastOperator?: { id?: unknown } | null;
    last_operator?: { id?: unknown } | null;
  } | null;
} | null | undefined): boolean {
  if (hasDispatcherAccountPermission()) return true;
  const status = String(dialog?.status ?? dialog?.dialog?.status ?? '').toUpperCase();
  if (status !== 'CLOSED') return true;
  const claimerId = getDialogClaimOperatorId(dialog);
  const currentId = getCurrentOperatorUserId();
  if (claimerId == null || currentId == null) return false;
  return claimerId === currentId;
}

/**
 * Точно известно, что CLOSED забран другим оператором.
 * Если lastOperator нет — false (не режем WS +1 по своим диалогам без claimer в кадре).
 * Диспетчер — всегда false (чужие CLOSED для него не скрываем).
 */
export function isClosedDialogClaimedByOtherOperator(dialog: {
  status?: unknown;
  lastOperator?: { id?: unknown } | null;
  last_operator?: { id?: unknown } | null;
  dialog?: {
    status?: unknown;
    lastOperator?: { id?: unknown } | null;
    last_operator?: { id?: unknown } | null;
  } | null;
} | null | undefined): boolean {
  if (hasDispatcherAccountPermission()) return false;
  const status = String(dialog?.status ?? dialog?.dialog?.status ?? '').toUpperCase();
  if (status !== 'CLOSED') return false;
  const claimerId = getDialogClaimOperatorId(dialog);
  const currentId = getCurrentOperatorUserId();
  if (claimerId == null || currentId == null) return false;
  return claimerId !== currentId;
}

/** Сессия свёрнута в превью: чужой CLOSED не показываем (только при известном чужом lastOperator). */
export function isSessionClosedClaimedByOtherOperator(session: {
  selectedDialog?: {
    status?: unknown;
    lastOperator?: { id?: unknown } | null;
    last_operator?: { id?: unknown } | null;
  } | null;
} | null | undefined): boolean {
  return isClosedDialogClaimedByOtherOperator(session?.selectedDialog);
}

export function filterUnreadDialogsForCurrentOperator<
  T extends {
    owner?: { id?: unknown } | null;
    status?: unknown;
    lastOperator?: { id?: unknown } | null;
    last_operator?: { id?: unknown } | null;
  },
>(dialogs: T[]): T[] {
  const currentUserId = getCurrentOperatorUserId();
  return (dialogs || []).filter((dialog) => {
    if (currentUserId != null && isSameUserId(dialog.owner?.id, currentUserId)) return false;
    if (!isClosedDialogVisibleToCurrentOperator(dialog)) return false;
    return true;
  });
}

export function shouldExcludeUserFromChatTransfer(userId: unknown, excludeUserIds: unknown[]): boolean {
  return excludeUserIds.some((excludeId) => isSameUserId(userId, excludeId));
}
