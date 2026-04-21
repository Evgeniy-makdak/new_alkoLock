/* eslint-disable react-hooks/exhaustive-deps */
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { Chip } from '@mui/material';
import { GridColDef, type GridColumnHeaderParams } from '@mui/x-data-grid';

import { TableHeaderActions } from '@entities/table_header_actions';
import { TimeCell } from '@entities/time_cell';
import { setTestIdsToHeaderColumns } from '@shared/components/Table/Table';
import { SortTypes } from '@shared/config/queryParamsEnums';
import { testids } from '@shared/const/testid';
import type { IAttachmentItems } from '@shared/types/BaseQueryTypes';
import type { RefetchType } from '@shared/types/QueryTypes';

import style from '../ui/AvtoServiceTable.module.scss';
import { type ServiceModeStatusKey, chipColor } from './getRows';

export enum ValuesHeader {
  DATE = SortTypes.DATE_CREATE,
  SERIAL_NUMBER = SortTypes.SERIAL_NUMBER,
  TC = SortTypes.TC,
  INITIATOR = SortTypes.CREATED_BY,
  STATE = SortTypes.STATE,
  PROCESS = SortTypes.PROCESS,
  EXPIRES = SortTypes.EXPIRES,
  TYPE_OF_EVENT = 'TYPE_OF_EVENT',
}

const setTestIdsToHeaderColumnsAdapter = (
  row: GridColumnHeaderParams<unknown, unknown, unknown>,
) => {
  return setTestIdsToHeaderColumns(
    row,
    testids.page_avto_service.avto_service_widget_table.AVTO_SERVICE_WIDGET_TABLE_HEADER_ITEM,
  );
};

export const useGetColumns = (
  refetch: RefetchType<IAttachmentItems[]>,
  newRefetch: () => Promise<void>,
  serviceModeTimeoutMinutes?: number,
): GridColDef[] => {
  const { t } = useTranslation();
  const safeTimeoutMinutes = Number.isFinite(Number(serviceModeTimeoutMinutes))
    ? Number(serviceModeTimeoutMinutes)
    : null;
  return useMemo(
    () => [
      {
        renderHeader: setTestIdsToHeaderColumnsAdapter,
        headerName: t('tables.date'),
        field: ValuesHeader.DATE,
      },
      {
        renderHeader: setTestIdsToHeaderColumnsAdapter,
        headerName: t('tables.serialNumber'),
        width: 200,
        field: ValuesHeader.SERIAL_NUMBER,
      },
      {
        renderHeader: setTestIdsToHeaderColumnsAdapter,
        headerName: t('tables.installedOnVehicle'),
        field: ValuesHeader.TC,
      },
      {
        renderHeader: setTestIdsToHeaderColumnsAdapter,
        headerName: t('tables.initiator'),
        field: ValuesHeader.INITIATOR,
      },
      {
        renderHeader: setTestIdsToHeaderColumnsAdapter,
        headerName: t('tables.state'),
        field: ValuesHeader.STATE,
        minWidth: 220,
        renderCell: (params) => {
          const state = params?.formattedValue || '';
          const stateKey = params?.row?.stateKey as ServiceModeStatusKey | undefined;
          return <Chip className={style.chipFont} color={chipColor[stateKey]} label={state} />;
        },
        sortable: false,
      },
      {
        renderHeader: setTestIdsToHeaderColumnsAdapter,
        headerName: t('tables.process'),
        field: ValuesHeader.PROCESS,
        sortable: false,
      },
      {
        renderHeader: setTestIdsToHeaderColumnsAdapter,
        headerName: t('tables.expires'),
        field: ValuesHeader.EXPIRES,
        sortable: false,
        renderCell: (params) => {
          const lastEventType = params?.row?.lastEvent?.eventType;

          if (lastEventType === 'Заявка на сервисный режим отклонена') {
            return null;
          }

          if (
            lastEventType === 'Выход из сервисного режима' ||
            lastEventType === 'Переход в сервисный режим'
          ) {
            return null;
          }
          const createdAtRaw = params?.row?.createdAtRaw;
          const finishedAtRaw = params?.row?.finishedAtRaw;
          let createdDate: Date | null = null;
          let finishedDate: Date | null = null;
          let date: Date | null = null;
          if (createdAtRaw) {
            const parsed = new Date(createdAtRaw);
            if (!isNaN(parsed.getTime())) {
              createdDate = parsed;
              date = parsed;
            }
          }
          if (finishedAtRaw) {
            const parsed = new Date(finishedAtRaw);
            if (!isNaN(parsed.getTime())) {
              finishedDate = parsed;
            }
          }

          if (!date) {
            const dateString = params?.row?.DATE_CREATE;
            if (typeof dateString === 'string' && dateString.includes(' ')) {
              const [datePart, timePart] = dateString.split(' ');
              const [day, month, year] = (datePart || '').split('.');
              const [hour, minute, second] = (timePart || '').split(':');
              const parsed = new Date(
                Number(year),
                Number(month) - 1,
                Number(day),
                Number(hour),
                Number(minute),
                Number(second),
              );
              if (!isNaN(parsed.getTime())) {
                date = parsed;
                createdDate = parsed;
              }
            }
          }

          if (finishedDate && (!createdDate || finishedDate.getTime() >= createdDate.getTime())) {
            date = finishedDate;
          } else if (date && safeTimeoutMinutes != null) {
            date.setMinutes(date.getMinutes() + safeTimeoutMinutes);
          } else {
            return '-';
          }
          return (
            <TimeCell
              refetch={refetch}
              key={params.id}
              time={
                params?.row?.lastEvent?.eventType !== 'Заявка на сервисный режим отклонена'
                  ? date
                  : null
              }
              id={params.id}
            />
          );
        },
      },
      {
        field: 'actions',
        type: 'actions',
        sortable: false,
        disableClickEventBubbling: true,
        filterable: false,
        getActions: () => [],
        renderHeader: () => {
          return <TableHeaderActions refetch={refetch} newRefetch={newRefetch} />;
        },
        width: 120,
        hideable: false,
        align: 'center',
      },
    ],
    [newRefetch, refetch, safeTimeoutMinutes, t],
  );
};
