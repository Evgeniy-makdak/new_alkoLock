import { useTranslation } from 'react-i18next';

import FirstPageIcon from '@mui/icons-material/FirstPage';
import KeyboardArrowLeftIcon from '@mui/icons-material/KeyboardArrowLeft';
import KeyboardArrowRightIcon from '@mui/icons-material/KeyboardArrowRight';
import LastPageIcon from '@mui/icons-material/LastPage';
import { Box, IconButton, Tooltip } from '@mui/material';
import { GridPagination, useGridApiContext } from '@mui/x-data-grid';

import { PaginationJumpField } from '@shared/components/Pagination';

const CustomPagination = () => {
  const { t } = useTranslation();
  const apiRef = useGridApiContext();

  const handleFirstPageButtonClick = () => {
    if (apiRef.current) {
      apiRef.current.setPage(0);
    }
  };

  const handlePreviousPageButtonClick = () => {
    if (apiRef.current) {
      const { page } = apiRef.current.state.pagination.paginationModel;
      if (page > 0) {
        apiRef.current.setPage(page - 1);
      }
    }
  };

  const handleNextPageButtonClick = () => {
    if (apiRef.current) {
      const { page, pageSize } = apiRef.current.state.pagination.paginationModel;
      const totalRows = apiRef.current.state.rows.totalRowCount;
      const totalPages = Math.ceil(totalRows / pageSize);
      if (page < totalPages - 1) {
        apiRef.current.setPage(page + 1);
      }
    }
  };

  const handleLastPageButtonClick = () => {
    if (apiRef.current) {
      const { pageSize } = apiRef.current.state.pagination.paginationModel;
      const totalRows = apiRef.current.state.rows.totalRowCount;
      const totalPages = Math.ceil(totalRows / pageSize);
      apiRef.current.setPage(Math.max(0, totalPages - 1));
    }
  };

  const { page, pageSize } = apiRef.current.state.pagination.paginationModel;
  const totalRows = apiRef.current.state.rows.totalRowCount;
  const maxPageIndex = Math.max(0, Math.ceil(totalRows / pageSize) - 1);
  const pageCount = maxPageIndex + 1;

  return (
    <Box display="flex" alignItems="center" flexWrap="nowrap" justifyContent="flex-end" gap={0.5}>
      <Box display="flex" alignItems="center" mx={2} flexGrow={1} minWidth={0}>
        <GridPagination
          sx={{
            '& .MuiButtonBase-root': {
              display: 'none',
            },
          }}
        />
      </Box>

      <PaginationJumpField
        page={page}
        pageCount={pageCount}
        onJump={(idx) => apiRef.current?.setPage(idx)}
      />

      <Tooltip title={t('pagination.firstPage')}>
        <IconButton
          onClick={handleFirstPageButtonClick}
          disabled={page === 0}
          aria-label="first page">
          <FirstPageIcon />
        </IconButton>
      </Tooltip>

      <Tooltip title={t('pagination.prevPage')}>
        <IconButton
          onClick={handlePreviousPageButtonClick}
          disabled={page === 0}
          aria-label="previous page">
          <KeyboardArrowLeftIcon />
        </IconButton>
      </Tooltip>

      <Tooltip title={t('pagination.nextPage')}>
        <IconButton
          onClick={handleNextPageButtonClick}
          disabled={page >= maxPageIndex}
          aria-label="next page">
          <KeyboardArrowRightIcon />
        </IconButton>
      </Tooltip>

      <Tooltip title={t('pagination.lastPage')}>
        <IconButton
          onClick={handleLastPageButtonClick}
          disabled={page >= maxPageIndex}
          aria-label="last page">
          <LastPageIcon />
        </IconButton>
      </Tooltip>
    </Box>
  );
};

export default CustomPagination;
