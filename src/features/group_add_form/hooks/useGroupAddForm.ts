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
  const { addGroup, editGroup } = useGroupAddFormApi();

  const submit = handleSubmit(async (name: { name: string }) => {
    branch?.id ? await editGroup({ name: name.name, id: branch?.id }) : await addGroup(name.name);
    close();
  });

  return {
    register,
    submit,
    error: !!name,
    message: typeof name?.message === 'string' ? name?.message : '',
  };
};
