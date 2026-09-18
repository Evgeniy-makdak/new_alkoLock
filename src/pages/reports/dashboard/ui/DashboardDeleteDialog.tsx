import { Stack, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';

import { ButtonFormWrapper } from '@shared/components/button_form_wrapper/ButtonFormWrapper';
import { Button } from '@shared/ui/button';
import { Popup } from '@shared/ui/popup';

type Props = {
  open: boolean;
  dashboardName: string;
  onConfirm: () => void;
  onClose: () => void;
  isDeleting?: boolean;
};

export function DashboardDeleteDialog({
  open,
  dashboardName,
  onConfirm,
  onClose,
  isDeleting = false,
}: Props) {
  const { t } = useTranslation();

  return (
    <Popup
      isOpen={open}
      toggleModal={onClose}
      onCloseModal={onClose}
      body={
        <Stack maxWidth={480} gap={2}>
          <Typography variant="h6" fontWeight={700}>
            {t('reports.dashboard.deleteTitle', { defaultValue: 'Удаление дашборда' })}
          </Typography>
          <Typography>
            {t('reports.dashboard.confirmDelete', {
              defaultValue: 'Удалить дашборд «{{name}}»?',
              name: dashboardName,
            }).replace('{{name}}', dashboardName)}
          </Typography>
          <ButtonFormWrapper>
            <Button onClick={onConfirm} disabled={isDeleting} isLoading={isDeleting}>
              {t('modals.yes', { defaultValue: 'Да' })}
            </Button>
            <Button onClick={onClose} disabled={isDeleting}>
              {t('modals.no', { defaultValue: 'Нет' })}
            </Button>
          </ButtonFormWrapper>
        </Stack>
      }
    />
  );
}
