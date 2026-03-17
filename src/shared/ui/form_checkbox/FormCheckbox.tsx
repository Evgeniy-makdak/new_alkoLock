import { Checkbox, type CheckboxProps, FormControlLabel } from '@mui/material';

import type { MySelectDisplayProps } from '@shared/types/utility';

interface FormCheckboxProps {
  checkBox: CheckboxProps;
  label?: string;
  testid?: string;
}

export const FormCheckbox = ({ checkBox, label, testid }: FormCheckboxProps) => {
  return (
    <FormControlLabel
      control={
        <Checkbox
          inputProps={
            {
              'data-testid': testid,
            } as MySelectDisplayProps
          }
          {...checkBox}
        />
      }
      label={label ?? ''}
    />
  );
};
