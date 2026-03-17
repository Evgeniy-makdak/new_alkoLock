/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react';

import { Backdrop, CircularProgress, Stack, Typography } from '@mui/material';

import { ButtonFormWrapper } from '@shared/components/button_form_wrapper/ButtonFormWrapper';
import { testids } from '@shared/const/testid';
import type { ID } from '@shared/types/BaseQueryTypes';
import { Button } from '@shared/ui/button';

import { useAlkolockDeleteForm } from '../hooks/useAlkolockDeleteForm';

export const AlkolockDeleteForm = ({
  alkolock,
  closeDeleteModal,
}: {
  alkolock: { id: ID; text: any };
  closeDeleteModal: () => void;
}) => {
  const { handleDelete, isLoading } = useAlkolockDeleteForm(alkolock?.id, closeDeleteModal);

  const displayText = alkolock?.text;

  return (
    <>
      <Backdrop sx={{ color: '#fff', zIndex: (theme) => theme.zIndex.modal + 1 }} open={isLoading}>
        <CircularProgress color="inherit" />
      </Backdrop>
      <Stack maxWidth={'600px'} gap={1}>
        <Typography variant="h6" fontWeight={700}>
          Деактивация Алкозамка
        </Typography>
        <Typography>Вы действительно хотите деактивировать Алкозамок {displayText}?</Typography>
        <ButtonFormWrapper>
          <Button
            testid={`${testids.POPUP_ACTION_BUTTON}`}
            onClick={handleDelete}
            disabled={isLoading}>
            да
          </Button>
          <Button
            testid={`${testids.POPUP_CANCEL_BUTTON}`}
            onClick={closeDeleteModal}
            disabled={isLoading}>
            нет
          </Button>
        </ButtonFormWrapper>
      </Stack>
    </>
  );
};
