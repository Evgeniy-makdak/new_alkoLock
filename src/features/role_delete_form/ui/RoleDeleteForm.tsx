import type { FC, ReactNode } from 'react';

import { Typography } from '@mui/material';

import { ButtonFormWrapper } from '@shared/components/button_form_wrapper/ButtonFormWrapper';
import { testids } from '@shared/const/testid';
import type { ID } from '@shared/types/BaseQueryTypes';
import { Button } from '@shared/ui/button';

import { useRoleDeleteForm } from '../hooks/useRoleDeleteForm';

type RoleDeleteFormProps = {
  closeModal: () => void;
  role: { id: ID; text: ReactNode };
};

export const RoleDeleteForm: FC<RoleDeleteFormProps> = ({ role, closeModal }) => {
  const { handleDelete } = useRoleDeleteForm(role.id, closeModal);
  return (
    <div>
      <Typography marginBottom={3} fontWeight={700} variant="h6">
        Удаление роли
      </Typography>
      <Typography>
        Вы действительно хотите удалить роль <b>{role.text}?</b>
      </Typography>
      <ButtonFormWrapper>
        <Button testid={`${testids.POPUP_ACTION_BUTTON}`} onClick={handleDelete}>
          удалить
        </Button>
        <Button testid={`${testids.POPUP_CANCEL_BUTTON}`} onClick={closeModal}>
          отмена
        </Button>
      </ButtonFormWrapper>
    </div>
  );
};
