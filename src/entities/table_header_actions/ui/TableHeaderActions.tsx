import type { FC } from 'react';
import { useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';

import AddIcon from '@mui/icons-material/Add';
import { IconButton, Tooltip, useMediaQuery, useTheme } from '@mui/material';

import { useTableHeaderMobileTrailing } from '@shared/components/table_header_wrapper/model/TableHeaderMobileTrailingContext';
import { pathHasInlineTableToolbar } from '@shared/config/pathHasInlineTableToolbar';
import { testids } from '@shared/const/testid';
import { getToolbarCircleIconButtonSx } from '@shared/lib/toolbarCircleAddButtonSx';
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
  const theme = useTheme();
  const addCircleSx = useMemo(() => getToolbarCircleIconButtonSx(theme), [theme]);
  const location = useLocation();
  const isMobile = useMediaQuery('(max-width: 768px)');
  const hasInlineToolbarRoute = pathHasInlineTableToolbar(location.pathname);
  const showAddAction = !!onClickAddIcon && hasCreatePermission;
  const relocateAddToEndToolbar = showAddAction && hasInlineToolbarRoute && !isMobile;
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
          aria-label={t('common.add')}
          data-testid={testidAddIcon}
          onClick={() => {
            onClickAddIcon();
          }}
          sx={addCircleSx}>
          <AddIcon fontSize="small" />
        </IconButton>
      </Tooltip>,
    );
    return () => {
      setTrailing(null);
    };
  }, [setTrailing, relocateAddToEndToolbar, onClickAddIcon, t, testidAddIcon, addCircleSx]);

  return (
    <div
      className={
        showAddAction && !relocateAddToEndToolbar ? style.headerAction : style.refetchWrapper
      }>
      <Refetch testId={testids.TABLE_REFETCH_TABLE_DATA_BUTTON} onClick={newRefetch} />
      {showAddAction && !relocateAddToEndToolbar ? (
        <Tooltip title={t('common.add')}>
          <IconButton
            aria-label={t('common.add')}
            data-testid={testidAddIcon}
            onClick={onClickAddIcon}
            sx={addCircleSx}>
            <AddIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      ) : null}
    </div>
  );
};
