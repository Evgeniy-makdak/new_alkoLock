import type { JSX } from 'react';
import { type Control, Controller, type Path } from 'react-hook-form';
import { useTranslation } from 'react-i18next';

import { Visibility, VisibilityOff } from '@mui/icons-material';
import { IconButton, InputAdornment, TextField, TextFieldProps, Tooltip } from '@mui/material';

import { useToggle } from '@shared/hooks/useToggle';

type InputPasswordProps<T> = {
  type?: 'password' | 'text';
  control: Control<T>;
  name: Path<T>;
} & Omit<TextFieldProps, 'name' | 'type'>;

export const InputPassword = <T,>({
  name,
  control,
  type = 'password',
  ...rest
}: InputPasswordProps<T>): JSX.Element => {
  const { t } = useTranslation();
  const [showPassword, toggleShowPassword] = useToggle(false);

  const visibilityLabel = showPassword ? t('common.hidePassword') : t('common.showPassword');

  return (
    <>
      <Controller
        name={name}
        control={control}
        render={({ field: { onChange, value }, fieldState: { error } }) => (
          <>
            {type === 'password' ? (
              <TextField
                {...rest}
                onChange={onChange}
                error={!!error}
                helperText={error?.message}
                value={value}
                type={showPassword ? 'text' : 'password'}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <Tooltip title={visibilityLabel}>
                        <IconButton
                          aria-label={visibilityLabel}
                          onClick={toggleShowPassword}
                          onMouseDown={toggleShowPassword}
                          edge="end">
                          {showPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </Tooltip>
                    </InputAdornment>
                  ),
                }}
              />
            ) : (
              <TextField
                {...rest}
                error={!!error}
                helperText={error?.message}
                value={value}
                onChange={onChange}
                variant="outlined"
                fullWidth
              />
            )}
          </>
        )}
      />
    </>
  );
};
