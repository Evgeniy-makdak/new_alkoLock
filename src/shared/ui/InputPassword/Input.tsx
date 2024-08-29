import type { JSX } from 'react';
import { type Control, Controller, type Path } from 'react-hook-form';

import { Visibility, VisibilityOff } from '@mui/icons-material';
import { IconButton, InputAdornment, TextField, TextFieldProps } from '@mui/material';

import { useToggle } from '@shared/hooks/useToggle';

type InputPasswordProps<T> = {
  type?: 'pass' | 'text';
  control: Control<T>;
  name: Path<T>;
} & Omit<TextFieldProps, 'name' | 'type'>;

export const InputPassword = <T,>({
  name,
  control,
  type = 'pass',
  ...rest
}: InputPasswordProps<T>): JSX.Element => {
  const [showPassword, toggleShowPassword] = useToggle(false);

  return (
    <>
      <Controller
        name={name}
        control={control}
        render={({ field: { onChange, value }, fieldState: { error } }) => (
          <>
            {type === 'pass' ? (
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
                      <IconButton
                        aria-label="toggle password visibility"
                        onClick={toggleShowPassword}
                        onMouseDown={toggleShowPassword}
                        edge="end">
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
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
