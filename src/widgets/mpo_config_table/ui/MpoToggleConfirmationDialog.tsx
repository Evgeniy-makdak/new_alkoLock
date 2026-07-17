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

type MpoToggleConfirmationDialogProps = {
  open: boolean;
  featureName: string;
  nextEnabled: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isSubmitting?: boolean;
};

export const MpoToggleConfirmationDialog = ({
  open,
  featureName,
  nextEnabled,
  onClose,
  onConfirm,
  isSubmitting = false,
}: MpoToggleConfirmationDialogProps) => {
  const { t } = useTranslation();

  const bodyKey = nextEnabled ? 'mpoConfigPage.toggleEnableBody' : 'mpoConfigPage.toggleDisableBody';
  const confirmKey = nextEnabled ? 'mpoConfigPage.toggleEnable' : 'mpoConfigPage.toggleDisable';

  return (
    <Backdrop open={open} sx={{ zIndex: 1300, color: '#fff' }}>
      <Dialog
        open={open}
        maxWidth="sm"
        fullWidth
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
          {t('mpoConfigPage.toggleManageTitle')}
        </DialogTitle>
        <DialogContent>
          <DialogContentText>{t(bodyKey, { name: featureName })}</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={onConfirm}
            color="inherit"
            disabled={isSubmitting}
            sx={{
              minWidth: 100,
              borderRadius: '6px',
              border: '1px solid #494646',
              marginRight: '8px',
            }}>
            {t(confirmKey)}
          </Button>
          <Button
            onClick={onClose}
            color="inherit"
            disabled={isSubmitting}
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
