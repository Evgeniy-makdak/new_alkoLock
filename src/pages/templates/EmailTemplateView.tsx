import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

import CloseIcon from '@mui/icons-material/Close';
import {
  Backdrop,
  Box,
  FormControl,
  IconButton,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';

import { ButtonFormWrapper } from '@shared/components/button_form_wrapper/ButtonFormWrapper';
import { TEMPLATE_TYPES_LABEL_MAP } from '@shared/lib/templateTypesLabelMap';
import { Button } from '@shared/ui/button';

import { EmailTemplate } from '../templates/types';

interface EmailTemplateViewProps {
  template: EmailTemplate;
  onClose: () => void;
}

export const EmailTemplateView: React.FC<EmailTemplateViewProps> = ({ template, onClose }) => {
  const { t } = useTranslation();
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  return (
    <Backdrop
      open={true}
      sx={{
        zIndex: 1300,
        backgroundColor: (theme) =>
          theme.palette.mode === 'dark' ? 'rgba(0, 0, 0, 0.72)' : 'rgba(0, 0, 0, 0.5)',
      }}>
      <Box
        onClick={(e) => e.stopPropagation()}
        sx={{
          p: 3.5,
          width: '100%',
          maxWidth: 720,
          minWidth: { xs: 280, sm: 550 },
          display: 'flex',
          flexDirection: 'column',
          bgcolor: 'background.paper',
          color: 'text.primary',
          borderRadius: '16px',
          boxShadow: 3,
          maxHeight: '99vh',
          overflow: 'auto',
        }}>
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            gap: 1,
            mb: 2,
          }}>
          <Typography fontWeight={600} variant="h6" color="text.primary" sx={{ flex: 1, pr: 1 }}>
            {t('modals.viewTemplate')}
          </Typography>
          <Tooltip title={t('common.closeWindow')}>
            <IconButton
              edge="end"
              onClick={onClose}
              aria-label="close"
              sx={{
                mt: -0.5,
                color: 'text.secondary',
                '&:hover': {
                  backgroundColor: 'action.hover',
                  color: 'text.primary',
                },
              }}>
              <CloseIcon />
            </IconButton>
          </Tooltip>
        </Box>

        <Stack gap={3}>
          <TextField label={t('form.templateName')} fullWidth value={template.name} disabled />
          <TextField
            label={t('tables.templateType')}
            fullWidth
            value={
              template.templateType?.name
                ? t(
                    TEMPLATE_TYPES_LABEL_MAP[template.templateType.name] ??
                      `templateTypes.${template.templateType.type ?? ''}`,
                    { defaultValue: template.templateType.name },
                  )
                : ''
            }
            disabled
          />
          <FormControl fullWidth>
            <Box
              sx={{
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: '8px',
                overflow: 'hidden',
                '& .quill': {
                  border: 'none !important',
                },
                '& .ql-toolbar': {
                  display: 'none',
                },
                '& .ql-container': {
                  border: 'none !important',
                  height: 'auto !important',
                  fontSize: '1rem',
                },
                '& .ql-editor': {
                  color: 'text.primary',
                  minHeight: 196,
                },
                '& .ql-stroke': {
                  stroke: (theme) => theme.palette.text.primary,
                },
                '& .ql-fill': {
                  fill: (theme) => theme.palette.text.primary,
                },
              }}>
              <ReactQuill
                value={template.content}
                readOnly
                modules={{ toolbar: false }}
                theme="snow"
                style={{
                  height: '300px',
                  minHeight: '200px',
                  width: '100%',
                }}
              />
            </Box>
          </FormControl>

          <ButtonFormWrapper>
            <Button type="button" onClick={onClose}>
              {t('common.close')}
            </Button>
          </ButtonFormWrapper>
        </Stack>
      </Box>
    </Backdrop>
  );
};
