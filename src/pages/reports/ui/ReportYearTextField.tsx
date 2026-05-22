import type { ReactNode } from 'react';

import { TextField, Tooltip } from '@mui/material';
import type { SxProps, Theme } from '@mui/material/styles';

type ReportYearTextFieldProps = {
  label: ReactNode;
  value: string;
  placeholder?: string;
  invalid: boolean;
  errorMessage: string;
  onChange: (value: string) => void;
  sx?: SxProps<Theme>;
};

export function ReportYearTextField({
  label,
  value,
  placeholder,
  invalid,
  errorMessage,
  onChange,
  sx,
}: ReportYearTextFieldProps) {
  return (
    <Tooltip
      open={invalid}
      title={errorMessage}
      placement="bottom-start"
      arrow
      disableHoverListener
      disableFocusListener
      disableTouchListener
      describeChild
    >
      <TextField
        label={label}
        value={value}
        placeholder={placeholder}
        error={invalid}
        size="small"
        inputProps={{ maxLength: 4, inputMode: 'numeric', 'aria-invalid': invalid }}
        sx={sx}
        onChange={(e) => onChange(e.target.value)}
      />
    </Tooltip>
  );
}
