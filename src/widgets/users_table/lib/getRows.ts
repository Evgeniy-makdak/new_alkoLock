import { useMemo } from 'react';

import type { GridRowsProp } from '@mui/x-data-grid';

import { AppConstants } from '@app/index';
import { type IUser } from '@shared/types/BaseQueryTypes';
import { Formatters } from '@shared/utils/formatters';

import { ValuesHeader } from './getColumns';

interface UseGetRowsProps {
  data: IUser[];
  excludeUserIds?: number[]; // Новый параметр для исключения пользователей
}

export const useGetRows = ({ data, excludeUserIds = [] }: UseGetRowsProps): GridRowsProp => {
  const mapData = (data ? data : [])
    .filter((user) => !excludeUserIds.includes(+user.id)) // Исключаем пользователей по ID
    .map((user) => {
      const roles = user?.groupMembership?.map((group) => group?.group?.name);
      const access =
        AppConstants.accessList.find((access) => access.value === user.disabled)?.label ?? '-';
      return {
        id: user.id,
        [ValuesHeader.USER]: Formatters.nameFormatter(user),
        [ValuesHeader.EMAIL]: user.email ?? '-',
        [ValuesHeader.ROLE]: roles,
        [ValuesHeader.ACCESS]: access,
        [ValuesHeader.CREATED_AT]: Formatters.formatISODate(user.createdAt),
      };
    });

  const returnData = useMemo(() => mapData, [data, excludeUserIds]);
  return returnData;
};
