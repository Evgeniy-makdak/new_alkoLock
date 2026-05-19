import React from 'react';
import { useTranslation } from 'react-i18next';

import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import DeleteIcon from '@mui/icons-material/Delete';
import HighlightOffIcon from '@mui/icons-material/HighlightOff';
import ModeEditIcon from '@mui/icons-material/ModeEdit';
import {
  CircularProgress,
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
} from '@mui/material';
import type { Theme } from '@mui/material/styles';

import { TEMPLATE_TYPES_LABEL_MAP } from '@shared/lib/templateTypesLabelMap';

import { EmailTemplate } from '../templates/types';

interface TemplatesDesktopTableProps {
  templates: EmailTemplate[];
  loading: boolean;
  sortField: keyof EmailTemplate | null;
  sortOrder: 'ASC' | 'DESC' | null;
  selectedRowId: number | null;
  activeTooltip: string | null;
  hoveredColumn: keyof EmailTemplate | null;
  onRequestSort: (property: keyof EmailTemplate) => void;
  onToggleStatus: (id: number) => void;
  onEditClick: (template: EmailTemplate) => void;
  onDeleteClick: (template: EmailTemplate) => void;
  onViewClick: (template: EmailTemplate) => void;
  onMouseEnterColumn: (field: keyof EmailTemplate) => void;
  onMouseLeaveColumn: () => void;
  onTooltipOpen: (key: string) => void;
  onTooltipClose: () => void;
}

export const TemplatesDesktopTable: React.FC<TemplatesDesktopTableProps> = ({
  templates,
  loading,
  sortField,
  sortOrder,
  selectedRowId,
  activeTooltip,
  hoveredColumn,
  onRequestSort,
  onToggleStatus,
  onEditClick,
  onDeleteClick,
  onViewClick,
  onMouseEnterColumn,
  onMouseLeaveColumn,
  onTooltipOpen,
  onTooltipClose,
}) => {
  const { t } = useTranslation();
  const headBg = (theme: Theme) =>
    theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : theme.palette.grey[300];

  const handleSortClick = (field: keyof EmailTemplate) => {
    onRequestSort(field);
  };

  const headerColumns = [
    { label: t('tables.name'), field: 'name' },
    { label: t('tables.author'), field: 'createdBy' },
    { label: t('tables.creationDate'), field: 'createdAt' },
    { label: t('tables.templateType'), field: 'templateType' },
    { label: t('tables.modificationDate'), field: 'lastModifiedAt' },
  ];

  return (
    <TableContainer
      component={Paper}
      sx={{
        flexGrow: 1,
        maxHeight: '96vh',
        overflow: 'auto',
        marginTop: 0,
        outline: 'none',
        border: 'none',
        boxShadow: 'none',
        boxSizing: 'border-box',
        paddingInline: 'var(--table-page-content-inset-inline, 16px)',
      }}>
      <Table
        size="small"
        stickyHeader
        sx={{
          tableLayout: 'fixed',
          minWidth: '1000px',
          border: 'none',
          borderCollapse: 'separate',
          borderSpacing: 0,
        }}>
        <TableHead sx={{ height: '54px' }}>
          <TableRow
            sx={{
              bgcolor: headBg,
              position: 'sticky',
              top: 0,
              zIndex: 2,
              border: 'none',
            }}>
            {headerColumns.map(({ label, field }) => (
              <TableCell
                key={field}
                sx={{
                  fontWeight: 'bold',
                  bgcolor: headBg,
                  cursor: 'pointer',
                  position: 'relative',
                  border: 'none',
                  borderBottom: 'none',
                }}
                onClick={() => handleSortClick(field as keyof EmailTemplate)}
                onMouseEnter={() => onMouseEnterColumn(field as keyof EmailTemplate)}
                onMouseLeave={onMouseLeaveColumn}>
                {label}
                <span style={{ display: 'inline-block', position: 'absolute', marginLeft: 10 }}>
                  {sortField === field ? (
                    <Tooltip title={t('common.sort')}>
                      <ArrowUpwardIcon
                        sx={{
                          fontSize: '1.5rem',
                          color: 'text.secondary',
                          transform: sortOrder === 'DESC' ? 'rotate(180deg)' : 'rotate(0deg)',
                        }}
                      />
                    </Tooltip>
                  ) : (
                    hoveredColumn === field && (
                      <Tooltip title={t('common.sort')}>
                        <ArrowUpwardIcon sx={{ fontSize: '1.5rem', color: 'text.disabled' }} />
                      </Tooltip>
                    )
                  )}
                </span>
              </TableCell>
            ))}
            <TableCell
              sx={{
                width: '160px',
                textAlign: 'center',
                fontWeight: 'bold',
                bgcolor: headBg,
                border: 'none',
                borderBottom: 'none',
              }}>
              {t('tables.actions')}
            </TableCell>
          </TableRow>
        </TableHead>

        <TableBody>
          {loading ? (
            <TableRow>
              <TableCell colSpan={6} align="center" sx={{ border: 'none', borderBottom: 'none' }}>
                <CircularProgress />
              </TableCell>
            </TableRow>
          ) : (
            templates.map((template) => (
              <TableRow
                key={template.id}
                id={`template-row-${template.id}`}
                sx={{
                  cursor: 'pointer',
                  backgroundColor: selectedRowId === template.id ? '#d3d3d3' : 'inherit',
                  '&:hover': { backgroundColor: 'rgba(0, 0, 0, 0.08)' },
                  border: 'none',
                  borderBottom: 'none',
                }}
                onClick={() => onViewClick(template)}>
                <TableCell sx={{ border: 'none', borderBottom: 'none' }}>{template.name}</TableCell>
                <TableCell sx={{ border: 'none', borderBottom: 'none' }}>
                  {template.createdBy?.firstName || '—'}
                </TableCell>
                <TableCell sx={{ border: 'none', borderBottom: 'none' }}>
                  {template.createdAt}
                </TableCell>
                <TableCell sx={{ border: 'none', borderBottom: 'none' }}>
                  {template.templateType?.name
                    ? t(
                        TEMPLATE_TYPES_LABEL_MAP[template.templateType.name] ??
                          `templateTypes.${template.templateType.type ?? ''}`,
                        { defaultValue: template.templateType.name },
                      )
                    : '—'}
                </TableCell>
                <TableCell sx={{ border: 'none', borderBottom: 'none' }}>
                  {template.lastModifiedAt || '—'}
                </TableCell>
                <TableCell
                  sx={{
                    whiteSpace: 'nowrap',
                    width: '160px',
                    textAlign: 'center',
                    border: 'none',
                    borderBottom: 'none',
                  }}>
                  <Tooltip
                    title={template.actual ? t('tooltips.templateActive') : t('common.activate')}
                    disableInteractive
                    open={activeTooltip === `status-${template.id}`}
                    onOpen={() => onTooltipOpen(`status-${template.id}`)}
                    onClose={onTooltipClose}>
                    <IconButton
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleStatus(template.id);
                      }}>
                      {template.actual ? <CheckCircleOutlineIcon /> : <HighlightOffIcon />}
                    </IconButton>
                  </Tooltip>
                  <Tooltip
                    title={t('common.edit')}
                    disableInteractive
                    open={activeTooltip === `edit-${template.id}`}
                    onOpen={() => onTooltipOpen(`edit-${template.id}`)}
                    onClose={onTooltipClose}>
                    <span
                      style={{ visibility: template.createdBy?.id === 0 ? 'hidden' : 'visible' }}>
                      <IconButton
                        onClick={(e) => {
                          e.stopPropagation();
                          onEditClick(template);
                        }}
                        color="inherit">
                        <ModeEditIcon />
                      </IconButton>
                    </span>
                  </Tooltip>
                  <Tooltip
                    title={t('common.delete')}
                    disableInteractive
                    open={activeTooltip === `delete-${template.id}`}
                    onOpen={() => onTooltipOpen(`delete-${template.id}`)}
                    onClose={onTooltipClose}>
                    <span
                      style={{ visibility: template.createdBy?.id === 0 ? 'hidden' : 'visible' }}>
                      <IconButton
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteClick(template);
                        }}
                        color="inherit">
                        <DeleteIcon />
                      </IconButton>
                    </span>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );
};
