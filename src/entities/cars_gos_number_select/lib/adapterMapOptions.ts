import type { ICar } from '@shared/types/BaseQueryTypes';

export const adapterMapOptions = (car: ICar): [string, number | string] => {
  return [`${car?.registrationNumber}`, car?.registrationNumber];
};
