import React, { useEffect, useState } from 'react';

import { Dayjs } from 'dayjs';

import { Chip } from '@mui/material';
import { useTheme } from '@mui/material/styles';

import { EventData, type HistoryTypes } from '@entities/events_data';
import { EventsApi } from '@shared/api/baseQuerys';
import { testids } from '@shared/const/testid';
import { StyledTable } from '@shared/styled_components/styledTable';
import type { EventsOptions, ID, IDeviceAction } from '@shared/types/BaseQueryTypes';
import { Values } from '@shared/ui/search_multiple_select';

import { fetchNewList } from '../api/useEventsHistoryApi';
import { ItemButton, date, isTheSameRow } from '../lib/helpers';
import style from '../ui/EventsHistory.module.scss';

export const useEventsHistory = (
  options: EventsOptions & {
    handleCloseAside?: () => void;
    serviceRequestId?: ID;
    sortField?: 'id' | 'timestamp' | null;
    sortOrder?: 'ASC' | 'DESC' | null;
    disableApiRequests?: boolean;
    openDetailsPanel?: (params: { id: string | number; content: React.ReactNode }) => void;
    freezeMarkers?: boolean;
    onToggleFreezeMarkers?: (checked: boolean) => void;
    onCoordinateClick?: (lat: number, lng: number, vehicle: string) => void;
    initialExpandedRowId?: ID | null;
  },
  type: HistoryTypes,
  customEvents?: IDeviceAction[],
) => {
  const theme = useTheme();
  const [expandRowId, setExpandRowId] = useState<ID | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [eventsAcc, setEventsAcc] = useState<IDeviceAction[]>([]);
  const [page, setPage] = useState(0);
  const [eventTypes, setEventTypes] = useState<number[]>([]);
  const [startDate, setStartDate] = useState<Dayjs | null>(null);
  const [endDate, setEndDate] = useState<Dayjs | null>(null);

  const isFirstRender = React.useRef(true);

  const fetchList = (pageNum: number) => {
    if (options.disableApiRequests) return Promise.resolve();

    return fetchNewList(
      setEventsAcc,
      setIsLoading,
      {
        ...options,
        eventTypes,
        startDate,
        endDate,
        sortField: options.sortField,
        sortOrder: options.sortOrder,
        carId: options.carId,
        registrationNumber: options.registrationNumber,
      },
      pageNum,
    )();
  };

  useEffect(() => {
    if (options.disableApiRequests && customEvents) {
      setEventsAcc(customEvents);
      return;
    }

    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    setPage(0);
    setEventsAcc([]);
    fetchList(0);
  }, [
    options.userId,
    options.carId,
    options.registrationNumber,
    options.alcolockId,
    eventTypes,
    startDate,
    endDate,
    options.sortField,
    options.sortOrder,
    options.disableApiRequests,
    customEvents,
  ]);

  useEffect(() => {
    if (options.disableApiRequests && customEvents) {
      setEventsAcc(customEvents);
      return;
    }

    if (isFirstRender.current) {
      setPage(0);
      setEventsAcc([]);
      fetchList(0);
      isFirstRender.current = false;
    }
  }, []);

  useEffect(() => {
    if (!options.handleCloseAside || !options.serviceRequestId) return;

    const checkServiceModeExpiration = async () => {
      try {
        const response = await EventsApi.getEventItemForAutoServise(options.serviceRequestId);
        const finishedAt = response?.data?.finishedAt;

        if (finishedAt) {
          const expirationTime = new Date(finishedAt);
          const now = new Date();
          if (expirationTime <= now) {
            options.handleCloseAside();
          }
        }
      } catch (error) {
        console.error('Error checking service mode expiration:', error);
      }
    };

    checkServiceModeExpiration();
    const interval = setInterval(checkServiceModeExpiration, 10000);
    return () => clearInterval(interval);
  }, [options.handleCloseAside, options.serviceRequestId]);

  const handleEnd = async () => {
    if (options.disableApiRequests) return;

    const nextPage = page + 1;
    setPage(nextPage);
    await fetchList(nextPage);
  };

  const onClickExpand = (id: ID) => {
    setExpandRowId(expandRowId === id ? null : id);
  };
  useEffect(() => {
    if (!options.initialExpandedRowId) return;
    const exists = eventsAcc.some(
      (event) =>
        String(event?.id) === String(options.initialExpandedRowId) ||
        String((event as any)?.actionId) === String(options.initialExpandedRowId),
    );
    if (exists) {
      const matched = eventsAcc.find(
        (event) =>
          String(event?.id) === String(options.initialExpandedRowId) ||
          String((event as any)?.actionId) === String(options.initialExpandedRowId),
      );
      setExpandRowId((matched?.id as ID) ?? options.initialExpandedRowId);
    }
  }, [eventsAcc, options.initialExpandedRowId]);

  const getEventTypeChip = (eventType: string | { label: string }) => {
    const label = typeof eventType === 'string' ? eventType : (eventType?.label ?? 'Неизвестно');
    const mobileEventFontSize =
      label.length > 42
        ? '0.74rem'
        : label.length > 30
          ? '0.8rem'
          : label.length > 20
            ? '0.86rem'
            : '0.92rem';
    let color: 'success' | 'error' | 'warning' | undefined;

    if (label === 'Тестирование пройдено') color = 'success';
    else if (label === 'Тестирование не пройдено') color = 'error';
    else if (label === 'Тестирование прервано') color = 'warning';

    const isMobile = window.innerWidth <= 768;

    if (isMobile) {
      let textStyle: React.CSSProperties = {};
      if (theme.palette.mode === 'dark') {
        if (color === 'success')
          textStyle = { color: theme.palette.success.light, fontWeight: 500 };
        else if (color === 'error')
          textStyle = { color: theme.palette.error.light, fontWeight: 500 };
        else if (color === 'warning')
          textStyle = { color: theme.palette.warning.light, fontWeight: 500 };
      } else {
        if (color === 'success') textStyle = { color: '#2e7d32', fontWeight: 500 };
        else if (color === 'error') textStyle = { color: '#d32f2f', fontWeight: 500 };
        else if (color === 'warning') textStyle = { color: '#ed6c02', fontWeight: 500 };
      }

      return (
        <span
          style={{
            ...textStyle,
            display: 'block',
            whiteSpace: 'normal',
            wordBreak: 'normal',
            overflowWrap: 'break-word',
            lineHeight: 1.2,
            fontSize: mobileEventFontSize,
          }}>
          {label}
        </span>
      );
    }

    return color ? (
      <Chip label={label} color={color} size="small" sx={{ color: 'white', fontWeight: 500 }} />
    ) : (
      <span style={{ color: theme.palette.text.primary }}>{label}</span>
    );
  };

  const rows = (
    index: number,
    openDetailsPanel?: (params: { id: string | number; content: React.ReactNode }) => void,
    freezeMarkers?: boolean,
    onCoordinateClick?: (lat: number, lng: number, vehicle: string) => void,
  ) => {
    const event = eventsAcc[index];
    return (
      <React.Fragment key={event.id}>
        <StyledTable.BodyRowDiv
          role="row"
          className={style.tr}
          key={event.id}
          data-testid={testids.EVENT_HISTORY_TABLE_ITEM}>
          <StyledTable.BodyCellDiv role="cell" className={style.td}>
            {getEventTypeChip(event.eventsForFront?.label || event.eventType)}
          </StyledTable.BodyCellDiv>
          <StyledTable.BodyCellDiv role="cell" className={style.bodyCellCreatedAt}>
            {date(event)}
          </StyledTable.BodyCellDiv>
          <StyledTable.BodyCellDiv role="cell" className={style.bodyCellButtonWrapper}>
            <div className={style.buttonWrapper}>
              <StyledTable.TableButton onClick={() => onClickExpand(event.id)}>
                {ItemButton(event, expandRowId)}
              </StyledTable.TableButton>
            </div>
          </StyledTable.BodyCellDiv>
        </StyledTable.BodyRowDiv>

        {isTheSameRow(event, expandRowId) && (
          <StyledTable.BodyRowDiv role="row" className={style.tr} key={`${event.id}-info`}>
            <StyledTable.DataCellDiv role="cell" className={style.tr}>
              <EventData
                testid={testids.EVENT_HISTORY_TABLE_MAP_LINK}
                type={type}
                event={event}
                sourceSelectedId={
                  type === 'byCar'
                    ? (options.carId ?? null)
                    : type === 'byAlcolock'
                      ? (options.alcolockId ?? null)
                      : type === 'byUser'
                        ? (options.userId ?? null)
                        : null
                }
                showDetailsLink={options.showDetailsLink}
                openDetailsPanel={openDetailsPanel}
                freezeMarkers={freezeMarkers}
                onToggleFreezeMarkers={options.onToggleFreezeMarkers}
                onCoordinateClick={onCoordinateClick}
              />
            </StyledTable.DataCellDiv>
          </StyledTable.BodyRowDiv>
        )}
      </React.Fragment>
    );
  };

  return {
    data: eventsAcc,
    expandRowId,
    rows,
    handleEnd,
    isLoading,
    setEventTypes: (values: Values) => {
      const types =
        values
          ?.map((v) => ({
            value: Number(v.value),
            label: v.label,
          }))
          .filter((v) => !isNaN(v.value)) ?? [];
      setEventTypes(types.map((v) => v.value));
    },
    setStartDate,
    setEndDate,
    startDate,
    endDate,
  };
};
