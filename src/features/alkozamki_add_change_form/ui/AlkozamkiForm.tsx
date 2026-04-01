import { FC } from 'react';
import { useTranslation } from 'react-i18next';

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
import { DriversTransferModal } from './DriversTransferModal';

interface AlkozamkiFormProps {
  closeModal: () => void;
  id?: ID;
}

export const AlkozamkiForm: FC<AlkozamkiFormProps> = ({ closeModal, id }) => {
  const { t } = useTranslation();
  const {
    handleSubmit,
    onSelect,
    register,
    tc,
    errorName,
    errorSerialNumber,
    // errorUid,
    isLoadingAlkolock,
    reset,
    showDriversTransferModal,
    setShowDriversTransferModal,
    driversForTransfer,
    handleSaveWithDriverTransfer,
    newVehicleId,
    originalVehicleId,
    isSubmitting,
    newVehicleData,
    isDirty,
    alwaysIncludeVehicleOptions,
  } = useAlkozamkiForm(id, closeModal);

  // Обработчик потери фокуса с обрезкой пробелов
  const handleBlurWithTrim = (fieldName: any) => (e: React.FocusEvent<HTMLInputElement>) => {
    const trimmedValue = e.target.value.trim().replace(/\s+/g, ' ');
    if (trimmedValue !== e.target.value) {
      // Создаем синтетическое событие с обрезанным значением
      const syntheticEvent = {
        target: {
          value: trimmedValue,
          name: e.target.name,
        },
      } as React.ChangeEvent<HTMLInputElement>;

      // Вызываем обработчик react-hook-form
      register(fieldName).onChange(syntheticEvent);
    }
  };

  return (
    <Loader isLoading={isLoadingAlkolock}>
      <form className={style.inputsWrapper} onSubmit={handleSubmit}>
        <Typography fontWeight={600} marginBottom={2} variant="h6">
          {id ? t('modals.editAlcolock') : t('modals.addAlcolock')}
        </Typography>
        {isLoadingAlkolock ? null : (
          <>
            <InputsColumnWrapper>
              <TextField
                helperText={<span>{errorName}</span>}
                error={!!errorName}
                {...register('name')}
                label={t('tables.naming')}
                onBlur={handleBlurWithTrim('name')}
              />
              <TextField
                disabled={!!id}
                helperText={<span>{errorSerialNumber}</span>}
                error={!!errorSerialNumber}
                {...register('serialNumber')}
                label={t('tables.serialNumber')}
                onBlur={handleBlurWithTrim('serialNumber')}
              />
              {/* <TextField
                helperText={<span>{errorUid}</span>}
                error={!!errorUid}
                {...register('uid')}
                label={LABEL_TEXT.serviceId.label}
              /> */}
              <CarsSelect
                name={LABEL_TEXT.vehicle.name}
                testid={
                  testids.page_alcolocks.alcolocks_popup_add_alcolock.ALCOLOCK_ADD_ATTACH_INPUT_CAR
                }
                specified={false}
                isActive={true}
                includeIsActive={true}
                value={tc}
                setValueStore={onSelect}
                label={t('tables.installedOnVehicle')}
                reset={reset}
                alwaysIncludeOptions={alwaysIncludeVehicleOptions}
              />
            </InputsColumnWrapper>
            <ButtonFormWrapper>
              <Button type="submit" disabled={isSubmitting || !isDirty}>
                {id ? t('common.save') : t('common.add')}
              </Button>
              <Button onClick={closeModal}>{t('common.cancel')}</Button>
            </ButtonFormWrapper>
          </>
        )}
      </form>

      <DriversTransferModal
        open={showDriversTransferModal}
        onClose={() => setShowDriversTransferModal(false)}
        drivers={driversForTransfer}
        newVehicleId={newVehicleId}
        originalVehicleId={originalVehicleId}
        onConfirm={handleSaveWithDriverTransfer}
        isLoading={isSubmitting}
        newVehicleData={newVehicleData}
      />
    </Loader>
  );
};
