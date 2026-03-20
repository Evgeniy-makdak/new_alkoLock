import type { FC, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import { Stack, Typography } from '@mui/material';

import { ButtonFormWrapper } from '@shared/components/button_form_wrapper/ButtonFormWrapper';
import { testids } from '@shared/const/testid';
import { reactNodeToPlainText } from '@shared/lib/reactNodeToPlainText';
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
  const { t } = useTranslation();
  const onTrueDelete = useTrueDeleteMailingsForm(mailing.id, closeModal, closeAside);
  return (
    <>
      <Typography marginBottom={2} fontWeight={700} variant="h6">
        {t('modals.mailingDeletion')}
      </Typography>
      <Stack gap={3}>
        <Typography>
          {t('modals.confirmDeleteMailing', { name: reactNodeToPlainText(mailing.text) })}
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
