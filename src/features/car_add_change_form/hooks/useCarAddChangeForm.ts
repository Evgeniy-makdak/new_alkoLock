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
  // TODO => потом убрать когда бэк научится брать это из кук
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
    return null;
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
    defaultValues: {
      mark: '',
      model: '',
      vin: '',
      registrationNumber: '',
      type: [],
      color: [],
    },
    values: defaultValues,
  });

  useEffect(() => {
    if (!isLoadingCar && defaultValues) {
      setIsDataLoaded(true);
    }
  }, [isLoadingCar, defaultValues]);

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

    id ? await changeItem(payload) : await createItem(payload);
    closeModal && closeModal();
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
