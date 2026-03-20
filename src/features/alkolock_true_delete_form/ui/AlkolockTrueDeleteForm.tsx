/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react';
import { useTranslation } from 'react-i18next';

import { Backdrop, CircularProgress, Stack, Typography } from '@mui/material';

import { ButtonFormWrapper } from '@shared/components/button_form_wrapper/ButtonFormWrapper';
import { testids } from '@shared/const/testid';
import { reactNodeToPlainText } from '@shared/lib/reactNodeToPlainText';
import type { ID } from '@shared/types/BaseQueryTypes';
import { Button } from '@shared/ui/button';

import { useAlkolockTrueDeleteForm } from '../hooks/useAlkolockTrueDeleteForm';

export const AlkolockTrueDeleteForm = ({
  alkolock,
  closeTrueDeleteModal,
}: {
  alkolock: { id: ID; text: any };
  closeTrueDeleteModal: () => void;
}) => {
  const { t } = useTranslation();
  const { onTrueDelete, isLoading } = useAlkolockTrueDeleteForm(alkolock?.id, closeTrueDeleteModal);

  const displayText = alkolock?.text;

  return (
    <>
      <Backdrop sx={{ color: '#fff', zIndex: (theme) => theme.zIndex.modal + 1 }} open={isLoading}>
        <CircularProgress color="inherit" />
      </Backdrop>
      <Stack maxWidth={'600px'} gap={1}>
        <Typography variant="h6" fontWeight={700}>
          {t('modals.alcolockDeletion')}
        </Typography>
        <Typography>
          {t('modals.confirmDeleteAlcolock', { name: reactNodeToPlainText(displayText) })}
        </Typography>
        <ButtonFormWrapper>
          <Button
            testid={`${testids.POPUP_ACTION_BUTTON}`}
            onClick={onTrueDelete}
            disabled={isLoading}>
            {t('modals.yes')}
          </Button>
          <Button
            testid={`${testids.POPUP_CANCEL_BUTTON}`}
            onClick={closeTrueDeleteModal}
            disabled={isLoading}>
            {t('modals.no')}
          </Button>
        </ButtonFormWrapper>
      </Stack>
    </>
  );
};
