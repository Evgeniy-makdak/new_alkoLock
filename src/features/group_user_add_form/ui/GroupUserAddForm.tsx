import type { FC } from 'react';

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
const alertText = (
  <>
    При перемещении выбранных пользователей все их текущие связи с ТС будут <b>разорваны</b>, а
    также будут отозваны все несистемные роли.
    <br />
    <br />
    Пожалуйста, подтвердите действие.
  </>
);
export const GroupUserAddForm: FC<GroupUserAddFormProps> = ({ close, branchId }) => {
  const { users, error, onSelect, onSubmit, showAlert, handleOpenAlert, closeAlert } =
    useGroupUserAddForm(branchId, close);

  return (
    <div className={style.group}>
      <Typography fontWeight={600} marginBottom={2} variant="h6">
        Добавить пользователей в группу
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
          label="Поиск по пользователю"
          equalsBranchId={false}
          excludeSuperAdmin={true}
        />
        {error && <span className={style.errorText}>Обязательное поле</span>}

        {!showAlert && (
          <ButtonFormWrapper>
            <Button onClick={handleOpenAlert}>добавить</Button>
            <Button onClick={close}>отмена</Button>
          </ButtonFormWrapper>
        )}
      </Stack>

      <AppAlert
        severity="warning"
        title={'Внимание!'}
        text={alertText}
        onClose={closeAlert}
        onSubmit={onSubmit}
        open={showAlert}
        className={style.alert}
      />
    </div>
  );
};
