import type { FC, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import { Stack, Typography } from '@mui/material';

import { ButtonFormWrapper } from '@shared/components/button_form_wrapper/ButtonFormWrapper';
import { testids } from '@shared/const/testid';
import { reactNodeToPlainText } from '@shared/lib/reactNodeToPlainText';
import type { ID } from '@shared/types/BaseQueryTypes';
import { Button } from '@shared/ui/button';

import { useTrueDeleteUserForm } from '../hooks/useTrueDeleteUserForm';

type TrueDeleteUserFormProps = {
  user: { id: ID; text?: ReactNode } | null;
  closeModal: () => void;
  closeAside: () => void;
};

const TrueDeleteUserFormInner: FC<{
  user: { id: ID; text?: ReactNode };
  closeModal: () => void;
  closeAside: () => void;
}> = ({ user, closeModal, closeAside }) => {
  const { t } = useTranslation();
  const onTrueDelete = useTrueDeleteUserForm(user.id, closeModal, closeAside);
  return (
    <>
      <Typography marginBottom={2} fontWeight={700} variant="h6">
        {t('modals.userDeletion')}
      </Typography>
      <Stack gap={3}>
        <Typography>
          {t('modals.confirmDeleteUser', { name: reactNodeToPlainText(user.text) })}
        </Typography>
        <ButtonFormWrapper>
          <Button testid={`${testids.POPUP_ACTION_BUTTON}`} onClick={onTrueDelete}>
            {t('modals.yes')}
          </Button>
          <Button testid={`${testids.POPUP_CANCEL_BUTTON}`} onClick={closeModal}>
            {t('modals.no')}
          </Button>
        </ButtonFormWrapper>
      </Stack>
    </>
  );
};

export const TrueDeleteUserForm: FC<TrueDeleteUserFormProps> = ({
  user,
  closeModal,
  closeAside,
}) => {
  if (!user) return null;
  return <TrueDeleteUserFormInner user={user} closeModal={closeModal} closeAside={closeAside} />;
};
