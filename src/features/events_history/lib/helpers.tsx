import { Tooltip } from '@mui/material';

import { StyledTable } from '@shared/styled_components/styledTable';
import type { ID, IDeviceAction } from '@shared/types/BaseQueryTypes';
import { Formatters } from '@shared/utils/formatters';

export const ItemButton = (event: IDeviceAction, expandRowId: ID) => (
  <Tooltip title={expandRowId === event.id ? 'Свернуть' : 'Раскрыть'}>
    <span>
      {expandRowId === event.id ? <StyledTable.CollapseIcon /> : <StyledTable.ExpandIcon />}
    </span>
  </Tooltip>
);

export const date = (event: IDeviceAction) => Formatters.formatISODate(event.timestamp);

export const isTheSameRow = (event: IDeviceAction, expandRowId: ID) => expandRowId === event.id;
