import type { FC, ReactNode } from 'react';

import { Stack, Typography } from '@mui/material';

import { ButtonFormWrapper } from '@shared/components/button_form_wrapper/ButtonFormWrapper';
import { testids } from '@shared/const/testid';
import type { ID } from '@shared/types/BaseQueryTypes';
import { Button } from '@shared/ui/button';

import { useTrueDeleteMailingsForm } from '../hooks/useTrueDeleteMailingsForm';

type TrueDeleteMailingsForm = {
  mailing: { id: ID; text?: ReactNode };
  closeModal: () => void;
  closeAside: () => void;
};

export const TrueDeleteMailingsForm: FC<TrueDeleteMailingsForm> = ({
  mailing,
  closeModal,
  closeAside,
}) => {
  const onTrueDelete = useTrueDeleteMailingsForm(mailing.id, closeModal, closeAside);
  return (
    <>
      <Typography marginBottom={2} fontWeight={700} variant="h6">
        Удаление рассылки
      </Typography>
      <Stack gap={3}>
        <Typography>Вы действительно хотите удалить рассылку {mailing.text} ?</Typography>
        <ButtonFormWrapper>
          <Button testid={`${testids.POPUP_ACTION_BUTTON}`} onClick={onTrueDelete}>
            да
          </Button>
          <Button testid={`${testids.POPUP_CANCEL_BUTTON}`} onClick={closeModal}>
            нет
          </Button>
        </ButtonFormWrapper>
      </Stack>
    </>
  );
};
