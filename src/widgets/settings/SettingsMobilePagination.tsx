import React from 'react';

import { Box } from '@mui/material';

import { MobilePaginationWithJump } from '@shared/components/Pagination';

interface SettingsMobilePaginationProps {
  totalCount: number;
  rowsPerPage: number;
  page: number;
  onPageChange: (newPage: number) => void;
}

export const SettingsMobilePagination: React.FC<SettingsMobilePaginationProps> = ({
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
      />
    </Box>
  );
};
