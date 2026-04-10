import type { FC } from 'react';
import { useTranslation } from 'react-i18next';

import { Stack, Typography } from '@mui/material';

import { BranchSelect } from '@entities/branch_select';
import { ButtonFormWrapper } from '@shared/components/button_form_wrapper/ButtonFormWrapper';
import type { ID } from '@shared/types/BaseQueryTypes';
import { AppAlert } from '@shared/ui/alert';
import { Button } from '@shared/ui/button';

import { useGroupUserMoveForm } from '../hooks/useGroupUserMoveForm';
import style from './GroupUserMoveForm.module.scss';

export type GroupUserMoveFormProps = {
  close: () => void;
  user: { id: ID; text: string } | null;
  targetBranch?: ID;
};

const GroupUserMoveFormInner: FC<{
  user: { id: ID; text: string };
  close: () => void;
  targetBranch?: ID;
}> = ({ user, close, targetBranch }) => {
  const { t } = useTranslation();
  const {
    error,
    branchSelect,
    onSelect,
    handleOpenAlert,
    showAlert,
    closeAlert,
    onSubmit,
    alertText,
  } = useGroupUserMoveForm({
    user,
    close,
  });

  return (
    <>
      <Typography fontSize={16} fontWeight={600} marginBottom={2} variant="h6">
        Перемещение пользователя <span className={style.userText}>{user.text}</span>
      </Typography>
      <Stack gap={3}>
        <BranchSelect
          name="branchId"
          error={error}
          value={branchSelect}
          setValueStore={onSelect}
          label="Поиск по группам"
          filter={targetBranch}
        />
        {error && <span className={style.errorText}>{t('validation.required')}</span>}

        {!showAlert && (
          <ButtonFormWrapper>
            <Button onClick={handleOpenAlert}>переместить</Button>
            <Button onClick={close}>отмена</Button>
          </ButtonFormWrapper>
        )}
      </Stack>
      <AppAlert
        severity="warning"
        title={t('tooltips.attention')}
        text={alertText}
        onClose={closeAlert}
        onSubmit={onSubmit}
        open={showAlert}
        className={style.alert}
      />
    </>
  );
};

export const GroupUserMoveForm: FC<GroupUserMoveFormProps> = ({ user, close, targetBranch }) => {
  if (!user) return null;
  return <GroupUserMoveFormInner user={user} close={close} targetBranch={targetBranch} />;
};
