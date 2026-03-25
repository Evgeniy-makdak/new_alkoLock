import type { IUser } from '@shared/types/BaseQueryTypes';

/** Служебный пользователь для фильтров (login `anonymous`, id `2`) — не показываем в таблице «Пользователи». */
export function isUsersTableExcludedUser(user: Pick<IUser, 'id' | 'login'>): boolean {
  return Number(user.id) === 2 || user.login === 'anonymous';
}

/**
 * Бэкенд включает anonymous в totalElements при фильтрах «Все» и «Активные»;
 * при «Неактивные» он обычно не попадает в выборку (anonymous активен).
 */
export function anonymousUserIncludedInUsersTableTotal(
  statusFilter: 'Все' | 'Активные' | 'Неактивные',
): boolean {
  return statusFilter === 'Все' || statusFilter === 'Активные';
}

export function getUsersTableDisplayTotal(
  totalElements: number | undefined | null,
  statusFilter: 'Все' | 'Активные' | 'Неактивные',
): number | undefined | null {
  if (totalElements === undefined || totalElements === null) return totalElements;
  const subtract = anonymousUserIncludedInUsersTableTotal(statusFilter) ? 1 : 0;
  return Math.max(0, totalElements - subtract);
}
