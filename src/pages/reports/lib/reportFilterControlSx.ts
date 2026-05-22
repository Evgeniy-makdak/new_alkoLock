import type { SxProps, Theme } from '@mui/material';

export const reportFilterControlSx: SxProps<Theme> = {
  flex: '0 1 270px',
  minWidth: 250,
  maxWidth: 310,
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
