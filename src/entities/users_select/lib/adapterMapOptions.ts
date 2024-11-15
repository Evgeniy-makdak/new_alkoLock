import type { ID } from '@shared/types/BaseQueryTypes';

export const adapterMapOptions = (
  driver: { id: ID; fullName: string },
): [string, ID] | [] => {
  if (!driver.id) return [];
  return [driver.fullName, driver.id];
};
