import type { FC, ReactNode } from 'react';

import {
  FormControl,
  InputLabel,
  type InputLabelProps,
  MenuItem,
  Select as MuiSelect,
  type SelectChangeEvent,
  type SelectProps,
} from '@mui/material';

import { InputWrapper } from '@shared/styled_components/styledInputWrapper';
import type { ID } from '@shared/types/BaseQueryTypes';

import type { Values } from '../search_multiple_select';

type FieldSelectProps = {
  onChange?: (value: ID) => void;
  selectProps?: Omit<SelectProps, 'onChange'>;
  labelText?: string | ReactNode;
  options: Values;
  labelProps?: Omit<InputLabelProps, 'shrink' | 'sx'>;
  testId?: string;
};

export const FieldSelect: FC<FieldSelectProps> = ({
  options,
  onChange,
  labelText,
  selectProps,
  labelProps,
  testId,
}) => {
  const onChangeSelect = (event: SelectChangeEvent<ID>) => {
    const val = event.target.value;

    onChange && onChange(val);
  };
  return (
    <InputWrapper>
      <FormControl data-testid={testId} fullWidth>
        <InputLabel
          {...labelProps}
          shrink={true}
          sx={{
            background: 'white',
          }}>
          {labelText}
        </InputLabel>

        <MuiSelect
          data-testid={testId}
          {...selectProps}
          variant={'outlined'}
          fullWidth
          onChange={onChangeSelect}>
          {options.map((option) => {
            return (
              <MenuItem
                data-testid={`${testId}_${option.label}`}
                key={option.value}
                value={option.value}>
                {option.label}
              </MenuItem>
            );
          })}
        </MuiSelect>
      </FormControl>
    </InputWrapper>
  );
};
