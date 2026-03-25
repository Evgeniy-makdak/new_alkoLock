import React from 'react';

import { Box } from '@mui/material';

import { MobilePaginationWithJump } from '@shared/components/Pagination';

interface TemplatesMobilePaginationProps {
  totalCount: number;
  rowsPerPage: number;
  page: number;
  onPageChange: (newPage: number) => void;
}

export const TemplatesMobilePagination: React.FC<TemplatesMobilePaginationProps> = ({
  totalCount,
  rowsPerPage,
  page,
  onPageChange,
}) => {
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        bgcolor: 'background.paper',
        color: 'text.primary',
        gap: '16px',
      }}>
      <MobilePaginationWithJump
        page={page}
        pageSize={rowsPerPage}
        totalCount={totalCount}
        onPageChange={onPageChange}
        buttonClassName="pagination-button"
        infoClassName=""
      />
    </Box>
  );
};
