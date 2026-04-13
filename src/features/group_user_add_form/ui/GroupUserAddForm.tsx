import type { FC } from 'react';
import { useTranslation } from 'react-i18next';

import { Stack, Typography } from '@mui/material';

import { UsersSelect } from '@entities/users_select';
import { ButtonFormWrapper } from '@shared/components/button_form_wrapper/ButtonFormWrapper';
import type { ID } from '@shared/types/BaseQueryTypes';
import { AppAlert } from '@shared/ui/alert';
import { Button } from '@shared/ui/button';

import { useGroupUserAddForm } from '../hooks/useGroupUserAddForm';
import style from './GroupUserAddForm.module.scss';

type GroupUserAddFormProps = {
  branchId: ID;
  close: () => void;
};

export const GroupUserAddForm: FC<GroupUserAddFormProps> = ({ close, branchId }) => {
  const { t } = useTranslation();
  const { users, error, onSelect, onSubmit, showAlert, handleOpenAlert, closeAlert } =
    useGroupUserAddForm(branchId, close);
  const alertText = (
    <>
      {t('groups.addUsersAlertPrefix')} <b>{t('groups.addUsersAlertBroken')}</b>,{' '}
      {t('groups.addUsersAlertSuffix')}
      <br />
      <br />
      {t('groups.addUsersAlertConfirm')}
    </>
  );

  return (
    <div className={style.group}>
      <Typography fontWeight={600} marginBottom={2} variant="h6">
        {t('groups.addUsersTitle')}
      </Typography>
      <Stack gap={3}>
        <UsersSelect
          excludeUserWithId2={true}
          onlyWithDriverId={false}
          notInBranch={branchId}
          vieBranch
          multiple
          name="userId"
          error={error}
          value={users}
          setValueStore={onSelect}
          label={t('filters.searchByUser')}
          equalsBranchId={false}
          excludeSuperAdmin={true}
          showBranchName={true}
        />
        {error && <span className={style.errorText}>{t('validation.required')}</span>}

        {!showAlert && (
          <ButtonFormWrapper>
            <Button onClick={handleOpenAlert}>{t('common.add')}</Button>
            <Button onClick={close}>{t('common.cancel')}</Button>
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
    </div>
  );
};
