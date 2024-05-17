import type { IAlcolock } from '@shared/types/BaseQueryTypes';
import type { AdapterReturn } from '@shared/ui/search_multiple_select';

export const adapterMapOptions = (alcolock: IAlcolock, vieBranch: boolean): AdapterReturn => {
  const branch = vieBranch ? `(${alcolock?.assignment?.branch?.name})` : '';
  const label = `${alcolock.name} ${alcolock.serialNumber} ${branch}`;
  const id = alcolock.id;
  return [label, id, []];
};
