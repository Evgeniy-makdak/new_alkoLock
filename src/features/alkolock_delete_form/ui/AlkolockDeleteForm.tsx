/* eslint-disable @typescript-eslint/no-explicit-any */
import type { FC } from 'react';
import { useTranslation } from 'react-i18next';

import { Backdrop, CircularProgress, Stack, Typography } from '@mui/material';

import { ButtonFormWrapper } from '@shared/components/button_form_wrapper/ButtonFormWrapper';
import { testids } from '@shared/const/testid';
import { reactNodeToPlainText } from '@shared/lib/reactNodeToPlainText';
import type { ID } from '@shared/types/BaseQueryTypes';
import { Button } from '@shared/ui/button';

import { useAlkolockDeleteForm } from '../hooks/useAlkolockDeleteForm';

type AlkolockDeleteFormProps = {
  alkolock: { id: ID; text: any } | null;
  closeDeleteModal: () => void;
};

const AlkolockDeleteFormInner: FC<{
  alkolock: { id: ID; text: any };
  closeDeleteModal: () => void;
}> = ({ alkolock, closeDeleteModal }) => {
  const { t } = useTranslation();
  const { handleDelete, isLoading } = useAlkolockDeleteForm(alkolock.id, closeDeleteModal);

  const displayText = alkolock.text;

  return (
    <>
      <Backdrop sx={{ color: '#fff', zIndex: (theme) => theme.zIndex.modal + 1 }} open={isLoading}>
        <CircularProgress color="inherit" />
      </Backdrop>
      <Stack maxWidth={'600px'} gap={1}>
        <Typography variant="h6" fontWeight={700}>
          {t('modals.alcolockDeactivation')}
        </Typography>
        <Typography>
          {t('modals.confirmDeactivateAlcolock', { name: reactNodeToPlainText(displayText) })}
        </Typography>
        <ButtonFormWrapper>
          <Button
            testid={`${testids.POPUP_ACTION_BUTTON}`}
            onClick={handleDelete}
            disabled={isLoading}>
            {t('modals.yes')}
          </Button>
          <Button
            testid={`${testids.POPUP_CANCEL_BUTTON}`}
            onClick={closeDeleteModal}
            disabled={isLoading}>
            {t('modals.no')}
          </Button>
        </ButtonFormWrapper>
      </Stack>
    </>
  );
};

export const AlkolockDeleteForm: FC<AlkolockDeleteFormProps> = ({ alkolock, closeDeleteModal }) => {
  if (!alkolock) return null;
  return <AlkolockDeleteFormInner alkolock={alkolock} closeDeleteModal={closeDeleteModal} />;
};
