import { useEffect } from 'react';
import { useForm } from 'react-hook-form';

import { yupResolver } from '@hookform/resolvers/yup';
import { appStore } from '@shared/model/app_store/AppStore';
import type { ID } from '@shared/types/BaseQueryTypes';
import type { Value } from '@shared/ui/search_multiple_select';
import ArrayUtils from '@shared/utils/ArrayUtils';
import { Formatters } from '@shared/utils/formatters';

import { useAlkozamkiFormApi } from '../api/useAlkozamkiFormApi';
import { type Form, schema } from '../lib/validate';

export const useAlkozamkiForm = (id?: ID, closeModal?: () => void) => {
  const selectedBranch = appStore.getState().selectedBranchState;
  const { alkolock, isLoadingAlkolock, changeItem, createItem } = useAlkozamkiFormApi(id);
  const car = alkolock?.vehicleBind?.vehicle;

  const defaultValues =
    alkolock && !isLoadingAlkolock
      ? {
          name: alkolock?.name || '',
          serialNumber: alkolock?.serialNumber || '',
          uid: alkolock?.serviceId || '',
          tc: car
            ? [
                {
                  label: Formatters.carNameFormatter(car),
                  value: car?.id,
                },
              ]
            : [],
        }
      : null;

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: {
      errors: { name: nameAlkolock, serialNumber, uid },
    },
  } = useForm({
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    //@ts-ignore
    resolver: yupResolver(schema),
    defaultValues,
  });

  useEffect(() => {
    if (defaultValues) {
      Object.keys(defaultValues).forEach((key) => {
        setValue(key as keyof Form, defaultValues[key as keyof Form]);
      });
    }
  }, [alkolock?.name, car, setValue]);

  const customReset = () => {
    setValue('tc', [
      {
        label: Formatters.carNameFormatter(car),
        value: car?.id,
      },
    ]);
  };

  const onSelect = (type: keyof Form, value: string | Value | (string | Value)[]) => {
    const values = ArrayUtils.getArrayValues(value);
    setValue(type, values);
  };

  const errorName = nameAlkolock ? nameAlkolock.message.toString() : '';
  const errorSerialNumber = serialNumber ? serialNumber.message.toString() : '';
  const errorUid = uid ? uid.message.toString() : '';

  const onSubmit = async (data: Form) => {
    // Удаление пробелов из строковых значений
    const trimmedData = Object.keys(data).reduce((acc, key) => {
      const value = data[key as keyof Form];
      acc[key as keyof Form] =
        typeof value === 'string' ? value.trim() : (value as any);
      return acc;
    }, {} as Form);

    const car = trimmedData?.tc?.length ? trimmedData?.tc[0]?.value : '';
    const payload = {
      branchId: 'id' in selectedBranch ? selectedBranch.id : 10,
      name: trimmedData.name,
      serialNumber: trimmedData.serialNumber,
      serviceId: trimmedData.uid,
      vehicleId: car,
    };

    try {
      if (id) {
        await changeItem(payload);
      } else {
        await createItem(payload);
      }
      if (closeModal) {
        closeModal();
      }
    } catch (error) {
      // Обработка ошибок в хуке
    }
  };

  return {
    reset: customReset,
    errorName,
    errorSerialNumber,
    errorUid,
    nameAlkolock,
    serialNumber,
    uid,
    register,
    handleSubmit: handleSubmit(onSubmit),
    onSelect,
    tc: watch('tc'),
    isLoadingAlkolock,
  };
};
