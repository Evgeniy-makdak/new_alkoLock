import type { FC, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import { Backdrop, CircularProgress, Stack, Typography } from '@mui/material';

import { ButtonFormWrapper } from '@shared/components/button_form_wrapper/ButtonFormWrapper';
import { testids } from '@shared/const/testid';
import type { ID } from '@shared/types/BaseQueryTypes';
import { Button } from '@shared/ui/button';

import { useDeleteCarForm } from '../hooks/useDeleteCarForm';

type DeleteCarFormProps = {
  car: { id: ID; text: ReactNode };
  closeModal: () => void;
};

export const DeleteCarForm: FC<DeleteCarFormProps> = ({ car, closeModal }) => {
  const { t } = useTranslation();
  const { handleDelete, isLoading } = useDeleteCarForm(car.id, closeModal);
  return (
    <div>
      <Backdrop sx={{ color: '#fff', zIndex: (theme) => theme.zIndex.modal + 1 }} open={isLoading}>
        <CircularProgress color="inherit" />
      </Backdrop>
      <Typography marginBottom={2} fontWeight={700} variant="h6">
        {t('modals.vehicleDeactivation')}
      </Typography>
      <Stack gap={3}>
        <Typography>{t('modals.confirmDeactivateVehicle', { name: car.text })}</Typography>
        <ButtonFormWrapper>
          <Button
            testid={`${testids.POPUP_ACTION_BUTTON}`}
            onClick={handleDelete}
            disabled={isLoading}>
            {t('modals.yes')}
          </Button>
          <Button
            testid={`${testids.POPUP_CANCEL_BUTTON}`}
            onClick={closeModal}
            disabled={isLoading}>
            {t('modals.no')}
          </Button>
        </ButtonFormWrapper>
      </Stack>
    </div>
  );
};
