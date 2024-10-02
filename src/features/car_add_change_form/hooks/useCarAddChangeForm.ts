import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';

import dayjs, { Dayjs } from 'dayjs';

import { yupResolver } from '@hookform/resolvers/yup';
import { appStore } from '@shared/model/app_store/AppStore';
import type { ID } from '@shared/types/BaseQueryTypes';
import type { Value } from '@shared/ui/search_multiple_select';
import ArrayUtils from '@shared/utils/ArrayUtils';

import { useCarAddChangeFormApi } from '../api/useCarAddChangeFormApi';
import { colorSelectValueFormatter, typeSelectValueFormatter } from '../lib/helpers';
import { type Form, schema } from '../lib/validate';

const dateNow = dayjs();

export const useCarAddChangeForm = (id?: ID, closeModal?: () => void) => {
  const selectedBranch = appStore.getState().selectedBranchState;
  const { car, isLoadingCar, changeItem, createItem } = useCarAddChangeFormApi(id);
  const [isDataLoaded, setIsDataLoaded] = useState(false);

  const defaultValues = useMemo(() => {
    if (car && !isLoadingCar) {
      return {
        mark: car?.manufacturer || '',
        model: car?.model || '',
        vin: car?.vin || '',
        registrationNumber: car?.registrationNumber || '',
        type: typeSelectValueFormatter(car?.type) || [],
        color: colorSelectValueFormatter(car?.color) || [],
        year: car?.year ? dateNow.year(car.year) : dateNow,
      };
    }
    return {
      mark: '',
      model: '',
      vin: '',
      registrationNumber: '',
      type: [],
      color: [],
      year: dateNow,
    };
  }, [car, isLoadingCar]);

  const {
    register,
    handleSubmit,
    clearErrors,
    setValue,
    watch,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(schema),
    defaultValues,
  });

  useEffect(() => {
    if (!isLoadingCar && defaultValues) {
      Object.keys(defaultValues).forEach((key) => {
        setValue(key as keyof Form, defaultValues[key as keyof Form]);
      });
      setIsDataLoaded(true);
    }
  }, [isLoadingCar, defaultValues, setValue]);

  const onChangeDate = (value: Dayjs) => {
    clearErrors('year');
    setValue('year', value);
  };

  const onSelect = (type: 'type' | 'color', value: string | Value | (string | Value)[]) => {
    clearErrors(type);
    const values = ArrayUtils.getArrayValues(value);
    setValue(type, values);
  };

  const getErrorMessage = (name: keyof Form) =>
    errors[name] ? errors[name].message.toString() : '';

  const onSubmit = async (data: Form) => {
    try {
      const year = data?.year.year();
      const payload = {
        branchId: selectedBranch?.id,
        color: data.color[0]?.value,
        type: data?.type[0]?.value,
        manufacturer: data.mark,
        year,
        model: data.model,
        registrationNumber: data.registrationNumber,
        vin: data.vin,
      };
      console.log("Submitting form with data:", payload);

      if (id) {
        await changeItem(payload);
      } else {
        await createItem(payload);
      }

      closeModal && closeModal();
    } catch (error) {
      console.error('Error occurred during form submission:', error);
    }
  };

  return {
    errorMark: getErrorMessage('mark'),
    errorModel: getErrorMessage('model'),
    errorVin: getErrorMessage('vin'),
    errorRegistrationNumber: getErrorMessage('registrationNumber'),
    errorType: getErrorMessage('type'),
    errorColor: getErrorMessage('color'),
    errorYear: getErrorMessage('year'),
    selectType: watch('type'),
    selectColor: watch('color'),
    handleSubmit: handleSubmit(onSubmit),
    onSetDate: onChangeDate,
    onSelect,
    register,
    yearValue: watch('year'),
    isLoadingCar,
    isDataLoaded,
  };
};
