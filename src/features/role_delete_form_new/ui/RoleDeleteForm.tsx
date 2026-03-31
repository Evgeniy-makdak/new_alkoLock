import type { FC, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import { Typography } from '@mui/material';

import { ButtonFormWrapper } from '@shared/components/button_form_wrapper/ButtonFormWrapper';
import { testids } from '@shared/const/testid';
import { reactNodeToPlainText } from '@shared/lib/reactNodeToPlainText';
import type { ID } from '@shared/types/BaseQueryTypes';
import { Button } from '@shared/ui/button';

import { useRoleDeleteForm } from '../hooks/useRoleDeleteForm';

type RoleDeleteFormProps = {
  closeModal: () => void;
  role: { id: ID; text: ReactNode } | null;
};

const RoleDeleteFormInner: FC<{
  role: { id: ID; text: ReactNode };
  closeModal: () => void;
}> = ({ role, closeModal }) => {
  const { t } = useTranslation();
  const { handleDelete } = useRoleDeleteForm(role.id, closeModal);
  return (
    <div>
      <Typography marginBottom={3} fontWeight={700} variant="h6">
        {t('modals.roleDeletion')}
      </Typography>
      <Typography>
        {t('modals.confirmDeleteRole', { name: reactNodeToPlainText(role.text) })}
      </Typography>
      <ButtonFormWrapper>
        <Button testid={`${testids.POPUP_ACTION_BUTTON}`} onClick={handleDelete}>
          {t('modals.delete')}
        </Button>
        <Button testid={`${testids.POPUP_CANCEL_BUTTON}`} onClick={closeModal}>
          {t('modals.cancel')}
        </Button>
      </ButtonFormWrapper>
    </div>
  );
};

export const RoleDeleteForm: FC<RoleDeleteFormProps> = ({ role, closeModal }) => {
  if (!role) return null;
  return <RoleDeleteFormInner role={role} closeModal={closeModal} />;
};
