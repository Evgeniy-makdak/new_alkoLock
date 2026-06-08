import type { ReactNode } from 'react';

import { TextField, Tooltip } from '@mui/material';
import type { SxProps, Theme } from '@mui/material/styles';

import { OverflowTooltip } from '@shared/ui/overflow_tooltip/OverflowTooltip';

type ReportYearTextFieldProps = {
  label: ReactNode;
  value: string;
  placeholder?: string;
  invalid: boolean;
  errorMessage: string;
  onChange: (value: string) => void;
  sx?: SxProps<Theme>;
  overflowTooltip?: boolean;
};

export function ReportYearTextField({
  label,
  value,
  placeholder,
  invalid,
  errorMessage,
  onChange,
  sx,
  overflowTooltip = false,
}: ReportYearTextFieldProps) {
  const labelText = typeof label === 'string' ? label.trim() : '';
  const placeholderText = placeholder?.trim() ?? '';
  const overflowTitle = labelText || placeholderText;

  const field = (
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

  if (overflowTooltip && overflowTitle) {
    return <OverflowTooltip title={overflowTitle}>{field}</OverflowTooltip>;
  }

  return field;
}
