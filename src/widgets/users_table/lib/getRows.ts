import { useMemo } from 'react';

import type { GridRowsProp } from '@mui/x-data-grid';

import { AppConstants } from '@app/index';
import { type IUser } from '@shared/types/BaseQueryTypes';
import { Formatters } from '@shared/utils/formatters';

import { ValuesHeader } from './getColumns';

export const useGetRows = (data: IUser[]): GridRowsProp => {
  const mapData = (data ? data : []).map((user) => {
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

  const returnData = useMemo(() => mapData, [data]);
  return returnData;
};
