import type { FC } from 'react';
import { useTranslation } from 'react-i18next';

import { Stack, Typography } from '@mui/material';

import { ButtonFormWrapper } from '@shared/components/button_form_wrapper/ButtonFormWrapper';
import { testids } from '@shared/const/testid';
import { reactNodeToPlainText } from '@shared/lib/reactNodeToPlainText';
import { SelectedBranchState } from '@shared/model/app_store/AppStore';
import type { ID } from '@shared/types/BaseQueryTypes';
import { Button } from '@shared/ui/button';

import { useGroupDeleteForm } from '../hooks/useGroupDeleteForm';

type GroupDeleteFormProps = {
  closeModal: () => void;
  branch: { id: ID; text: string };
  setState: (data: { selectedBranchState?: SelectedBranchState }) => void;
  onGroupDeleted?: () => void;
};

export const GroupDeleteForm: FC<GroupDeleteFormProps> = ({
  branch,
  closeModal,
  setState,
  onGroupDeleted,
}) => {
  const { t } = useTranslation();
  const { handleDelete, isDeleting, activeDeleteMode } = useGroupDeleteForm(
    branch.id,
    closeModal,
    setState,
    onGroupDeleted,
  );
  return (
    <div>
      <Typography marginBottom={3} fontWeight={700} variant="h6">
        {t('modals.groupDeletion')}
      </Typography>
      <Stack gap={3}>
        <Typography>
          {t('modals.confirmDeleteGroup', { name: reactNodeToPlainText(branch.text) })}
        </Typography>
        <ButtonFormWrapper>
          <Button
            testid={`${testids.POPUP_ACTION_BUTTON}`}
            disabled={isDeleting}
            isLoading={activeDeleteMode === 'plain'}
            onClick={() => void handleDelete(true)}>
            {t('modals.delete')}
          </Button>
          <Button
            testid={`${testids.POPUP_ACTION_BUTTON}`}
            disabled={isDeleting}
            isLoading={activeDeleteMode === 'transfer'}
            onClick={() => void handleDelete(false)}>
            {t('modals.deleteWithContentTransfer')}
          </Button>
          <Button
            testid={`${testids.POPUP_CANCEL_BUTTON}`}
            disabled={isDeleting}
            onClick={closeModal}>
            {t('modals.cancel')}
          </Button>
        </ButtonFormWrapper>
      </Stack>
    </div>
  );
};
