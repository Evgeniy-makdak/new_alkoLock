import type { AppAxiosResponse } from '@shared/api/baseQueryTypes';
import type { IRole } from '@shared/types/BaseQueryTypes';

let rolesCache: AppAxiosResponse<{ content: IRole[]; totalElements: number }> | null = null;
let lastBranchId: string | null = null;

export const getRolesCache = (): AppAxiosResponse<{
  content: IRole[];
  totalElements: number;
}> | null => rolesCache;

export const setRolesCache = (
  data: AppAxiosResponse<{ content: IRole[]; totalElements: number }>,
  branchId: string,
): void => {
  rolesCache = data;
  lastBranchId = branchId;
};

export const shouldFetchRoles = (branchId: string | undefined | null): boolean => {
  return !rolesCache || (branchId !== null && branchId !== undefined && lastBranchId !== branchId);
};
