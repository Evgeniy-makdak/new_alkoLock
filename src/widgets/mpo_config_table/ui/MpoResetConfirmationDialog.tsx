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

type MpoResetConfirmationDialogProps = {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isResetting?: boolean;
};

export const MpoResetConfirmationDialog = ({
  open,
  onClose,
  onConfirm,
  isResetting = false,
}: MpoResetConfirmationDialogProps) => {
  const { t } = useTranslation();

  return (
    <Backdrop open={open} sx={{ zIndex: 1300, color: '#fff' }}>
      <Dialog
        open={open}
        maxWidth="sm"
        fullWidth
        onClose={(_, reason) => {
          if (reason === 'backdropClick' || reason === 'escapeKeyDown') return;
          onClose();
        }}
        disableEscapeKeyDown
        onClick={(e) => e.stopPropagation()}
        sx={{
          '& .MuiDialog-paper': {
            borderRadius: '16px',
            padding: '10px',
            position: 'relative',
            zIndex: 1400,
          },
        }}>
        <DialogTitle sx={{ fontWeight: 700, fontSize: '1.1rem' }}>
          {t('mpoConfigPage.resetToDefaults')}
        </DialogTitle>
        <DialogContent>
          <DialogContentText>{t('mpoConfigPage.resetConfirm')}</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={onConfirm}
            color="inherit"
            disabled={isResetting}
            sx={{
              minWidth: 100,
              borderRadius: '6px',
              border: '1px solid #494646',
              marginRight: '8px',
            }}>
            {t('common.confirm')}
          </Button>
          <Button
            onClick={onClose}
            color="inherit"
            disabled={isResetting}
            sx={{
              minWidth: 100,
              borderRadius: '6px',
              border: '1px solid #494646',
            }}>
            {t('common.cancel')}
          </Button>
        </DialogActions>
      </Dialog>
    </Backdrop>
  );
};
