import type { ID } from '@shared/types/BaseQueryTypes';

export const adapterMapOptions = (driver: {
  driverId: ID;
  fullName: string;
  email?: string;
}): [string, ID] | [] => {
  if (!driver.driverId) return [];

  const displayName = driver.email ? `${driver.fullName} (${driver.email})` : driver.fullName;

  return [displayName, driver.driverId];
};

export const adapterMapOptionsForList = (
  driver: {
    id: ID;
    fullName: string;
    branchName: string;
    email?: string;
  },
  showBranchName: boolean = false,
): [string, ID] | [] => {
  if (!driver.id) return [];

  // Сначала формируем имя с email
  let displayName = driver.email ? `${driver.fullName} (${driver.email})` : driver.fullName;

  // Затем добавляем branchName если нужно
  if (showBranchName) {
    displayName = `${displayName} - ${driver.branchName}`;
  }

  return [displayName, driver.id];
};
