import type { FC } from 'react';
import { useTranslation } from 'react-i18next';

import AddIcon from '@mui/icons-material/Add';
import { Tooltip } from '@mui/material';
import { GridActionsCellItem } from '@mui/x-data-grid';

import { testids } from '@shared/const/testid';
import { Refetch } from '@shared/ui/refetch/Refetch';

import style from './TableHeaderActions.module.scss';

type TableHeaderActionsProps = {
  testidAddIcon?: string;
  refetch: () => void;
  onClickAddIcon?: () => void;
  newRefetch?: () => void;
  hasCreatePermission?: boolean;
};

export const TableHeaderActions: FC<TableHeaderActionsProps> = ({
  onClickAddIcon,
  testidAddIcon,
  newRefetch,
  hasCreatePermission = true,
}) => {
  const { t } = useTranslation();
  const showAddAction = !!onClickAddIcon && hasCreatePermission;
  return (
    <div className={showAddAction ? style.headerAction : style.refetchWrapper}>
      <Refetch testId={testids.TABLE_REFETCH_TABLE_DATA_BUTTON} onClick={newRefetch} />
      {showAddAction && (
        <span onClick={onClickAddIcon} data-testid={testidAddIcon}>
          <Tooltip title={t('common.add')}>
            <GridActionsCellItem key={'add'} icon={<AddIcon />} label="add" />
          </Tooltip>
        </span>
      )}
    </div>
  );
};
