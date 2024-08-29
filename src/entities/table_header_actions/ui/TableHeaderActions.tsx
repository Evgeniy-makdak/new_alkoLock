import type { FC } from 'react';

import AddIcon from '@mui/icons-material/Add';
import { GridActionsCellItem } from '@mui/x-data-grid';

import { testids } from '@shared/const/testid';
import { Refetch } from '@shared/ui/refetch/Refetch';

import style from './TableHeaderActions.module.scss';

type TableHeaderActionsProps = {
  testidAddIcon?: string;
  refetch: () => void;
  onClickAddIcon?: () => void;
};

export const TableHeaderActions: FC<TableHeaderActionsProps> = ({
  refetch,
  onClickAddIcon,
  testidAddIcon,
}) => {
  const showAddAction = !!onClickAddIcon;
  return (
    <div className={showAddAction ? style.headerAction : style.refetchWrapper}>
      <Refetch testId={testids.TABLE_REFETCH_TABLE_DATA_BUTTON} onClick={refetch} />
      {showAddAction && (
        <span onClick={onClickAddIcon} data-testid={testidAddIcon}>
          <GridActionsCellItem
            key={'add'}
            icon={<AddIcon style={{ color: '#000' }} />}
            label="add"
          />
        </span>
      )}
    </div>
  );
};
