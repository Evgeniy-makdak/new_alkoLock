import type { FC, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import { Backdrop, CircularProgress, Stack, Typography } from '@mui/material';

import { ButtonFormWrapper } from '@shared/components/button_form_wrapper/ButtonFormWrapper';
import { testids } from '@shared/const/testid';
import { reactNodeToPlainText } from '@shared/lib/reactNodeToPlainText';
import type { ID } from '@shared/types/BaseQueryTypes';
import { Button } from '@shared/ui/button';

import { useRecoverMailingsForm } from '../hooks/useRecoverMailingsForm';

type RecoverMailingsFormProps = {
  mailing: { id: ID; text?: ReactNode } | null;
  closeModal: () => void;
  closeAside: () => void;
};

const RecoverMailingsFormInner: FC<{
  mailing: { id: ID; text?: ReactNode };
  closeModal: () => void;
  closeAside: () => void;
}> = ({ mailing, closeModal, closeAside }) => {
  const { t } = useTranslation();
  const { handleRecover, isLoading } = useRecoverMailingsForm(mailing.id, closeModal, closeAside);

  return (
    <>
      <Backdrop sx={{ color: '#fff', zIndex: (theme) => theme.zIndex.modal + 1 }} open={isLoading}>
        <CircularProgress color="inherit" />
      </Backdrop>

      <Typography marginBottom={2} fontWeight={700} variant="h6">
        {t('modals.mailingRecovery')}
      </Typography>
      <Stack gap={3}>
        <Typography>
          {t('modals.confirmRecoverMailing', { name: reactNodeToPlainText(mailing.text) })}
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

export const RecoverMailingsForm: FC<RecoverMailingsFormProps> = ({
  mailing,
  closeModal,
  closeAside,
}) => {
  if (!mailing) return null;
  return (
    <RecoverMailingsFormInner mailing={mailing} closeModal={closeModal} closeAside={closeAside} />
  );
};
