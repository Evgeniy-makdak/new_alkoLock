import type { FC } from 'react';

import { Stack, Typography } from '@mui/material';

import { BranchSelect } from '@entities/branch_select';
import { ButtonFormWrapper } from '@shared/components/button_form_wrapper/ButtonFormWrapper';
import type { ID } from '@shared/types/BaseQueryTypes';
import { AppAlert } from '@shared/ui/alert';
import { Button } from '@shared/ui/button';

import { useGroupAlcolockMoveForm } from '../hooks/useGroupAlcolockMoveForm';
import style from './GroupAlcolockMoveForm.module.scss';

export type GroupAlcolockMoveFormProps = {
  close: () => void;
  alcolock: { id: ID; text: string };
  targetBranch?: ID;
};

export const GroupAlcolockMoveForm: FC<GroupAlcolockMoveFormProps> = ({
  alcolock,
  close,
  targetBranch,
}) => {
  const {
    error,
    branchSelect,
    onSelect,
    handleOpenAlert,
    showAlert,
    closeAlert,
    onSubmit,
    alertText,
  } = useGroupAlcolockMoveForm({
    alcolock,
    close,
  });

  return (
    <div className={style.group}>
      <Typography fontSize={16} fontWeight={600} marginBottom={2} variant="h6">
        Перемещение ТС <span className={style.carText}>{alcolock.text}</span>
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
        {error && <span className={style.errorText}>Обязательное поле</span>}

        {!showAlert && (
          <ButtonFormWrapper>
            <Button onClick={handleOpenAlert}>переместить</Button>
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
