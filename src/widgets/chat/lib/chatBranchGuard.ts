import { UsersApi } from '@shared/api/baseQuerys';
import { appStore } from '@shared/model/app_store/AppStore';

export function getCurrentOperatorBranchId(): string | null {
  const id = appStore.getState().selectedBranchState?.id;
  if (id == null || String(id).trim() === '') return null;
  return String(id);
}

function firstBranchId(candidates: unknown[]): string | null {
  for (const raw of candidates) {
    if (raw != null && String(raw).trim() !== '') return String(raw);
  }
  return null;
}

export function extractChatPayloadBranchId(payload: unknown): string | null {
  if (!payload || typeof payload !== 'object') return null;
  const p = payload as Record<string, any>;
  const dialog = p.dialog;
  const owner = dialog?.owner ?? p.owner;
  const createdBy = p.createdBy;
  const sender = p.senderInfo;
  const client = p.clientInfo ?? p.user;
  return firstBranchId([
    dialog?.branch?.id,
    dialog?.branchId,
    p.branch?.id,
    p.branchId,
    owner?.assignment?.branch?.id,
    owner?.branchOffice?.id,
    owner?.branchId,
    createdBy?.assignment?.branch?.id,
    createdBy?.branchOffice?.id,
    createdBy?.branchId,
    sender?.assignment?.branch?.id,
    sender?.branchOffice?.id,
    sender?.branchId,
    client?.assignment?.branch?.id,
    client?.branchOffice?.id,
    client?.branchId,
  ]);
}

export function extractUserAssignmentBranchId(user: unknown): string | null {
  if (!user || typeof user !== 'object') return null;
  const u = user as Record<string, any>;
  return firstBranchId([
    u.assignment?.branch?.id,
    u.branchOffice?.id,
    u.branchId,
    u.office?.id,
  ]);
}

export function userBelongsToCurrentOperatorBranch(user: unknown): boolean {
  const current = getCurrentOperatorBranchId();
  if (!current || !user) return false;
  const userBranch = extractUserAssignmentBranchId(user);
  if (userBranch == null) return false;
  return userBranch === current;
}

export async function loadUserIfInCurrentOperatorBranch(userId: number): Promise<any | null> {
  if (!userId || Number.isNaN(userId)) return null;
  const current = getCurrentOperatorBranchId();
  if (!current) return null;

  let fetched: any = null;
  try {
    const response = await UsersApi.getUser(userId);
    fetched = response?.data;
    if (userBelongsToCurrentOperatorBranch(fetched)) return fetched;
    const knownBranch = extractUserAssignmentBranchId(fetched);
    if (knownBranch != null) return null;
  } catch {
    fetched = null;
  }

  // Нет assignment в карточке — тот же список, что UsersSelect текущего филиала.
  try {
    const response = await UsersApi.getListToChat(
      {
        searchQuery: fetched?.fullName || String(userId),
        limit: 50,
        filterOptions: { branchId: current },
      },
      false,
    );
    const payload = response?.data as { content?: any[] } | any[] | null | undefined;
    const rawList = Array.isArray(payload)
      ? payload
      : payload && typeof payload === 'object' && Array.isArray(payload.content)
        ? payload.content
        : [];
    return rawList.find((u: any) => Number(u.id) === Number(userId)) ?? null;
  } catch {
    return null;
  }
}

/**
 * REST непрочитанных: dialog.branch часто = выбранный филиал оператора,
 * хотя owner назначен в другой. Превью и бейдж — только по assignment владельца.
 */
export async function filterDialogsByOwnerInCurrentOperatorBranch<
  T extends { owner?: { id?: number } },
>(dialogs: T[]): Promise<T[]> {
  const current = getCurrentOperatorBranchId();
  if (!current) return [];
  const list = dialogs || [];
  if (list.length === 0) return [];

  const ownerIds = [
    ...new Set(
      list
        .map((d) => d?.owner?.id)
        .filter((id): id is number => id != null && !Number.isNaN(Number(id))),
    ),
  ];
  const allowed = new Map<number, boolean>();
  await Promise.all(
    ownerIds.map(async (id) => {
      const user = await loadUserIfInCurrentOperatorBranch(Number(id));
      allowed.set(Number(id), user != null);
    }),
  );

  return list.filter((dialog) => {
    const payloadBranch = extractChatPayloadBranchId(dialog);
    if (payloadBranch != null && payloadBranch !== current) return false;
    const ownerId = dialog?.owner?.id;
    if (ownerId == null) return false;
    return allowed.get(Number(ownerId)) === true;
  });
}

export function sessionBelongsToCurrentOperatorBranch(session: any): boolean {
  if (!session) return false;
  const current = getCurrentOperatorBranchId();
  if (!current) return false;

  const dialogBranch = extractChatPayloadBranchId(session.selectedDialog);
  if (dialogBranch) return dialogBranch === current;

  const cache: Map<unknown, unknown> | undefined = session.usersCache;
  const userId = session.selectedUsers?.[0];
  let cachedUser: unknown = null;
  if (cache && typeof cache.get === 'function' && userId != null) {
    cachedUser = cache.get(userId) ?? cache.get(Number(userId));
  }
  if (!cachedUser && cache && typeof cache.values === 'function') {
    cachedUser = Array.from(cache.values())[0] ?? null;
  }
  if (cachedUser) return userBelongsToCurrentOperatorBranch(cachedUser);

  const firstMsg = Array.isArray(session.messages) ? session.messages[0] : null;
  const msgBranch = extractChatPayloadBranchId(firstMsg);
  if (msgBranch) return msgBranch === current;

  return true;
}

/**
 * Сообщение/диалог принадлежит текущему филиалу оператора.
 * mismatch → false. Нет branch в payload → unknown (true), дальше проверка по пользователю.
 */
export function isPayloadForCurrentOperatorBranch(payload: unknown): boolean {
  const current = getCurrentOperatorBranchId();
  if (!current) return false;
  const payloadBranch = extractChatPayloadBranchId(payload);
  if (payloadBranch == null) return true;
  return payloadBranch === current;
}

export function filterDialogsByCurrentOperatorBranch<T>(dialogs: T[]): T[] {
  const current = getCurrentOperatorBranchId();
  if (!current) return [];
  return (dialogs || []).filter((dialog) => {
    const branchId = extractChatPayloadBranchId(dialog);
    if (branchId == null) return true;
    return branchId === current;
  });
}
