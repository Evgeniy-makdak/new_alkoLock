/* eslint-disable react-hooks/exhaustive-deps */
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import type { GridRowsProp } from '@mui/x-data-grid';

import { useProcessingStore } from '@shared/model/processing_store/processingStore';
import { type IUser } from '@shared/types/BaseQueryTypes';
import { Formatters } from '@shared/utils/formatters';
import { getLicenseExpirationStatus } from '@shared/utils/getLicenseExpirationStatus';

import { ValuesHeader } from './getColumns';
import { isUsersTableExcludedUser } from './usersTableSystemUsers';

interface UseGetRowsProps {
  data: IUser[];
  excludeUserIds?: number[]; // Новый параметр для исключения пользователей
}

export const useGetRows = ({ data, excludeUserIds = [] }: UseGetRowsProps): GridRowsProp => {
  const { t } = useTranslation();
  const processingIds = useProcessingStore((state) => state.processingIds.users);

  return useMemo(
    () =>
      (data ? data : [])
        .filter((user) => !excludeUserIds.includes(+user.id) && !isUsersTableExcludedUser(user))
        .map((user) => {
          const roles = user?.groupMembership?.map((group) => group?.group?.name).sort();
          const isProcessing =
            user?.inProcessing || (user?.id != null && processingIds.has(user.id)) || false;

          const access = user.disabled ? t('access.forbidden') : t('access.allowed');
          return {
            id: user.id,
            isProcessing,
            [ValuesHeader.USER]: Formatters.nameFormatter(user),
            [ValuesHeader.EMAIL]: user.email ?? '-',
            [ValuesHeader.ROLE]: roles,
            [ValuesHeader.ACCESS]: access,
            [ValuesHeader.CREATED_AT]: Formatters.formatISODate(user.createdAt),
            isActive: user.isActive,
            licenseExpirationStatus: getLicenseExpirationStatus(
              user.driver?.licenseExpirationDate,
            ),
          };
        }),
    [data, excludeUserIds, processingIds, t],
  );
};
