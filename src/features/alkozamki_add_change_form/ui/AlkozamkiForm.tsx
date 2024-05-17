import type { FC } from 'react';

import { TextField, Typography } from '@mui/material';

import { CarsSelect } from '@entities/cars_select';
import { InputsColumnWrapper } from '@shared/components/Inputs_column_wrapper/InputsColumnWrapper';
import { ButtonFormWrapper } from '@shared/components/button_form_wrapper/ButtonFormWrapper';
import { testids } from '@shared/const/testid';
import type { ID } from '@shared/types/BaseQueryTypes';
import { Button } from '@shared/ui/button';
import { Loader } from '@shared/ui/loader';

import { useAlkozamkiForm } from '../hooks/useAlkozamkiForm';
import { LABEL_TEXT } from '../lib/conts';
import style from './AlkozamkiForm.module.scss';

interface AlkozamkiFormProps {
  closeModal: () => void;
  id?: ID;
}

export const AlkozamkiForm: FC<AlkozamkiFormProps> = ({ closeModal, id }) => {
  const {
    handleSubmit,
    onSelect,
    register,
    tc,
    nameAlkolock,
    errorName,
    serialNumber,
    errorSerialNumber,
    errorUid,
    uid,
    isLoadingAlkolock,
  } = useAlkozamkiForm(id, closeModal);

  return (
    <Loader isLoading={isLoadingAlkolock}>
      <form className={style.inputsWrapper} onSubmit={handleSubmit}>
        <Typography fontWeight={600} marginBottom={2} variant="h6">
          {id ? 'Редактирование Алкозамка' : 'Добавление Алкозамка'}
        </Typography>
        {isLoadingAlkolock ? null : (
          <>
            <InputsColumnWrapper>
              <TextField
                helperText={<span>{errorName}</span>}
                error={!!nameAlkolock}
                {...register('name')}
                label={LABEL_TEXT.name.label}
              />
              <TextField
                disabled={!!id}
                helperText={<span>{errorSerialNumber}</span>}
                error={!!serialNumber}
                {...register('serialNumber')}
                label={LABEL_TEXT.serialNumber.label}
              />
              <TextField
                helperText={<span>{errorUid}</span>}
                error={!!uid}
                {...register('uid')}
                label={LABEL_TEXT.serviceId.label}
              />
              <CarsSelect
                name={LABEL_TEXT.vehicle.name}
                testid={
                  testids.page_alcolocks.alcolocks_popup_add_alcolock.ALCOLOCK_ADD_ATTACH_INPUT_CAR
                }
                value={tc}
                setValueStore={onSelect}
                label={LABEL_TEXT.vehicle.label}
              />
            </InputsColumnWrapper>
            <ButtonFormWrapper>
              <Button type="submit">{id ? 'сохранить' : 'добавить'}</Button>
              <Button onClick={closeModal}>отмена</Button>
            </ButtonFormWrapper>
          </>
        )}
      </form>
    </Loader>
  );
};
