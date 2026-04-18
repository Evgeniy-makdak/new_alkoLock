import { useMemo, useState } from 'react';
import { Virtuoso } from 'react-virtuoso';

import { Dayjs } from 'dayjs';

import { TableContainer } from '@mui/material';

import type { HistoryTypes } from '@entities/events_data';
import type { EventsOptions, IDeviceAction } from '@shared/types/BaseQueryTypes';
import { Values } from '@shared/ui/search_multiple_select';

import { useEventsHistory } from '../hooks/useEventsHistory';
import { TableHeader, getTextList } from '../lib/components';
import style from './EventsHistory.module.scss';

type EventsHistoryProps = {
  type: HistoryTypes;
  handleCloseAside?: () => void;
  customEvents?: IDeviceAction[];
  disableApiRequests?: boolean;
  showDetailsLink?: boolean;
  openDetailsPanel?: (params: { id: string | number; content: React.ReactNode }) => void;
  freezeMarkers?: boolean;
  onToggleFreezeMarkers?: (checked: boolean) => void;
  /** При клике на координаты — переместить карту (для вкладки Карта) */
  onCoordinateClick?: (lat: number, lng: number, vehicle: string) => void;
  // Новые пропсы для сохранения состояния фильтров между вкладками
  savedFilters?: {
    typeEventFilters: Values;
    startDate: Dayjs | null;
    endDate: Dayjs | null;
  };
  onFiltersChange?: (filters: {
    typeEventFilters?: Values;
    startDate?: Dayjs | null;
    endDate?: Dayjs | null;
  }) => void;
  /**
   * Мобильная шапка фильтров для боковой панели (пользователь / ТС / алкозамок):
   * иконка вместо слова «Фильтр», модалка с чекбоксами для типов событий.
   */
  sidePanelMobileFilterUx?: boolean;
} & EventsOptions;

export const EventsHistory = (props: EventsHistoryProps) => {
  const {
    type,
    handleCloseAside,
    customEvents,
    disableApiRequests,
    showDetailsLink,
    openDetailsPanel,
    freezeMarkers,
    onToggleFreezeMarkers,
    onCoordinateClick,
    // Новые пропсы для сохранения состояния фильтров
    savedFilters,
    onFiltersChange,
    sidePanelMobileFilterUx = false,
    ...rest
  } = props;
  const [sortField, setSortField] = useState<'id' | 'timestamp' | null>(null);
  const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC' | null>(null);

  const shouldUseCustomEvents = disableApiRequests && customEvents;

  const {
    rows,
    data,
    handleEnd,
    isLoading,
    setEventTypes,
    setStartDate,
    setEndDate,
    startDate,
    endDate,
  } = useEventsHistory(
    {
      ...rest,
      handleCloseAside,
      sortField,
      sortOrder,
      //@ts-expect-error: Временное решение
      disableApiRequests: shouldUseCustomEvents,
      carId: props.carId,
      registrationNumber: props.registrationNumber,
      showDetailsLink,
      openDetailsPanel,
      freezeMarkers,
      onToggleFreezeMarkers,
      onCoordinateClick,
    },
    type,
    shouldUseCustomEvents ? customEvents : undefined,
  );

  const length = shouldUseCustomEvents ? customEvents.length : data?.length || 0;
  const displayData = shouldUseCustomEvents ? customEvents : data;

  // Создаем ключ для принудительного пересоздания Virtuoso при изменении фильтров
  const virtuosoKey = useMemo(() => {
    return JSON.stringify({
      typeEventFilters: savedFilters?.typeEventFilters || [],
      startDate: savedFilters?.startDate?.toString() || '',
      endDate: savedFilters?.endDate?.toString() || '',
      userId: props.userId,
      carId: props.carId,
      alcolockId: props.alcolockId,
    });
  }, [savedFilters, props.userId, props.carId, props.alcolockId]);

  const handleRequestSort = (property: 'id' | 'timestamp') => {
    if (sortField === property) {
      if (sortOrder === 'DESC') {
        setSortOrder('ASC');
      } else if (sortOrder === 'ASC') {
        setSortField(null);
        setSortOrder(null);
      } else {
        setSortOrder('DESC');
      }
    } else {
      setSortField(property);
      setSortOrder('DESC');
    }
  };

  // Функция для обработки изменения фильтров по типу события
  const handleFilterChange = (values?: Values) => {
    // Сохраняем фильтры в родительском компоненте
    if (onFiltersChange) {
      onFiltersChange({
        typeEventFilters: values || [],
      });
    }

    if (!values) {
      setEventTypes([]);
      return;
    }
    const validValues = values
      .map((v) => ({
        value: typeof v.value === 'string' ? parseInt(v.value, 10) : Number(v.value),
        label: v.label,
      }))
      .filter((v) => !isNaN(v.value));
    setEventTypes(validValues);
  };

  // Функция для обработки изменения начальной даты
  const handleStartDateChange = (date: Dayjs | null) => {
    // Сохраняем дату в родительском компоненте
    if (onFiltersChange) {
      onFiltersChange({
        startDate: date,
      });
    }
    setStartDate(date);
  };

  // Функция для обработки изменения конечной даты
  const handleEndDateChange = (date: Dayjs | null) => {
    // Сохраняем дату в родительском компоненте
    if (onFiltersChange) {
      onFiltersChange({
        endDate: date,
      });
    }
    setEndDate(date);
  };

  return (
    <div className={style.minWidthWrapper}>
      <div className={style.fixedHeader}>
        <TableHeader
          open={true}
          onFilterChange={handleFilterChange}
          setStartDate={handleStartDateChange}
          setEndDate={handleEndDateChange}
          startDate={startDate}
          endDate={endDate}
          sortField={sortField}
          sortOrder={sortOrder}
          onRequestSort={handleRequestSort}
          //@ts-expect-error: Временное решение
          disableFilters={shouldUseCustomEvents}
          // Передаем сохраненные фильтры как начальные значения
          initialTypeEventFilters={savedFilters?.typeEventFilters || []}
          initialStartDate={savedFilters?.startDate || null}
          initialEndDate={savedFilters?.endDate || null}
          sidePanelMobileFilterUx={sidePanelMobileFilterUx}
        />
      </div>

      <TableContainer className={style.scrollableContent}>
        <Virtuoso
          key={virtuosoKey}
          endReached={shouldUseCustomEvents ? undefined : handleEnd}
          totalCount={length}
          className={style.tableVirtuoso}
          data={displayData}
          components={{
            Header: () => null,
            Footer: () => getTextList(isLoading, length),
          }}
          itemContent={(index) => rows(index, openDetailsPanel, freezeMarkers, onCoordinateClick)}
          style={{
            height: '100%',
            width: '100%',
          }}
        />
      </TableContainer>
    </div>
  );
};
