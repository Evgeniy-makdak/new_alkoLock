import type { FC, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import { Backdrop, CircularProgress, Stack, Typography } from '@mui/material';

import { ButtonFormWrapper } from '@shared/components/button_form_wrapper/ButtonFormWrapper';
import { testids } from '@shared/const/testid';
import { reactNodeToPlainText } from '@shared/lib/reactNodeToPlainText';
import type { ID } from '@shared/types/BaseQueryTypes';
import { Button } from '@shared/ui/button';

import { useRecoverCarForm } from '../hooks/useRecoverCarForm';

type RecoverCarFormProps = {
  car: { id: ID; text?: ReactNode } | null;
  closeModal: () => void;
  closeAside: () => void;
};

const RecoverCarFormInner: FC<{
  car: { id: ID; text?: ReactNode };
  closeModal: () => void;
  closeAside: () => void;
}> = ({ car, closeModal, closeAside }) => {
  const { t } = useTranslation();
  const { handleRecover, isLoading } = useRecoverCarForm(car.id, closeModal, closeAside);
  return (
    <>
      <Backdrop sx={{ color: '#fff', zIndex: (theme) => theme.zIndex.modal + 1 }} open={isLoading}>
        <CircularProgress color="inherit" />
      </Backdrop>
      <Typography marginBottom={2} fontWeight={700} variant="h6">
        {t('modals.vehicleRecovery')}
      </Typography>
      <Stack gap={3}>
        <Typography>
          {t('modals.confirmRecoverVehicle', { name: reactNodeToPlainText(car.text) })}
        </Typography>
        <ButtonFormWrapper>
          <Button
            testid={`${testids.POPUP_ACTION_BUTTON}`}
            onClick={handleRecover}
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
    </>
  );
};

export const RecoverCarForm: FC<RecoverCarFormProps> = ({ car, closeModal, closeAside }) => {
  if (!car) return null;
  return <RecoverCarFormInner car={car} closeModal={closeModal} closeAside={closeAside} />;
};
