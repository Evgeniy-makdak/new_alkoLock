import type { ID } from '@shared/types/BaseQueryTypes';

export const adapterMapOptions = (
  driver: { driverId: ID; fullName: string },
): [string, ID] | [] => {
  if (!driver.driverId) return [];
  return [driver.fullName, driver.driverId];
};

export const adapterMapOptionsForList = (
  driver: { id: ID; fullName: string },
): [string, ID] | [] => {
  if (!driver.id) return [];
  return [driver.fullName, driver.id];
};