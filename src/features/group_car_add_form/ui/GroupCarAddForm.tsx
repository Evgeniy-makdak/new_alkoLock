import type { FC } from 'react';

import { Stack, Typography } from '@mui/material';

import { CarsSelect } from '@entities/cars_select';
import { ButtonFormWrapper } from '@shared/components/button_form_wrapper/ButtonFormWrapper';
import type { ID } from '@shared/types/BaseQueryTypes';
import { AppAlert } from '@shared/ui/alert';
import { Button } from '@shared/ui/button';

import { useGroupCarAddForm } from '../hooks/useGroupCarAddForm';
import style from './GroupCarAddForm.module.scss';

type GroupCarAddFormProps = {
  branchId: ID;
  close: () => void;
};

const alertText = (
  <>
    При перемещении выбранных ТС все их текущие связи с пользователями и алкозамками будут{' '}
    <b>разорваны</b>. <br />
    <br /> Пожалуйста, подтвердите действие.
  </>
);

export const GroupCarAddForm: FC<GroupCarAddFormProps> = ({ close, branchId }) => {
  const { cars, error, onSelect, onSubmit, showAlert, handleOpenAlert, closeAlert } =
    useGroupCarAddForm(branchId, close);
  return (
    <div className={style.group}>
      <Typography fontWeight={600} marginBottom={2} variant="h6">
        Добавить ТС в группу
      </Typography>
      <Stack gap={3}>
        <CarsSelect
          notInBranch={branchId}
          vieBranch
          multiple
          name="carId"
          error={error}
          value={cars}
          setValueStore={onSelect}
          label="Поиск по ТС"
          specified = {undefined}
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
