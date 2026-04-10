import type { FC } from 'react';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';

import AddIcon from '@mui/icons-material/Add';
import { IconButton, Tooltip, useMediaQuery } from '@mui/material';
import { GridActionsCellItem } from '@mui/x-data-grid';

import { useTableHeaderMobileTrailing } from '@shared/components/table_header_wrapper/model/TableHeaderMobileTrailingContext';
import { pathHasInlineTableToolbar } from '@shared/config/pathHasInlineTableToolbar';
import { testids } from '@shared/const/testid';
import { Refetch } from '@shared/ui/refetch/Refetch';

import style from './TableHeaderActions.module.scss';

const MAX_WIDTH_MOBILE_TOOLBAR = 1024;

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
  const location = useLocation();
  const isNarrowToolbar = useMediaQuery(`(max-width: ${MAX_WIDTH_MOBILE_TOOLBAR}px)`);
  const hasInlineToolbarRoute = pathHasInlineTableToolbar(location.pathname);
  const showAddAction = !!onClickAddIcon && hasCreatePermission;
  const relocateAddToEndToolbar = showAddAction && isNarrowToolbar && hasInlineToolbarRoute;
  const setTrailing = useTableHeaderMobileTrailing()?.setTrailing;

  useEffect(() => {
    if (!setTrailing) {
      return;
    }
    if (!relocateAddToEndToolbar || !onClickAddIcon) {
      setTrailing(null);
      return;
    }
    setTrailing(
      <Tooltip title={t('common.add')}>
        <IconButton
          size="small"
          color="inherit"
          aria-label={t('common.add')}
          data-testid={testidAddIcon}
          onClick={() => {
            onClickAddIcon();
          }}>
          <AddIcon fontSize="small" />
        </IconButton>
      </Tooltip>,
    );
    return () => {
      setTrailing(null);
    };
  }, [setTrailing, relocateAddToEndToolbar, onClickAddIcon, t, testidAddIcon]);

  return (
    <div
      className={
        showAddAction && !relocateAddToEndToolbar ? style.headerAction : style.refetchWrapper
      }>
      <Refetch testId={testids.TABLE_REFETCH_TABLE_DATA_BUTTON} onClick={newRefetch} />
      {showAddAction && !relocateAddToEndToolbar ? (
        <span onClick={onClickAddIcon} data-testid={testidAddIcon}>
          <Tooltip title={t('common.add')}>
            <GridActionsCellItem key={'add'} icon={<AddIcon />} label="add" />
          </Tooltip>
        </span>
      ) : null}
    </div>
  );
};
