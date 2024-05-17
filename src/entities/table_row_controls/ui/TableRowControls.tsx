import type { FC } from 'react';

import ArrowForwardOutlinedIcon from '@mui/icons-material/ArrowForwardOutlined';
import DeleteIcon from '@mui/icons-material/Delete';
import ModeEditIcon from '@mui/icons-material/ModeEdit';
import { GridActionsCellItem } from '@mui/x-data-grid';

import style from './TableRowControls.module.scss';

type TableRowControlsProps = {
  arrowIcon?: boolean;
  onClickDelete?: () => void;
  onClickEdit?: () => void;
  testidEdit?: string;
  testidDelete?: string;
};

export const TableRowControls: FC<TableRowControlsProps> = ({
  onClickDelete,
  onClickEdit,
  testidDelete,
  testidEdit,
  arrowIcon = false,
}) => {
  return (
    <div className={style.controls}>
      {!!onClickEdit && (
        <GridActionsCellItem
          data-testid={testidEdit}
          label="edit"
          icon={arrowIcon ? <ArrowForwardOutlinedIcon /> : <ModeEditIcon />}
          key={'add'}
          onClick={onClickEdit}
        />
      )}
      {!!onClickDelete && (
        <GridActionsCellItem
          onClick={onClickDelete}
          key={'delete'}
          data-testid={testidDelete}
          icon={<DeleteIcon />}
          label="Delete"
        />
      )}
    </div>
  );
};
