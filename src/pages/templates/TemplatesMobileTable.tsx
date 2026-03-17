import React from 'react';
import { useTranslation } from 'react-i18next';

import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import DeleteIcon from '@mui/icons-material/Delete';
import HighlightOffIcon from '@mui/icons-material/HighlightOff';
import ModeEditIcon from '@mui/icons-material/ModeEdit';
import { Box, IconButton, Paper, Tooltip, Typography } from '@mui/material';

import { TEMPLATE_TYPES_LABEL_MAP } from '@shared/lib/templateTypesLabelMap';

import { EmailTemplate } from '../templates/types';

interface TemplatesMobileTableProps {
  templates: EmailTemplate[];
  onToggleStatus: (id: number) => void;
  onEditClick: (template: EmailTemplate) => void;
  onDeleteClick: (template: EmailTemplate) => void;
  selectedRowId: number | null;
}

export const TemplatesMobileTable: React.FC<TemplatesMobileTableProps> = ({
  templates,
  onToggleStatus,
  onEditClick,
  onDeleteClick,
  selectedRowId,
}) => {
  const { t } = useTranslation();
  const handleStatusChange = (template: EmailTemplate) => {
    if (!template.actual) {
      onToggleStatus(template.id);
    }
  };

  return (
    <Box sx={{ p: 2, flexGrow: 1, overflow: 'auto' }}>
      {templates.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <Typography variant="body1" color="textSecondary">
            Шаблоны не найдены
          </Typography>
        </Box>
      ) : (
        templates.map((template) => (
          <Paper
            key={template.id}
            sx={{
              p: 2,
              mb: 1.5,
              borderRadius: 2,
              boxShadow: '0 1px 4px rgba(0,0,0,0.1)',
              border: '1px solid #e0e0e0',
              backgroundColor: selectedRowId === template.id ? '#f5f5f5' : 'white',
            }}>
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                mb: 1.5,
              }}>
              <Box sx={{ flexGrow: 1, mr: 1 }}>
                <Typography
                  variant="subtitle2"
                  color="textSecondary"
                  sx={{ mb: 0.5, fontSize: '0.75rem' }}>
                  Название:
                </Typography>
                <Typography
                  variant="body2"
                  sx={{ wordBreak: 'break-word', fontWeight: 'medium', fontSize: '0.875rem' }}>
                  {template.name}
                </Typography>
              </Box>

              <Box sx={{ display: 'flex', gap: 0.5, flexShrink: 0, alignItems: 'center' }}>
                <Tooltip title={template.actual ? 'Активный' : 'Неактивный'}>
                  <Box
                    sx={{
                      width: 12,
                      height: 12,
                      borderRadius: '50%',
                      backgroundColor: template.actual ? '#4caf50' : '#f44336',
                      border: '1px solid #fff',
                      boxShadow: '0 0 2px rgba(0,0,0,0.3)',
                      mr: 2,
                    }}
                  />
                </Tooltip>

                <Tooltip title="Редактировать">
                  <span style={{ visibility: template.createdBy?.id === 0 ? 'hidden' : 'visible' }}>
                    <IconButton
                      onClick={(e) => {
                        e.stopPropagation();
                        onEditClick(template);
                      }}
                      size="small"
                      sx={{
                        padding: 0.5,
                        '& .MuiSvgIcon-root': {
                          fontSize: '1rem',
                          color: 'rgba(0, 0, 0, 0.54) !important',
                        },
                        '&:hover .MuiSvgIcon-root': {
                          color: 'rgba(0, 0, 0, 0.87) !important',
                        },
                      }}>
                      <ModeEditIcon fontSize="small" />
                    </IconButton>
                  </span>
                </Tooltip>

                <Tooltip title={template.actual ? 'Активный' : 'Активировать'}>
                  <IconButton
                    onClick={(e) => {
                      e.stopPropagation();
                      handleStatusChange(template);
                    }}
                    disabled={template.actual}
                    size="small"
                    sx={{
                      padding: 0.5,
                      '& .MuiSvgIcon-root': {
                        fontSize: '1rem',
                        color: template.actual ? 'rgba(0, 0, 0, 0.54)' : 'rgba(0, 0, 0, 0.38)',
                      },
                      '&:hover .MuiSvgIcon-root': {
                        color: template.actual ? 'rgba(0, 0, 0, 0.87)' : 'rgba(0, 0, 0, 0.87)',
                      },
                    }}>
                    {template.actual ? (
                      <CheckCircleOutlineIcon fontSize="small" />
                    ) : (
                      <HighlightOffIcon fontSize="small" />
                    )}
                  </IconButton>
                </Tooltip>

                <Tooltip title="Удалить">
                  <span style={{ visibility: template.createdBy?.id === 0 ? 'hidden' : 'visible' }}>
                    <IconButton
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteClick(template);
                      }}
                      size="small"
                      sx={{
                        padding: 0.5,
                        '& .MuiSvgIcon-root': {
                          fontSize: '1rem',
                          color: 'rgba(0, 0, 0, 0.54) !important',
                        },
                        '&:hover .MuiSvgIcon-root': {
                          color: 'rgba(0, 0, 0, 0.87) !important',
                        },
                      }}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </span>
                </Tooltip>
              </Box>
            </Box>

            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
              <Box>
                <Typography
                  variant="subtitle2"
                  color="textSecondary"
                  sx={{ mb: 0.25, fontSize: '0.7rem' }}>
                  Автор:
                </Typography>
                <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
                  {template.createdBy?.firstName || '—'}
                </Typography>
              </Box>

              <Box>
                <Typography
                  variant="subtitle2"
                  color="textSecondary"
                  sx={{ mb: 0.25, fontSize: '0.7rem' }}>
                  Создан:
                </Typography>
                <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
                  {template.createdAt}
                </Typography>
              </Box>

              <Box>
                <Typography
                  variant="subtitle2"
                  color="textSecondary"
                  sx={{ mb: 0.25, fontSize: '0.7rem' }}>
                  Тип:
                </Typography>
                <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
                  {template.templateType?.name
                    ? t(
                        TEMPLATE_TYPES_LABEL_MAP[template.templateType.name] ??
                          `templateTypes.${template.templateType.type ?? ''}`,
                        { defaultValue: template.templateType.name },
                      )
                    : '—'}
                </Typography>
              </Box>

              <Box>
                <Typography
                  variant="subtitle2"
                  color="textSecondary"
                  sx={{ mb: 0.25, fontSize: '0.7rem' }}>
                  Изменён:
                </Typography>
                <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
                  {template.lastModifiedAt || '—'}
                </Typography>
              </Box>
            </Box>
          </Paper>
        ))
      )}
    </Box>
  );
};
