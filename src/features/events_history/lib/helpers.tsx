import { Tooltip } from '@mui/material';

import { StyledTable } from '@shared/styled_components/styledTable';
import type { ID, IDeviceAction } from '@shared/types/BaseQueryTypes';
import { Formatters } from '@shared/utils/formatters';

import i18n from '../../../i18n';

export const ItemButton = (event: IDeviceAction, expandRowId: ID) => (
  <Tooltip title={expandRowId === event.id ? i18n.t('nav.collapse') : i18n.t('nav.expand')}>
    <span>
      {expandRowId === event.id ? <StyledTable.CollapseIcon /> : <StyledTable.ExpandIcon />}
    </span>
  </Tooltip>
);

export const date = (event: IDeviceAction) => Formatters.formatISODate(event.timestamp);

export const isTheSameRow = (event: IDeviceAction, expandRowId: ID) => expandRowId === event.id;
