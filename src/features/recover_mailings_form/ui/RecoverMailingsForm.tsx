import type { FC, ReactNode } from 'react';

import { Backdrop, CircularProgress, Stack, Typography } from '@mui/material';

import { ButtonFormWrapper } from '@shared/components/button_form_wrapper/ButtonFormWrapper';
import { testids } from '@shared/const/testid';
import type { ID } from '@shared/types/BaseQueryTypes';
import { Button } from '@shared/ui/button';

import { useRecoverMailingsForm } from '../hooks/useRecoverMailingsForm';

type RecoverMailingsFormProps = {
  mailing: { id: ID; text?: ReactNode };
  closeModal: () => void;
  closeAside: () => void;
};

export const RecoverMailingsForm: FC<RecoverMailingsFormProps> = ({
  mailing,
  closeModal,
  closeAside,
}) => {
  const { handleRecover, isLoading } = useRecoverMailingsForm(mailing.id, closeModal, closeAside);

  return (
    <>
      <Backdrop sx={{ color: '#fff', zIndex: (theme) => theme.zIndex.modal + 1 }} open={isLoading}>
        <CircularProgress color="inherit" />
      </Backdrop>

      <Typography marginBottom={2} fontWeight={700} variant="h6">
        Восстановление рассылки
      </Typography>
      <Stack gap={3}>
        <Typography>Восстановить рассылку {mailing.text}?</Typography>
        <ButtonFormWrapper>
          <Button
            testid={`${testids.POPUP_ACTION_BUTTON}`}
            onClick={handleRecover}
            disabled={isLoading}>
            да
          </Button>
          <Button
            testid={`${testids.POPUP_CANCEL_BUTTON}`}
            onClick={closeModal}
            disabled={isLoading}>
            нет
          </Button>
        </ButtonFormWrapper>
      </Stack>
    </>
  );
};
