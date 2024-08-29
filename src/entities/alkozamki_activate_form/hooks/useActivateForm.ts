import { useForm } from 'react-hook-form';

import { yupResolver } from '@hookform/resolvers/yup';

import { schema } from '../lib/validation';

export const useActivateForm = () => {
  const {
    register,
    handleSubmit,
    formState: {
      errors: { duration },
    },
  } = useForm({
    defaultValues: { duration: 1 },
    resolver: yupResolver(schema),
  });
  const error = duration ? duration.message.toString() : '';
  return { register, handleSubmit, error, duration };
};
