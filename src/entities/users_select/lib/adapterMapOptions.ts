import type { ID } from '@shared/types/BaseQueryTypes';

export const adapterMapOptions = (driver: {
  driverId: ID;
  fullName: string;
}): [string, ID] | [] => {
  if (!driver.driverId) return [];

  return [driver.fullName, driver.driverId];
};

export const adapterMapOptionsForList = (
  driver: { id: ID; fullName: string; branchName: string },
  showBranchName: boolean = false,
): [string, ID] | [] => {
  if (!driver.id) return [];

  const displayName = showBranchName
    ? `${driver.fullName} (${driver.branchName})`
    : driver.fullName;

  return [displayName, driver.id];
};
