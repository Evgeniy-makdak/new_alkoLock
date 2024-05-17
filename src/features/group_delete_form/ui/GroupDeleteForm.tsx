import type { FC } from 'react';

import { Stack, Typography } from '@mui/material';

import { ButtonFormWrapper } from '@shared/components/button_form_wrapper/ButtonFormWrapper';
import { testids } from '@shared/const/testid';
import type { ID } from '@shared/types/BaseQueryTypes';
import { Button } from '@shared/ui/button';

import { useGroupDeleteForm } from '../hooks/useGroupDeleteForm';

type GroupDeleteFormProps = {
  closeModal: () => void;
  branch: { id: ID; text: string };
};

export const GroupDeleteForm: FC<GroupDeleteFormProps> = ({ branch, closeModal }) => {
  const { handleDelete } = useGroupDeleteForm(branch.id, closeModal);
  return (
    <div>
      <Typography marginBottom={3} fontWeight={700} variant="h6">
        Удаление группы
      </Typography>
      <Stack gap={3}>
        <Typography>
          Вы действительно хотите удалить группу <b>{branch.text}?</b>
        </Typography>
        <ButtonFormWrapper>
          <Button testid={`${testids.POPUP_ACTION_BUTTON}`} onClick={handleDelete}>
            удалить
          </Button>
          <Button testid={`${testids.POPUP_CANCEL_BUTTON}`} onClick={closeModal}>
            отмена
          </Button>
        </ButtonFormWrapper>
      </Stack>
    </div>
  );
};
