import type { ICar } from '@shared/types/BaseQueryTypes';
import { Formatters } from '@shared/utils/formatters';

export const adapterMapOptions = (car: ICar, vieBranch = false): [string, number | string] => {
  return [Formatters.carNameFormatter(car, false, true, vieBranch), car.id];
};
