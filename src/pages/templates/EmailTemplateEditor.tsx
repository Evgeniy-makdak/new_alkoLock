import React from 'react';

import { Dialog } from '@mui/material';

import { EmailTemplate } from '../templates/types';
import { EmailTemplateForm } from './EmailTemplateForm';

interface EmailTemplateEditorProps {
  open: boolean;
  template?: EmailTemplate | null;
  onSave: (
    template: Partial<EmailTemplate> | Omit<EmailTemplate, 'id' | 'createdBy' | 'createdAt'>,
  ) => void;
  onClose: () => void;
}

const EmailTemplateEditor: React.FC<EmailTemplateEditorProps> = ({
  open,
  template,
  onSave,
  onClose,
}) => {
  return (
    <Dialog
      open={open}
      onClose={(_, reason) => {
        if (reason === 'backdropClick' || reason === 'escapeKeyDown') return;
        onClose();
      }}
      disableEscapeKeyDown
      maxWidth="lg"
      fullWidth>
      <EmailTemplateForm template={template} onSave={onSave} onClose={onClose} />
    </Dialog>
  );
};

export default EmailTemplateEditor;
