import { useForm } from 'react-hook-form';

import { yupResolver } from '@hookform/resolvers/yup';
import type { ID } from '@shared/types/BaseQueryTypes';

import { useGroupAddFormApi } from '../api/useGroupAddFormApi';
import { schema } from '../lib/validate';

export const useGroupAddForm = (close: () => void, branch?: { id: ID; name: string }) => {
  const {
    register,
    handleSubmit,
    formState: {
      errors: { name },
    },
  } = useForm({
    defaultValues: {
      name: branch?.name || '',
    },
    resolver: yupResolver(schema),
  });
  const { addGroup, editGroup, isLoading } = useGroupAddFormApi(branch?.id);

  const submit = handleSubmit(async (data: { name: string }) => {
    // Удаление пробелов из строковых полей
    const trimmedData = Object.keys(data).reduce((acc, key) => {
      const value = data[key as keyof typeof data];
      acc[key as keyof typeof data] =
        typeof value === 'string' ? value.trim() : (value as any);
      return acc;
    }, {} as typeof data);

    try {
      if (branch?.id) {
        await editGroup({ name: trimmedData.name, id: branch?.id });
      } else {
        await addGroup(trimmedData.name);
      }
      close();
    } catch (error) {
      // console.error('Ошибка:', error);
    }
  });

  return {
    register,
    submit,
    error: !!name,
    message: typeof name?.message === 'string' ? name?.message : '',
    isLoading,
  };
};
