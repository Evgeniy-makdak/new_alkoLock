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
  userRole?: number;
  visible?: boolean;
  roles?:string[];
};

export const TableRowControls: FC<TableRowControlsProps> = ({
  onClickDelete,
  onClickEdit,
  testidDelete,
  testidEdit,
  visible = false,
  arrowIcon = false,
  roles,
}) => {
const isGlobalAdmin = roles.includes('Администратор системы')

  return (
    <div className={style.controls}>
      {!!onClickEdit &&  (!isGlobalAdmin || visible) && (
        <GridActionsCellItem
          data-testid={testidEdit}
          label="edit"
          icon={arrowIcon ? <ArrowForwardOutlinedIcon /> : <ModeEditIcon />}
          key={'add'}
          onClick={onClickEdit}
        />
      )}
      {!!onClickDelete && !isGlobalAdmin && (
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
