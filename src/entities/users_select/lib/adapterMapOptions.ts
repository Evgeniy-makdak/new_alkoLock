import type { ID, IUser } from '@shared/types/BaseQueryTypes';
import { Formatters } from '@shared/utils/formatters';

// TODO => убрать needDriverId когда уберут ID у поля driver в сущности User => user: {driver: {id: ID}}
export const adapterMapOptions = (
  driver: IUser,
  vieBranch = false,
  needDriverId = false,
): [string, ID] | [] => {
  const branch =
    vieBranch && driver?.assignment?.branch?.name ? `(${driver?.assignment?.branch?.name})` : '';
  const id = needDriverId ? driver?.driver?.id : driver?.id;
  if (!id) return [];
  return [`${Formatters.nameFormatter(driver)} ${driver.email} ${branch}`, id];
};
