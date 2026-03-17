import type { FC } from 'react';
import { useTranslation } from 'react-i18next';

import { Stack, Typography } from '@mui/material';

import { ButtonFormWrapper } from '@shared/components/button_form_wrapper/ButtonFormWrapper';
import { testids } from '@shared/const/testid';
import { SelectedBranchState } from '@shared/model/app_store/AppStore';
import type { ID } from '@shared/types/BaseQueryTypes';
import { Button } from '@shared/ui/button';

import { useGroupDeleteForm } from '../hooks/useGroupDeleteForm';

type GroupDeleteFormProps = {
  closeModal: () => void;
  branch: { id: ID; text: string };
  setState: (data: { selectedBranchState?: SelectedBranchState }) => void;
};

export const GroupDeleteForm: FC<GroupDeleteFormProps> = ({ branch, closeModal, setState }) => {
  const { t } = useTranslation();
  const { handleDelete } = useGroupDeleteForm(branch.id, closeModal, setState);
  return (
    <div>
      <Typography marginBottom={3} fontWeight={700} variant="h6">
        {t('modals.groupDeletion')}
      </Typography>
      <Stack gap={3}>
        <Typography>{t('modals.confirmDeleteGroup', { name: branch.text })}</Typography>
        <ButtonFormWrapper>
          <Button testid={`${testids.POPUP_ACTION_BUTTON}`} onClick={() => handleDelete(true)}>
            {t('modals.delete')}
          </Button>
          <Button testid={`${testids.POPUP_ACTION_BUTTON}`} onClick={() => handleDelete(false)}>
            {t('modals.deleteWithContentTransfer')}
          </Button>
          <Button testid={`${testids.POPUP_CANCEL_BUTTON}`} onClick={closeModal}>
            {t('modals.cancel')}
          </Button>
        </ButtonFormWrapper>
      </Stack>
    </div>
  );
};
