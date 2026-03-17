import React from 'react';
import { useTranslation } from 'react-i18next';

import {
  Backdrop,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
} from '@mui/material';

import { EmailTemplate } from '../templates/types';

interface DeleteConfirmationDialogProps {
  open: boolean;
  template?: EmailTemplate;
  onClose: () => void;
  onConfirm: () => void;
}

const DeleteConfirmationDialog: React.FC<DeleteConfirmationDialogProps> = ({
  open,
  template,
  onClose,
  onConfirm,
}) => {
  const { t } = useTranslation();

  return (
    <Backdrop open={open} sx={{ zIndex: 1300, color: '#fff' }}>
      <Dialog
        open={open}
        maxWidth="md"
        fullWidth
        onClick={(e) => e.stopPropagation()}
        sx={{
          '& .MuiDialog-paper': {
            borderRadius: '16px',
            padding: '10px',
            height: '220px',
            position: 'relative',
            zIndex: 1400,
          },
        }}>
        <DialogTitle
          sx={{
            color: 'black',
            fontWeight: '900',
            fontSize: '20px',
            textShadow: '2px 2px 4px rgba(0, 0, 0, 0.3)',
          }}>
          {t('modals.templateDeletionConfirm')}
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            {t('modals.confirmDeleteTemplate', { name: template?.name })}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={onConfirm}
            color="inherit"
            sx={{
              width: '100px',
              borderRadius: '6px',
              border: '1px solid #494646',
              marginRight: '16px',
            }}>
            {t('modals.yes')}
          </Button>
          <Button
            onClick={onClose}
            color="inherit"
            sx={{
              width: '100px',
              borderRadius: '6px',
              border: '1px solid #494646',
              marginRight: '16px',
            }}>
            {t('modals.no')}
          </Button>
        </DialogActions>
      </Dialog>
    </Backdrop>
  );
};

export default DeleteConfirmationDialog;
