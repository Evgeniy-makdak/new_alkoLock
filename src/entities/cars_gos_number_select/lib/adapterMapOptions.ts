import type { ICar } from '@shared/types/BaseQueryTypes';

export const adapterMapOptions = (car: ICar): [string, number | string] => {
  
  return [`${car?.manufacturer}  ${car?.model}  (${car?.registrationNumber})`, car?.registrationNumber];
};
