import React, { useEffect, useState } from 'react';

import { EventData, type HistoryTypes } from '@entities/events_data';
import { getLastEvent } from '@entities/type_event_select';
import { testids } from '@shared/const/testid';
import { StyledTable } from '@shared/styled_components/styledTable';
import type { EventsOptions, ID, IDeviceAction } from '@shared/types/BaseQueryTypes';

import { fetchNewList } from '../api/useEventsHistoryApi';
import { ItemButton, date, isTheSameRow } from '../lib/helpers';
import style from '../ui/EventsHistory.module.scss';

export const useEventsHistory = (options: EventsOptions, type: HistoryTypes) => {
  const [expandRowId, setExpandRowId] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [eventsAcc, setEventsAcc] = useState<IDeviceAction[]>([]);
  const [page, setPage] = useState(0);

  const fetchList = fetchNewList(setEventsAcc, setIsLoading, options);

  useEffect(() => {
    if (page !== 0) return;
    fetchList(0);
  }, []);

  const handleEnd = async () => {
    setPage((prev) => prev + 1);
    await fetchList(page + 1);
  };

  const onClickExpand = (id: ID) => {
    if (expandRowId === id) {
      setExpandRowId(null);
    } else {
      setExpandRowId(id);
    }
  };

  const rows = (_index: number, event: IDeviceAction) => (
    <React.Fragment key={event?.id}>
      <StyledTable.BodyRow
        className={style.tr}
        key={event.id}
        data-testid={testids.EVENT_HISTORY_TABLE_ITEM}>
        <StyledTable.BodyCell className={style.td}>{getLastEvent(event)}</StyledTable.BodyCell>

        <StyledTable.BodyCell className={style.bodyCellCreatedAt}>
          {date(event)}
        </StyledTable.BodyCell>

        <StyledTable.BodyCell className={style.bodyCellButtonWrapper}>
          <div className={style.buttonWrapper}>
            <StyledTable.TableButton onClick={() => onClickExpand(event.id)}>
              {ItemButton(event, expandRowId)}
            </StyledTable.TableButton>
          </div>
        </StyledTable.BodyCell>
      </StyledTable.BodyRow>

      {isTheSameRow(event, expandRowId) && (
        <StyledTable.BodyRow className={style.tr} key={`${event.id}-info`}>
          <StyledTable.DataCell className={style.tr} colSpan={3}>
            <EventData testid={testids.EVENT_HISTORY_TABLE_MAP_LINK} type={type} event={event} />
          </StyledTable.DataCell>
        </StyledTable.BodyRow>
      )}
    </React.Fragment>
  );

  return { data: eventsAcc, expandRowId, rows, handleEnd, isLoading };
};
