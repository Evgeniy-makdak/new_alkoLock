/* eslint-disable @typescript-eslint/ban-ts-comment */

/* eslint-disable no-console */
// @ts-nocheck
import React, { useEffect, useState } from 'react';

import { enqueueSnackbar } from 'notistack';

import { Box } from '@mui/material';

import { TemplatesApi } from '@shared/api/baseQuerys';
import { StatusCode } from '@shared/const/statusCode';

import { EmailTemplatesGrid } from './EmailTemplatesGrid';

export interface UserInfo {
  id: number;
  email?: string;
  firstName: string;
  surname?: string;
  middleName?: string;
}

export interface EmailTemplate {
  type?: string;
  id: number;
  name: string;
  content: string;
  createdBy: UserInfo | null;
  createdAt: string;
  lastModifiedBy?: UserInfo | null;
  lastModifiedAt?: string;
  actual: boolean;
  templateType?: { type: string };
}

interface EmailTemplatesResponse {
  content: EmailTemplate[];
  totalElements: number;
}

const EmailTemplatesPage: React.FC = () => {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [totalCount, setTotalCount] = useState<number>();
  const [page, setPage] = useState(() => {
    const savedPage = localStorage.getItem('emailTemplatesPage');
    return savedPage ? parseInt(savedPage, 10) : 0;
  });
  const [rowsPerPage, setRowsPerPage] = useState(() => {
    const savedRows = localStorage.getItem('emailTemplatesRowsPerPage');
    return savedRows ? parseInt(savedRows, 10) : 25;
  });
  const [sortField, setSortField] = useState<string | null>(() => {
    return localStorage.getItem('emailTemplatesSortField') || null;
  });
  const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC' | null>(() => {
    const savedOrder = localStorage.getItem('emailTemplatesSortOrder');
    return savedOrder === 'ASC' || savedOrder === 'DESC' ? savedOrder : null;
  });
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    localStorage.setItem('emailTemplatesPage', page.toString());
  }, [page]);

  useEffect(() => {
    localStorage.setItem('emailTemplatesRowsPerPage', rowsPerPage.toString());
  }, [rowsPerPage]);

  useEffect(() => {
    if (sortField) {
      localStorage.setItem('emailTemplatesSortField', sortField);
    } else {
      localStorage.removeItem('emailTemplatesSortField');
    }
  }, [sortField]);

  useEffect(() => {
    if (sortOrder) {
      localStorage.setItem('emailTemplatesSortOrder', sortOrder);
    } else {
      localStorage.removeItem('emailTemplatesSortOrder');
    }
  }, [sortOrder]);

  const formatDate = (date: string | undefined): string =>
    date
      ? new Date(date)
          .toLocaleString('ru-RU', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
          })
          .replace(',', '')
      : '—';

  const fetchTemplates = () => {
    let queryParams = `page=${page}&size=${rowsPerPage}`;
    if (sortField && sortOrder) {
      queryParams += `&sort=${sortField},${sortOrder.toUpperCase()}`;
      if (sortField !== 'createdAt') {
        queryParams += `&sort=createdAt,DESC`;
      }
    } else {
      queryParams += `&sort=name,ASC`;
      queryParams += `&sort=createdAt,DESC`;
    }
    if (searchQuery.trim()) {
      queryParams += `&match=${encodeURIComponent(searchQuery)}`;
    }

    TemplatesApi.getTemplates(queryParams)
      //@ts-expect-error: Временное решение
      .then(({ data }: { data: EmailTemplatesResponse }) => {
        if (Array.isArray(data?.content)) {
          const formattedTemplates: EmailTemplate[] = data.content.map((item) => ({
            type: item.templateType?.type ?? '',
            templateType: item.templateType ?? null,
            id: item.id,
            name: item.name,
            content: item.content,
            createdBy: item.createdBy
              ? { ...item.createdBy, email: item.createdBy.email ?? '' }
              : null,
            createdAt: formatDate(item.createdAt),
            lastModifiedBy: item.lastModifiedBy ?? null,
            lastModifiedAt: formatDate(item.lastModifiedAt),
            actual: !!item.actual,
          }));
          setTemplates(formattedTemplates);
          setTotalCount(data.totalElements);
        } else {
          setTemplates([]);
        }
      })
      .catch(() => {
        setTemplates([]);
      });
  };

  useEffect(() => {
    fetchTemplates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, rowsPerPage, sortField, sortOrder, searchQuery]);

  const toggleStatus = async (id: number) => {
    try {
      await TemplatesApi.toggleTemplateActual(id);
      fetchTemplates();
    } catch (error) {
      console.error('Ошибка при изменении статуса шаблона:', error);
    }
  };

  const handleCreate = async (template: Omit<EmailTemplate, 'id'>) => {
    try {
      const response = await TemplatesApi.createTemplate(template);
      fetchTemplates();
      if (response.status === StatusCode.CONFLICT) {
        enqueueSnackbar(response.detail, { variant: 'error' });
      }
    } catch (error) {
      const errorMessage = error.response?.data?.detail;
      enqueueSnackbar(errorMessage, { variant: 'error' });
    }
  };

  const handleSave = async (updatedTemplate: Partial<EmailTemplate>) => {
    try {
      const response = await TemplatesApi.updateTemplate(updatedTemplate);
      fetchTemplates();

      if (response?.status === StatusCode.CONFLICT) {
        enqueueSnackbar(response?.detail, { variant: 'error' });
      }
    } catch (error) {
      const errorMessage = error.response?.data?.detail || 'Ошибка при сохранении';
      enqueueSnackbar(errorMessage, { variant: 'error' });
    }
  };

  const handleDelete = async (template: EmailTemplate) => {
    try {
      await TemplatesApi.deleteTemplate(template.id);
      fetchTemplates();
    } catch (error) {
      enqueueSnackbar('Не удалось удалить шаблон', { variant: 'error' });
    }
  };

  const handleSortChange = (field: keyof EmailTemplate) => {
    let newOrder: 'ASC' | 'DESC' | null = 'ASC';
    if (sortField === field) {
      if (sortOrder === 'ASC') newOrder = 'DESC';
      else if (sortOrder === 'DESC') newOrder = null;
    }
    setSortField(newOrder ? field : null);
    setSortOrder(newOrder);
  };

  return (
    <Box sx={{ p: 3 }}>
      <EmailTemplatesGrid
        templates={templates}
        onEditSave={handleSave}
        onDelete={handleDelete}
        onCreate={handleCreate}
        totalCount={totalCount}
        page={page}
        rowsPerPage={rowsPerPage}
        onPageChange={(_, newPage) => setPage(newPage)}
        onRowsPerPageChange={(event) => setRowsPerPage(+event.target.value)}
        onToggleStatus={toggleStatus}
        onRequestSort={handleSortChange}
        sortField={sortField}
        sortOrder={sortOrder}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />
    </Box>
  );
};

export default EmailTemplatesPage;
