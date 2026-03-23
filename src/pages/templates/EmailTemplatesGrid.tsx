import React from 'react';

import { useMediaQuery } from '@mui/material';

import { EmailTemplate } from '../templates/types';
import EmailTemplatesTable from './EmailTemplatesTable';
import PaginationControls from './PaginationControls';
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
  const isMobile = useMediaQuery('(max-width:768px)');

  const handleRowsPerPageChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    onRowsPerPageChange(event);
    onPageChange(null, 0);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '96vh' }}>
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
      />

      <div
        style={{
          position: 'sticky',
          bottom: 0,
          left: 0,
          right: 0,
          backgroundColor: '#fff',
          paddingBottom: 0,
        }}>
        {isMobile ? (
          <TemplatesMobilePagination
            totalCount={totalCount}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={(newPage) => onPageChange(null, newPage)}
          />
        ) : (
          <PaginationControls
            hideTopBorder
            totalCount={totalCount}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={onPageChange}
            onRowsPerPageChange={handleRowsPerPageChange}
          />
        )}
      </div>
    </div>
  );
};
