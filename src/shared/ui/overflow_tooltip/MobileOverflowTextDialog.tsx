import { useTranslation } from 'react-i18next';

import { Button, Dialog, DialogContent } from '@mui/material';

import styles from './OverflowTooltip.module.scss';

type MobileOverflowTextDialogProps = {
  open: boolean;
  text: string;
  onClose: () => void;
};

export function MobileOverflowTextDialog({ open, text, onClose }: MobileOverflowTextDialogProps) {
  const { t } = useTranslation();

  return (
    <Dialog open={open} onClose={onClose} className={styles.mobileValueDialog} fullWidth>
      <DialogContent className={styles.mobileValueDialogContent}>
        <div className={styles.mobileValueDialogText}>{text}</div>
      </DialogContent>
      <div className={styles.mobileValueDialogActions}>
        <Button variant="outlined" className={styles.mobileValueDialogButton} onClick={onClose}>
          {t('common.close')}
        </Button>
      </div>
    </Dialog>
  );
}
