import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import { Button, Dialog, DialogContent } from '@mui/material';

import styles from './OverflowTooltip.module.scss';

type MobileOverflowTextDialogProps = {
  open: boolean;
  text: string;
  onClose: () => void;
  /** Интерактивное содержимое (например кликабельный чип). Иначе показывается plain `text`. */
  content?: ReactNode;
};

export function MobileOverflowTextDialog({
  open,
  text,
  onClose,
  content,
}: MobileOverflowTextDialogProps) {
  const { t } = useTranslation();

  return (
    <Dialog open={open} onClose={onClose} className={styles.mobileValueDialog} fullWidth>
      <DialogContent className={styles.mobileValueDialogContent}>
        <div className={styles.mobileValueDialogText}>{content ?? text}</div>
      </DialogContent>
      <div className={styles.mobileValueDialogActions}>
        <Button variant="outlined" className={styles.mobileValueDialogButton} onClick={onClose}>
          {t('common.close')}
        </Button>
      </div>
    </Dialog>
  );
}
