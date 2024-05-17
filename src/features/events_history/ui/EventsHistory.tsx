import { Virtuoso } from 'react-virtuoso';

import { TableContainer } from '@mui/material';

import type { HistoryTypes } from '@entities/events_data';
import type { EventsOptions } from '@shared/types/BaseQueryTypes';

import { useEventsHistory } from '../hooks/useEventsHistory';
import { TableHeader, getTextList } from '../lib/components';
import style from './EventsHistory.module.scss';

type EventsHistoryProps = {
  type: HistoryTypes;
} & EventsOptions;

export const EventsHistory = (props: EventsHistoryProps) => {
  const type = props.type;
  const { rows, data, handleEnd, isLoading } = useEventsHistory(props, type);

  const length = data?.length || 0;
  return (
    <div className={style.minWidthWrapper}>
      <TableContainer className={style.hiddenWrapper}>
        <Virtuoso
          endReached={handleEnd}
          totalCount={length}
          className={style.tableVirtuoso}
          data={data}
          components={{
            Header: TableHeader,
            Footer: () => getTextList(isLoading, length),
          }}
          itemContent={rows}
        />
      </TableContainer>
    </div>
  );
};
