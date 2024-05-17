import type { FC } from 'react';

import { Stack, TextField, Typography } from '@mui/material';

import { ButtonFormWrapper } from '@shared/components/button_form_wrapper/ButtonFormWrapper';
import type { ID } from '@shared/types/BaseQueryTypes';
import { Button } from '@shared/ui/button';

import { useGroupAddForm } from '../hooks/useGroupAddForm';

type GroupAddFormProps = {
  close: () => void;
  branch?: { id: ID; name: string };
};

export const GroupAddForm: FC<GroupAddFormProps> = ({ close, branch }) => {
  const { register, submit, error, message } = useGroupAddForm(close, branch);
  return (
    <form onSubmit={submit}>
      <Typography fontWeight={600} marginBottom={2} variant="h6">
        {branch?.id ? 'Редактирование названия группы' : 'Добавление группы'}
      </Typography>
      <Stack gap={3}>
        <TextField
          fullWidth
          label="Название группы"
          error={error}
          helperText={message}
          {...register('name')}
        />
        <ButtonFormWrapper>
          <Button type="submit">{branch?.id ? 'Сохранить' : 'Добавить'}</Button>
          <Button onClick={close}>Отмена</Button>
        </ButtonFormWrapper>
      </Stack>
    </form>
  );
};
