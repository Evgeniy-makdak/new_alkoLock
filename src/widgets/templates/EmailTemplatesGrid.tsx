import React from 'react';

import { Box, useMediaQuery } from '@mui/material';

import { EmailTemplate } from '../templates/types';
import EmailTemplatesTable from './EmailTemplatesTable';
import { TemplatesMobilePagination } from './TemplatesMobilePagination';

interface EmailTemplatesGridProps {
  templates: EmailTemplate[];
  onToggleStatus: (id: number) => void;
  onCreate: (template: Omit<EmailTemplate, 'id' | 'createdBy' | 'createdAt'>) => void;
  onEditSave: (template: Partial<EmailTemplate>) => void;
  onDelete: (template: EmailTemplate) => void;
  totalCount: number;
  page: number;
  rowsPerPage: number;
  onPageChange: (event: React.MouseEvent<HTMLButtonElement> | null, newPage: number) => void;
  onRowsPerPageChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  onRequestSort: (property: keyof EmailTemplate) => void;
  sortField: keyof EmailTemplate | null;
  sortOrder: 'ASC' | 'DESC' | null;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

export const EmailTemplatesGrid: React.FC<EmailTemplatesGridProps> = ({
  templates,
  onToggleStatus,
  onCreate,
  onEditSave,
  onDelete,
  totalCount,
  page,
  rowsPerPage,
  onPageChange,
  onRowsPerPageChange,
  onRequestSort,
  sortField,
  sortOrder,
  searchQuery,
  onSearchChange,
}) => {
  const isMobile = useMediaQuery('(max-width:768px)', { noSsr: true });

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        minHeight: 0,
      }}>
      <EmailTemplatesTable
        templates={templates}
        sortField={sortField}
        sortOrder={sortOrder}
        onRequestSort={onRequestSort}
        onToggleStatus={onToggleStatus}
        onDelete={onDelete}
        onCreate={onCreate}
        onEditSave={onEditSave}
        searchQuery={searchQuery}
        onSearchChange={onSearchChange}
        totalCount={totalCount}
        page={page}
        rowsPerPage={rowsPerPage}
        onPaginationModelChange={(model) => {
          if (model.pageSize !== rowsPerPage) {
            onRowsPerPageChange({
              target: { value: String(model.pageSize) },
            } as React.ChangeEvent<HTMLInputElement>);
            onPageChange(null, 0);
            return;
          }
          onPageChange(null, model.page);
        }}
      />

      {isMobile && (
        <Box
          sx={{
            flexShrink: 0,
            bgcolor: 'background.paper',
            color: 'text.primary',
            pb: 0,
          }}>
          <TemplatesMobilePagination
            totalCount={totalCount}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={(newPage) => onPageChange(null, newPage)}
          />
        </Box>
      )}
    </div>
  );
};
