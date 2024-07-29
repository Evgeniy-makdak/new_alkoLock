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
};

export const TableRowControls: FC<TableRowControlsProps> = ({
  onClickDelete,
  onClickEdit,
  testidDelete,
  testidEdit,
  visible = true,
  arrowIcon = false,
  userRole = 0,
}) => {
  const isUserSuperAdmine = userRole === 100;
  return (
    <div className={style.controls}>
      {!!onClickEdit && !isUserSuperAdmine && (
        <GridActionsCellItem
          data-testid={testidEdit}
          label="edit"
          icon={arrowIcon ? <ArrowForwardOutlinedIcon /> : <ModeEditIcon />}
          key={'add'}
          onClick={onClickEdit}
        />
      )}
      {!!onClickDelete && visible && (
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

// import type { FC } from 'react';

// import ArrowForwardOutlinedIcon from '@mui/icons-material/ArrowForwardOutlined';
// import DeleteIcon from '@mui/icons-material/Delete';
// import ModeEditIcon from '@mui/icons-material/ModeEdit';
// import { GridActionsCellItem } from '@mui/x-data-grid';

// import style from './TableRowControls.module.scss';

// type TableRowControlsProps = {
//   arrowIcon?: boolean;
//   onClickDelete?: () => void;
//   onClickEdit?: () => void;
//   testidEdit?: string;
//   testidDelete?: string;
//   userRole?: number;
// };

// export const TableRowControls: FC<TableRowControlsProps> = ({
//   onClickDelete,
//   onClickEdit,
//   testidDelete,
//   testidEdit,
//   arrowIcon = false,
//   userRole = 0,
// }) => {
//   const isUserSuperAdmin = userRole === 100;

//   return (
//     <div className={style.controls}>
//       {!!onClickEdit && isUserSuperAdmin && (
//         <GridActionsCellItem
//           data-testid={testidEdit}
//           label="edit"
//           icon={arrowIcon ? <ArrowForwardOutlinedIcon /> : <ModeEditIcon />}
//           key={'add'}
//           onClick={onClickEdit}
//         />
//       )}
//       {!!onClickDelete && isUserSuperAdmin && (
//         <GridActionsCellItem
//           onClick={onClickDelete}
//           key={'delete'}
//           data-testid={testidDelete}
//           icon={<DeleteIcon />}
//           label="Delete"
//         />
//       )}
//     </div>
//   );
// };
