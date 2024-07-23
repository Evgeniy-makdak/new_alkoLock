import { Typography } from '@mui/material';

import { StyledTable } from '@shared/styled_components/styledTable';
import { TouchLoader } from '@shared/ui/touch_loader';

import style from '../ui/EventsHistory.module.scss';

export const Text = (text: string) => (
  <Typography marginTop={1} width={'100%'} textAlign={'center'} fontSize={20} fontWeight={500}>
    {text}
  </Typography>
);

export const getTextList = (isLoading: boolean, length: number) => {
  if (isLoading) {
    return <TouchLoader />;
  } else if (!isLoading && length > 0) {
    return Text('Событий больше нет');
  } else if (!isLoading && length === 0) {
    return Text('Нет событий');
  }
};

export const TableHeader = () => (
  <StyledTable.HeaderRow>
    <StyledTable.HeaderCell className={style.typeOfEvent}>Тип события</StyledTable.HeaderCell>

    <StyledTable.HeaderCell className={`${style.headerCellDate}`}>Дата</StyledTable.HeaderCell>

    <StyledTable.HeaderCell className={style.headerCell} />
  </StyledTable.HeaderRow>
);
