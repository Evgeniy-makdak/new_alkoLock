import type { FC, ReactNode } from 'react';

import { Backdrop, CircularProgress, Stack, Typography } from '@mui/material';

import { ButtonFormWrapper } from '@shared/components/button_form_wrapper/ButtonFormWrapper';
import { testids } from '@shared/const/testid';
import type { ID } from '@shared/types/BaseQueryTypes';
import { Button } from '@shared/ui/button';

import { useRecoverUserForm } from '../hooks/useRecoverUserForm';

type RecoverUserFormProps = {
  user: { id: ID; text?: ReactNode };
  closeModal: () => void;
  closeAside: () => void;
};

export const RecoverUserForm: FC<RecoverUserFormProps> = ({ user, closeModal, closeAside }) => {
  const { handleRecover, isLoading } = useRecoverUserForm(user.id, closeModal, closeAside);

  return (
    <>
      <Backdrop sx={{ color: '#fff', zIndex: (theme) => theme.zIndex.modal + 1 }} open={isLoading}>
        <CircularProgress color="inherit" />
      </Backdrop>

      <Typography marginBottom={2} fontWeight={700} variant="h6">
        Восстановление пользователя
      </Typography>
      <Stack gap={3}>
        <Typography>
          Восстановить пользователя {user.text} ? Все связанные события также будут активированы.
        </Typography>
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
