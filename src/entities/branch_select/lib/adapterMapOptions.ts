import type { IBranch, ID } from '@shared/types/BaseQueryTypes';

export const adapterMapOptions = (branch: IBranch): [string, ID] => {
  return [branch?.name, branch?.id];
};
