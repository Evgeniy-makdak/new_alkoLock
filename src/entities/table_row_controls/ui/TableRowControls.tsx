import { type FC, useState } from 'react';

import ArrowForwardOutlinedIcon from '@mui/icons-material/ArrowForwardOutlined';
import CheckCircleOutlineRoundedIcon from '@mui/icons-material/CheckCircleOutlineRounded';
import DeleteIcon from '@mui/icons-material/Delete';
import DeleteForeverIcon from '@mui/icons-material/DeleteForever';
import HighlightOffIcon from '@mui/icons-material/HighlightOff';
import ModeEditIcon from '@mui/icons-material/ModeEdit';
import { Tooltip } from '@mui/material';
import { GridActionsCellItem } from '@mui/x-data-grid';

import style from './TableRowControls.module.scss';

type TableRowControlsProps = {
  arrowIcon?: boolean;
  onClickDelete?: () => void;
  onClickEdit?: () => void;
  onClickRecover?: () => void;
  onTrueDelete?: () => void;
  testidEdit?: string;
  testidDelete?: string;
  visible?: boolean;
  showEdit?: boolean;
  roles?: string[];
  permissions?: string[];
  currentUserId?: string;
  rowUserId?: string;
  isActive?: boolean;
  useHighlightOffIcon?: boolean;
  permissionPrefix?: string;
};

export const TableRowControls: FC<TableRowControlsProps> = ({
  onClickDelete,
  onClickEdit,
  onClickRecover,
  onTrueDelete,
  testidDelete,
  testidEdit,
  visible = true,
  showEdit = true,
  arrowIcon = false,
  roles,
  permissions,
  isActive,
  useHighlightOffIcon = false,
  permissionPrefix = '',
}) => {
  const [hoveredButton, setHoveredButton] = useState<string | null>(null);

  const isGlobalAdmin = roles?.includes('Администратор системы');
  const isSystemGlobalAdmin = permissions?.includes('SYSTEM_GLOBAL_ADMIN');

  const requiredPermissions = {
    edit: `PERMISSION_${permissionPrefix}_EDIT` || 'SYSTEM_GLOBAL_ADMIN',
    delete: `PERMISSION_${permissionPrefix}_DELETE` || 'SYSTEM_GLOBAL_ADMIN',
  };

  const hasEditPermission = permissions?.some(
    (perm) => perm === requiredPermissions.edit || perm === 'SYSTEM_GLOBAL_ADMIN',
  );
  const hasDeletePermission = permissions?.some(
    (perm) => perm === requiredPermissions.delete || perm === 'SYSTEM_GLOBAL_ADMIN',
  );

  const canEdit =
    showEdit &&
    (isGlobalAdmin || isSystemGlobalAdmin || (!!onClickEdit && hasEditPermission)) &&
    isActive !== false;
  const canDelete =
    (isActive === undefined || isActive === true) &&
    !!onClickDelete &&
    (isGlobalAdmin || isSystemGlobalAdmin || hasDeletePermission);
  const canRecover =
    isActive === false &&
    !!onClickRecover &&
    (isGlobalAdmin || isSystemGlobalAdmin || hasDeletePermission);
  const canTrueDelete =
    isActive === false &&
    !!onTrueDelete &&
    (isGlobalAdmin || isSystemGlobalAdmin || hasDeletePermission);
  const deleteIcon = useHighlightOffIcon ? <HighlightOffIcon /> : <DeleteIcon />;

  return (
    <div className={style.controls}>
      {/* Стрелочка "Перенести" - отображается всегда когда arrowIcon=true и visible=true */}
      {visible && arrowIcon && (
        <Tooltip title="Перенести" open={hoveredButton === 'arrow'}>
          <span>
            <GridActionsCellItem
              data-testid={testidEdit}
              label="arrow"
              icon={<ArrowForwardOutlinedIcon />}
              key="arrow"
              onClick={onClickEdit}
              onMouseEnter={() => setHoveredButton('arrow')}
              onMouseLeave={() => setHoveredButton(null)}
            />
          </span>
        </Tooltip>
      )}

      {/* Карандашик "Редактировать" - отображается только при наличии прав */}
      {visible && canEdit && !arrowIcon && (
        <Tooltip title="Редактировать" open={hoveredButton === 'edit'}>
          <span>
            <GridActionsCellItem
              data-testid={testidEdit}
              label="edit"
              icon={<ModeEditIcon />}
              key="edit"
              onClick={onClickEdit}
              onMouseEnter={() => setHoveredButton('edit')}
              onMouseLeave={() => setHoveredButton(null)}
            />
          </span>
        </Tooltip>
      )}
      {!isGlobalAdmin && canDelete && visible && (
        <Tooltip
          title={useHighlightOffIcon ? 'Деактивировать' : 'Удалить'}
          open={hoveredButton === 'delete'}>
          <span>
            <GridActionsCellItem
              onClick={onClickDelete}
              key="delete"
              data-testid={testidDelete}
              icon={deleteIcon}
              label="Delete"
              onMouseEnter={() => setHoveredButton('delete')}
              onMouseLeave={() => setHoveredButton(null)}
            />
          </span>
        </Tooltip>
      )}
      {canRecover && visible && (
        <Tooltip title="Активировать" open={hoveredButton === 'recover'}>
          <span>
            <GridActionsCellItem
              onClick={onClickRecover}
              key="recover"
              data-testid={testidDelete}
              icon={<CheckCircleOutlineRoundedIcon />}
              label="Recover"
              onMouseEnter={() => setHoveredButton('recover')}
              onMouseLeave={() => setHoveredButton(null)}
            />
          </span>
        </Tooltip>
      )}
      {!isGlobalAdmin && visible && canTrueDelete && (
        <Tooltip title="Удалить" open={hoveredButton === 'trueDelete'}>
          <span>
            <GridActionsCellItem
              onClick={onTrueDelete}
              key="true-delete"
              data-testid="true-delete"
              icon={<DeleteForeverIcon />}
              label="True Delete"
              onMouseEnter={() => setHoveredButton('trueDelete')}
              onMouseLeave={() => setHoveredButton(null)}
            />
          </span>
        </Tooltip>
      )}
    </div>
  );
};
