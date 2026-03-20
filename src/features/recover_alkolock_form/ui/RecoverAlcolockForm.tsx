/* eslint-disable @typescript-eslint/no-explicit-any */
import type { FC } from 'react';
import React from 'react';
import { useTranslation } from 'react-i18next';

import { Backdrop, CircularProgress, Stack, Typography } from '@mui/material';

import { ButtonFormWrapper } from '@shared/components/button_form_wrapper/ButtonFormWrapper';
import { testids } from '@shared/const/testid';
import { reactNodeToPlainText } from '@shared/lib/reactNodeToPlainText';
import type { ID } from '@shared/types/BaseQueryTypes';
import { Button } from '@shared/ui/button';

import { useRecoverAlcolockForm } from '../hooks/useRecoverAlcolockForm';

type RecoverCarFormProps = {
  alcolock: { id: ID; text?: any };
  closeModal: () => void;
  closeAside: () => void;
};

export const RecoverAlcolockForm: FC<RecoverCarFormProps> = ({
  alcolock,
  closeModal,
  closeAside,
}) => {
  const { t } = useTranslation();
  const { handleRecover, isLoading } = useRecoverAlcolockForm(alcolock.id, closeModal, closeAside);

  let displayText = alcolock?.text;

  if (
    React.isValidElement(alcolock.text) &&
    Array.isArray((alcolock.text as React.ReactElement).props?.children) &&
    React.isValidElement((alcolock.text as React.ReactElement).props.children[4]) &&
    Array.isArray((alcolock.text as React.ReactElement).props.children[4].props?.children) &&
    React.isValidElement(
      (alcolock.text as React.ReactElement).props.children[4].props.children[1],
    ) &&
    (alcolock.text as React.ReactElement).props.children[4].props.children[1].props?.children ===
      '-'
  ) {
    displayText = <>{(alcolock.text as React.ReactElement).props.children.slice(0, 4)}</>;
  }

  return (
    <>
      <Backdrop sx={{ color: '#fff', zIndex: (theme) => theme.zIndex.modal + 1 }} open={isLoading}>
        <CircularProgress color="inherit" />
      </Backdrop>
      <Typography marginBottom={2} fontWeight={700} variant="h6">
        {t('modals.alcolockRecovery')}
      </Typography>
      <Stack gap={3}>
        <Typography>
          {t('modals.confirmRecoverAlcolock', { name: reactNodeToPlainText(displayText) })}
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
