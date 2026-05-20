import type { SxProps, Theme } from '@mui/material';

export const reportFilterControlSx: SxProps<Theme> = {
  flex: '1 1 300px',
  minWidth: 300,
  maxWidth: 420,
  width: 'auto',
};

export const reportFilterAutocompleteSlotProps = {
  popper: {
    sx: { minWidth: 300 },
  },
  paper: {
    sx: { minWidth: 300 },
  },
} as const;
