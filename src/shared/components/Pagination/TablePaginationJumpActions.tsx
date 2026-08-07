import { useTranslation } from 'react-i18next';

import PropTypes from 'prop-types';

import FirstPageIcon from '@mui/icons-material/FirstPage';
import KeyboardArrowLeft from '@mui/icons-material/KeyboardArrowLeft';
import KeyboardArrowRight from '@mui/icons-material/KeyboardArrowRight';
import LastPageIcon from '@mui/icons-material/LastPage';
import { Box, IconButton, Tooltip } from '@mui/material';
import type { TablePaginationProps } from '@mui/material/TablePagination';

import { PaginationJumpField } from './PaginationJumpField';

export interface TablePaginationJumpActionsProps
  extends Pick<TablePaginationProps, 'page' | 'count' | 'rowsPerPage' | 'onPageChange'> {
  className?: string;
}

/**
 * Кнопки первый/пред/след/последний + поле перехода к странице для `TablePagination` (`ActionsComponent`).
 */
export const TablePaginationJumpActions: React.FC<TablePaginationJumpActionsProps> = ({
  page,
  count,
  rowsPerPage,
  onPageChange,
  className,
}) => {
  const { t } = useTranslation();
  const pageCount = Math.max(1, Math.ceil(count / rowsPerPage) || 1);
  const lastIndex = pageCount - 1;

  const emitPage = (newPage: number) => {
    onPageChange({} as React.MouseEvent<HTMLButtonElement>, newPage);
  };

  const handleFirstPage = (event: React.MouseEvent<HTMLButtonElement>) => {
    onPageChange(event, 0);
  };

  const handleLastPage = (event: React.MouseEvent<HTMLButtonElement>) => {
    onPageChange(event, lastIndex);
  };

  const handlePrevPage = (event: React.MouseEvent<HTMLButtonElement>) => {
    onPageChange(event, page - 1);
  };

  const handleNextPage = (event: React.MouseEvent<HTMLButtonElement>) => {
    onPageChange(event, page + 1);
  };

  return (
    <Box
      className={className}
      sx={{
        display: 'flex',
        alignItems: 'center',
        flexWrap: 'nowrap',
        justifyContent: 'flex-end',
        // Как у CustomPagination: mx={2} у блока «строк на странице / N из M»
        gap: 0.5,
        flexShrink: 0,
        ml: 2,
      }}>
      <PaginationJumpField page={page} pageCount={pageCount} onJump={emitPage} />

      <Tooltip title={page === 0 ? '' : t('pagination.firstPage')}>
        <span>
          <IconButton
            onClick={handleFirstPage}
            disabled={page === 0}
            aria-label={t('pagination.firstPage')}>
            <FirstPageIcon />
          </IconButton>
        </span>
      </Tooltip>

      <Tooltip title={page === 0 ? '' : t('pagination.prevPage')}>
        <span>
          <IconButton
            onClick={handlePrevPage}
            disabled={page === 0}
            aria-label={t('pagination.prevPage')}>
            <KeyboardArrowLeft />
          </IconButton>
        </span>
      </Tooltip>

      <Tooltip title={page >= lastIndex ? '' : t('pagination.nextPage')}>
        <span>
          <IconButton
            onClick={handleNextPage}
            disabled={page >= lastIndex}
            aria-label={t('pagination.nextPage')}>
            <KeyboardArrowRight />
          </IconButton>
        </span>
      </Tooltip>

      <Tooltip title={page >= lastIndex ? '' : t('pagination.lastPage')}>
        <span>
          <IconButton
            onClick={handleLastPage}
            disabled={page >= lastIndex}
            aria-label={t('pagination.lastPage')}>
            <LastPageIcon />
          </IconButton>
        </span>
      </Tooltip>
    </Box>
  );
};

TablePaginationJumpActions.propTypes = {
  page: PropTypes.number.isRequired,
  count: PropTypes.number.isRequired,
  rowsPerPage: PropTypes.number.isRequired,
  onPageChange: PropTypes.func.isRequired,
  className: PropTypes.string,
};
