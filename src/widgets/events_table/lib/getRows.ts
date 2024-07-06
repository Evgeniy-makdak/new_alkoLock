import { useMemo } from 'react';

import { useStore } from 'zustand';

import type { GridRowsProp } from '@mui/x-data-grid';

import { eventsFilterPanelStore } from '@features/events_filter_panel/model/eventsFilterPanelStore';
import { type IDeviceAction } from '@shared/types/BaseQueryTypes';
import { Formatters } from '@shared/utils/formatters';

import { ValuesHeader } from './getColumns';

export const useGetRows = (data: IDeviceAction[]): GridRowsProp => {
  // Получение selectedLabel из Zustand Store
  const selectedLabel = useStore(eventsFilterPanelStore, (state) => state.selectedLabel);

  const mapData = useMemo(() => {
    return (Array.isArray(data) ? data : []).map((item) => {
      // Проверяем, что occurredAt - строка
      const occurredAt = typeof item.occurredAt === 'string' ? item.occurredAt : undefined;

      return {
        id: item.id,
        [ValuesHeader.DATE_OCCURRENT]: occurredAt
          ? Formatters.formatISODate(occurredAt) ?? '-'
          : '-',
        [ValuesHeader.INTITIATOR]: Formatters.nameFormatter(item.userActionId) ?? '-',
        [ValuesHeader.TC]: item.vehicleRecord
          ? Formatters.carNameFormatter(item.vehicleRecord, true)
          : '-',
        [ValuesHeader.GOS_NUMBER]: item.vehicleRecord?.registrationNumber ?? '-',
        [ValuesHeader.TYPE_OF_EVENT]: selectedLabel ?? item.events[0].eventType, // Использование selectedLabel
      };
    });
  }, [data, selectedLabel]);

  return mapData;
};
