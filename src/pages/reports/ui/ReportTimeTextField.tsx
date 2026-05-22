import type { ReactNode } from 'react';

import { TextField, Tooltip } from '@mui/material';
import type { SxProps, Theme } from '@mui/material/styles';

type ReportTimeTextFieldProps = {
  label: ReactNode;
  value: string;
  placeholder?: string;
  invalid: boolean;
  errorMessage: string;
  onChange: (value: string) => void;
  className?: string;
  sx?: SxProps<Theme>;
};

/** Поле времени в строке фильтров: ошибка в tooltip, без helperText (не ломает flex-вёрстку). */
export function ReportTimeTextField({
  label,
  value,
  placeholder,
  invalid,
  errorMessage,
  onChange,
  className,
  sx,
}: ReportTimeTextFieldProps) {
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
        className={className}
        label={label}
        value={value}
        placeholder={placeholder}
        error={invalid}
        size="small"
        inputProps={{ maxLength: 5, inputMode: 'numeric', 'aria-invalid': invalid }}
        sx={sx}
        onChange={(e) => onChange(e.target.value)}
      />
    </Tooltip>
  );
}
