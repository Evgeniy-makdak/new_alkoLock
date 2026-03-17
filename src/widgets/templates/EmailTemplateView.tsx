import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

import { Backdrop, Box, Button, TextField } from '@mui/material';

import { TEMPLATE_TYPES_LABEL_MAP } from '@shared/lib/templateTypesLabelMap';

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
    <Backdrop open={true} sx={{ zIndex: 1300, color: '#fff' }}>
      <Box
        onClick={(e) => e.stopPropagation()}
        sx={{
          p: 2,
          width: '50%',
          maxWidth: 'none',
          backgroundColor: 'white',
          borderRadius: '8px',
          boxShadow: 3,
          display: 'flex',
          flexDirection: 'column',
        }}>
        <TextField
          label={t('form.templateName')}
          fullWidth
          margin="normal"
          value={template.name}
          disabled
        />
        <TextField
          label={t('tables.templateType')}
          fullWidth
          margin="normal"
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
        <ReactQuill
          value={template.content}
          readOnly
          modules={{ toolbar: false }}
          theme="snow"
          style={{
            height: '300px',
            minHeight: '200px',
            width: '100%',
            color: 'black',
          }}
        />

        <Box sx={{ mt: 7, display: 'flex', justifyContent: 'flex-end' }}>
          <Button variant="outlined" onClick={onClose}>
            {t('common.close')}
          </Button>
        </Box>
      </Box>
    </Backdrop>
  );
};
