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

interface ResetConfirmationDialogProps {
  open: boolean;
  settingName?: string;
  onClose: () => void;
  onConfirm: () => void;
}

const ResetConfirmationDialog: React.FC<ResetConfirmationDialogProps> = ({
  open,
  settingName,
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
          {t('modals.resetConfirm')}
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            {t('modals.confirmResetParameter', { name: settingName ?? '' })}
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
            {t('modals.apply')}
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
            {t('modals.cancel')}
          </Button>
        </DialogActions>
      </Dialog>
    </Backdrop>
  );
};

export default ResetConfirmationDialog;
