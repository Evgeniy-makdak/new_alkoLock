import { GlobalStyles } from '@mui/material';

export const RoleChipStyles = () => (
  <GlobalStyles
    styles={{
      '.MuiChip-colorInfo': {
        backgroundColor: 'rgba(0, 0, 0, 0.08) !important',
        color: 'rgba(0, 0, 0, 0.87) !important',
        '&:hover': {
          backgroundColor: 'rgba(0, 0, 0, 0.12) !important',
        },
      },
      '.MuiChip-filledInfo': {
        backgroundColor: 'rgba(0, 0, 0, 0.08) !important',
        color: 'rgba(0, 0, 0, 0.87) !important',
        '&:hover': {
          backgroundColor: 'rgba(0, 0, 0, 0.12) !important',
        },
      },
      '.MuiChip-outlinedInfo': {
        backgroundColor: 'transparent !important',
        borderColor: 'rgba(0, 0, 0, 0.23) !important',
        color: 'rgba(0, 0, 0, 0.87) !important',
      },
    }}
  />
);
