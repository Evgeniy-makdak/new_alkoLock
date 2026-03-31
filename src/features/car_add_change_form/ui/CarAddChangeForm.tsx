import type { FC } from 'react';
import { useTranslation } from 'react-i18next';

import { TextField, Typography } from '@mui/material';

import { CarColorSelect } from '@entities/car_color_select';
import { TransportTypeSelect } from '@entities/transport_type_select';
import { InputsColumnWrapper } from '@shared/components/Inputs_column_wrapper';
import { ButtonFormWrapper } from '@shared/components/button_form_wrapper/ButtonFormWrapper';
import { testids } from '@shared/const/testid';
import type { ID } from '@shared/types/BaseQueryTypes';
import { Button } from '@shared/ui/button';
import { InputDate } from '@shared/ui/input_date/InputDate';
import { Loader } from '@shared/ui/loader';

import { useCarAddChangeForm } from '../hooks/useCarAddChangeForm';
import style from './CarAddChangeForm.module.scss';

type CarAddChangeFormProps = {
  closeModal: () => void;
  id?: ID;
};

export const CarAddChangeForm: FC<CarAddChangeFormProps> = ({ closeModal, id }) => {
  const { t } = useTranslation();
  const {
    errorMark,
    errorModel,
    errorVin,
    errorRegistrationNumber,
    errorYear,
    errorType,
    errorColor,
    selectType,
    selectColor,
    handleSubmit,
    onSetDate,
    yearValue,
    onSelect,
    register,
    isLoadingCar,
    isDataLoaded,
    isDirty,
  } = useCarAddChangeForm(id, closeModal);

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
    <Loader isLoading={isLoadingCar}>
      <form className={style.inputsWrapper} onSubmit={handleSubmit}>
        <Typography fontWeight={600} marginBottom={2} variant="h6">
          {id ? t('modals.editVehicle') : t('modals.addVehicle')}
        </Typography>
        {!isLoadingCar && isDataLoaded && (
          <>
            <InputsColumnWrapper>
              <TextField
                helperText={<span>{errorMark}</span>}
                error={!!errorMark}
                {...register('mark')}
                label={t('form.make')}
                onBlur={handleBlurWithTrim('mark')}
              />
              <TextField
                helperText={<span>{errorModel}</span>}
                error={!!errorModel}
                {...register('model')}
                label={t('form.model')}
                onBlur={handleBlurWithTrim('model')}
              />
              <TransportTypeSelect
                name={'type'}
                testid={testids.page_transports.transports_widget_add_car_popup.CAR_POPUP_TYPE}
                value={selectType}
                setValueStore={onSelect}
                error={!!errorType}
                label={t('form.type')}
                helperText={errorType}
              />
              <TextField
                helperText={<span>{errorVin}</span>}
                error={!!errorVin}
                {...register('vin')}
                label={'VIN'}
                onBlur={handleBlurWithTrim('vin')}
              />
              <CarColorSelect
                name={'color'}
                testid={testids.page_transports.transports_widget_add_car_popup.CAR_POPUP_COLOR}
                value={selectColor}
                setValueStore={onSelect}
                error={!!errorColor}
                label={t('form.color')}
                helperText={errorColor}
              />
              <TextField
                helperText={<span>{errorRegistrationNumber}</span>}
                error={!!errorRegistrationNumber}
                {...register('registrationNumber')}
                label={t('form.stateNumber')}
                onBlur={handleBlurWithTrim('registrationNumber')}
              />
              <InputDate
                disableFuture
                value={yearValue}
                views={['year']}
                testid={testids.page_transports.transports_widget_add_car_popup.CAR_POPUP_YEAR}
                slotProps={{
                  textField: {
                    error: !!errorYear,
                    helperText: errorYear,
                  },
                }}
                label={t('form.yearOfManufacture')}
                onChange={onSetDate}
              />
            </InputsColumnWrapper>
            <ButtonFormWrapper>
              <Button type="submit" disabled={!isDirty}>
                {id ? t('common.save') : t('common.add')}
              </Button>
              <Button onClick={closeModal}>{t('common.cancel')}</Button>
            </ButtonFormWrapper>
          </>
        )}
      </form>
    </Loader>
  );
};
