import { useTranslation } from 'react-i18next';

import { Typography } from '@mui/material';

import { Button } from '@shared/ui/button';
import { Popup } from '@shared/ui/popup';

import composeStyles from './ReportComposeModal.module.scss';

type ReportEntityChangeConfirmDialogProps = {
  open: boolean;
  reportName: string;
  onConfirm: () => void;
  onCancel: () => void;
};

export function ReportEntityChangeConfirmDialog({
  open,
  reportName,
  onConfirm,
  onCancel,
}: ReportEntityChangeConfirmDialogProps) {
  const { t } = useTranslation();

  return (
    <Popup
      isOpen={open}
      headerTitle={t('reports.entityChangeConfirmTitle')}
      toggleModal={onCancel}
      onCloseModal={onCancel}
      body={
        <Typography variant="body1">
          {t('reports.entityChangeConfirmMessage', { name: reportName })}
        </Typography>
      }
      buttons={[
        <div key="actions" className={composeStyles.composeFooterButtons}>
          <Button onClick={onConfirm}>{t('common.yes')}</Button>
          <Button onClick={onCancel}>{t('common.cancel')}</Button>
        </div>,
      ]}
    />
  );
}
