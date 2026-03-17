import React from 'react';
import { useTranslation } from 'react-i18next';

import { KeyboardArrowDown, KeyboardArrowUp } from '@mui/icons-material';
import { Box, Typography } from '@mui/material';

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
  const { t } = useTranslation();
  const totalPages = Math.ceil(totalCount / rowsPerPage);

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        backgroundColor: 'white',
        borderTop: '1px solid #e0e0e0',
        gap: '16px',
      }}>
      <button
        className="pagination-button"
        disabled={page === 0}
        onClick={() => onPageChange(page - 1)}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '40px',
          height: '40px',
          border: '1px solid #e0e0e0',
          borderRadius: '50%',
          background: '#fff',
          color: '#333',
          cursor: page === 0 ? 'not-allowed' : 'pointer',
          transition: 'all 0.2s ease',
          opacity: page === 0 ? 0.5 : 1,
        }}
        onMouseOver={(e) => {
          if (page !== 0) {
            e.currentTarget.style.borderColor = '#1976d2';
            e.currentTarget.style.color = '#1976d2';
          }
        }}
        onMouseOut={(e) => {
          if (page !== 0) {
            e.currentTarget.style.borderColor = '#e0e0e0';
            e.currentTarget.style.color = '#333';
          }
        }}>
        <KeyboardArrowUp />
      </button>

      <Typography
        variant="body2"
        sx={{
          fontSize: '14px',
          color: '#777',
          minWidth: '120px',
          textAlign: 'center',
        }}>
        {t('pagination.pageOf', { page: page + 1, total: totalPages })}
      </Typography>

      <button
        className="pagination-button"
        disabled={(page + 1) * rowsPerPage >= totalCount}
        onClick={() => onPageChange(page + 1)}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '40px',
          height: '40px',
          border: '1px solid #e0e0e0',
          borderRadius: '50%',
          background: '#fff',
          color: '#333',
          cursor: (page + 1) * rowsPerPage >= totalCount ? 'not-allowed' : 'pointer',
          transition: 'all 0.2s ease',
          opacity: (page + 1) * rowsPerPage >= totalCount ? 0.5 : 1,
        }}
        onMouseOver={(e) => {
          if ((page + 1) * rowsPerPage < totalCount) {
            e.currentTarget.style.borderColor = '#1976d2';
            e.currentTarget.style.color = '#1976d2';
          }
        }}
        onMouseOut={(e) => {
          if ((page + 1) * rowsPerPage < totalCount) {
            e.currentTarget.style.borderColor = '#e0e0e0';
            e.currentTarget.style.color = '#333';
          }
        }}>
        <KeyboardArrowDown />
      </button>
    </Box>
  );
};
