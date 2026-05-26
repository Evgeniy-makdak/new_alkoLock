import type { SxProps, Theme } from '@mui/material';

export const reportFilterControlSx: SxProps<Theme> = {
  flex: '0 1 240px',
  minWidth: 220,
  maxWidth: 280,
  width: 'auto',
  boxSizing: 'border-box',
};

/** Диапазон дата + время — шире обычного селекта. */
export const reportFilterDateTimeControlSx: SxProps<Theme> = {
  flex: '0 1 400px',
  minWidth: 360,
  maxWidth: 480,
  width: '100%',
  boxSizing: 'border-box',
};

export const reportFilterAutocompleteSlotProps = {
  popper: {
    sx: { minWidth: 290 },
  },
  paper: {
    sx: { minWidth: 290 },
  },
} as const;

/** Компактные контролы в модалке «Новый отчёт» (как дата/время, size=small). */
export const reportFilterModalControlSx: SxProps<Theme> = {
  flex: '0 0 188px',
  minWidth: 132,
  maxWidth: 188,
  width: 188,
  boxSizing: 'border-box',
  '& .MuiFormControl-root': {
    width: '100%',
    minWidth: 0,
  },
  '& .MuiInputBase-root': {
    minHeight: 40,
  },
  '& .MuiInputLabel-root': {
    maxWidth: 'calc(100% - 14px)',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  '& .MuiInputBase-input': {
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
};

export const reportFilterModalDateTimeControlSx: SxProps<Theme> = {
  flex: '0 1 auto',
  minWidth: 0,
  maxWidth: 'none',
  width: 'auto',
  boxSizing: 'border-box',
};
