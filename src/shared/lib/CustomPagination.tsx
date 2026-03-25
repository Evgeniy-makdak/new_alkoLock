import { useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';

import FirstPageIcon from '@mui/icons-material/FirstPage';
import KeyboardArrowLeftIcon from '@mui/icons-material/KeyboardArrowLeft';
import KeyboardArrowRightIcon from '@mui/icons-material/KeyboardArrowRight';
import LastPageIcon from '@mui/icons-material/LastPage';
import { Box, IconButton, Tooltip } from '@mui/material';
import {
  GridPagination,
  type GridState,
  gridPaginationModelSelector,
  gridRowsLoadingSelector,
  useGridApiContext,
  useGridSelector,
} from '@mui/x-data-grid';

import { PaginationJumpField } from '@shared/components/Pagination';

type PaginationResolution = {
  hasReliableTotal: boolean;
  resolvedPageCount: number;
  maxPageIndex: number;
  displayPageCount: number | null;
};

function resolveServerPagination(
  totalRows: number,
  pageSize: number,
  page: number,
  rowsLoading: boolean,
  lastKnownPageCount: number | null,
): PaginationResolution {
  const numericTotalOk = typeof totalRows === 'number' && totalRows >= 0;
  const pageCountFromTotal = numericTotalOk ? Math.max(1, Math.ceil(totalRows / pageSize)) : 1;
  const impossibleSinglePage = pageCountFromTotal === 1 && page > 0;
  const hasReliableTotal = numericTotalOk && !rowsLoading && !impossibleSinglePage;

  if (hasReliableTotal) {
    const resolvedPageCount = pageCountFromTotal;
    const maxPageIndex = resolvedPageCount - 1;
    return {
      hasReliableTotal: true,
      resolvedPageCount,
      maxPageIndex,
      displayPageCount: resolvedPageCount,
    };
  }

  if (lastKnownPageCount != null) {
    return {
      hasReliableTotal: false,
      resolvedPageCount: lastKnownPageCount,
      maxPageIndex: lastKnownPageCount - 1,
      displayPageCount: lastKnownPageCount,
    };
  }

  return {
    hasReliableTotal: false,
    resolvedPageCount: 1,
    maxPageIndex: 0,
    displayPageCount: null,
  };
}

const CustomPagination = () => {
  const { t } = useTranslation();
  const apiRef = useGridApiContext();
  const lastKnownPageCountRef = useRef<number | null>(null);

  const rowsLoading = useGridSelector(apiRef, gridRowsLoadingSelector) === true;
  const { page, pageSize } = useGridSelector(apiRef, gridPaginationModelSelector);
  const totalRows = useGridSelector(apiRef, (state: GridState) => state.rows.totalRowCount);

  const onJump = useCallback(
    (idx: number) => {
      apiRef.current?.setPage(idx);
    },
    [apiRef],
  );

  const paginationSnap = resolveServerPagination(
    totalRows,
    pageSize,
    page,
    rowsLoading,
    lastKnownPageCountRef.current,
  );
  if (paginationSnap.hasReliableTotal) {
    lastKnownPageCountRef.current = paginationSnap.resolvedPageCount;
  }

  const { resolvedPageCount, maxPageIndex, displayPageCount } = paginationSnap;

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
    const api = apiRef.current;
    if (!api) return;
    const pm = api.state.pagination.paginationModel;
    const tr = api.state.rows.totalRowCount;
    const loading = api.state.rows.loading === true;
    const { resolvedPageCount: totalPages } = resolveServerPagination(
      tr,
      pm.pageSize,
      pm.page,
      loading,
      lastKnownPageCountRef.current,
    );
    if (pm.page < totalPages - 1) {
      api.setPage(pm.page + 1);
    }
  };

  const handleLastPageButtonClick = () => {
    const api = apiRef.current;
    if (!api) return;
    const pm = api.state.pagination.paginationModel;
    const tr = api.state.rows.totalRowCount;
    const loading = api.state.rows.loading === true;
    const { resolvedPageCount: totalPages } = resolveServerPagination(
      tr,
      pm.pageSize,
      pm.page,
      loading,
      lastKnownPageCountRef.current,
    );
    api.setPage(Math.max(0, totalPages - 1));
  };

  return (
    <Box
      display="flex"
      alignItems="center"
      flexWrap="nowrap"
      justifyContent="flex-end"
      gap={0.5}
      sx={{ color: 'text.primary' }}>
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
        pageCount={resolvedPageCount}
        displayPageCount={displayPageCount}
        onJump={onJump}
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
