import type { FC } from 'react';
import { useTranslation } from 'react-i18next';

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
  const { t } = useTranslation();
  const { register, submit, error, message } = useGroupAddForm(close, branch);

  // Обработчик потери фокуса с обрезкой пробелов
  const handleBlurWithTrim = (e: React.FocusEvent<HTMLInputElement>) => {
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
      register('name').onChange(syntheticEvent);
    }
  };

  return (
    <form onSubmit={submit}>
      <Typography fontWeight={600} marginBottom={2} variant="h6">
        {branch?.id ? t('modals.editGroupName') : t('modals.addGroup')}
      </Typography>
      <Stack gap={3}>
        <TextField
          fullWidth
          label={t('form.groupName')}
          error={error}
          helperText={message}
          {...register('name')}
          onBlur={handleBlurWithTrim}
        />
        <ButtonFormWrapper>
          <Button type="submit">{branch?.id ? t('common.save') : t('common.add')}</Button>
          <Button onClick={close}>{t('common.cancel')}</Button>
        </ButtonFormWrapper>
      </Stack>
    </form>
  );
};
