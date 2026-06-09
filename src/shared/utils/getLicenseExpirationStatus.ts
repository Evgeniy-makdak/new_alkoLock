import type { ChipOwnProps } from '@mui/material';
import type { SxProps, Theme } from '@mui/material/styles';
import dayjs, { type Dayjs } from 'dayjs';

export type LicenseExpirationStatus = 'expired' | 'expiring-today' | 'expiring-soon' | null;

type LicenseExpirationDateInput = string | Dayjs | null | undefined;

const toStartOfDay = (date: LicenseExpirationDateInput): dayjs.Dayjs | null => {
  if (date == null || date === '') return null;

  const parsed = dayjs.isDayjs(date) ? date : dayjs(date);
  if (!parsed.isValid()) return null;

  return parsed.startOf('day');
};

export const getLicenseExpirationStatus = (
  licenseExpirationDate?: LicenseExpirationDateInput,
): LicenseExpirationStatus => {
  const expiration = toStartOfDay(licenseExpirationDate ?? null);
  if (!expiration) return null;

  const today = dayjs().startOf('day');
  const daysUntil = expiration.diff(today, 'day');

  if (daysUntil < 0) return 'expired';
  if (daysUntil === 0) return 'expiring-today';
  if (daysUntil <= 7) return 'expiring-soon';
  return null;
};

const blinkKeyframes = {
  '@keyframes licenseExpirationBorderBlink': {
    '0%, 100%': {
      borderColor: '#ed6c02',
      boxShadow: '0 0 0 0 rgba(237, 108, 2, 0.35)',
    },
    '50%': {
      borderColor: '#ffb74d',
      boxShadow: '0 0 8px 2px rgba(237, 108, 2, 0.55)',
    },
  },
};

export const getLicenseExpirationChipProps = (
  status: LicenseExpirationStatus,
): Partial<ChipOwnProps> & { sx?: SxProps<Theme> } => {
  if (!status) return {};

  if (status === 'expired') {
    return { color: 'error', variant: 'filled' };
  }

  if (status === 'expiring-soon') {
    return { color: 'warning', variant: 'filled' };
  }

  return {
    color: 'warning',
    variant: 'outlined',
    sx: {
      ...blinkKeyframes,
      animation: 'licenseExpirationBorderBlink 1.2s ease-in-out infinite',
      borderWidth: 2,
    },
  };
};

export const getLicenseExpirationTextFieldSx = (
  status: LicenseExpirationStatus,
): SxProps<Theme> | undefined => {
  if (!status) return undefined;

  if (status === 'expired') {
    return {
      '& .MuiOutlinedInput-root': {
        backgroundColor: 'rgba(211, 47, 47, 0.08)',
        '& fieldset': {
          borderColor: '#d32f2f',
          borderWidth: 2,
        },
        '&:hover fieldset': {
          borderColor: '#d32f2f',
        },
        '&.Mui-focused fieldset': {
          borderColor: '#d32f2f',
        },
      },
    };
  }

  if (status === 'expiring-soon') {
    return {
      '& .MuiOutlinedInput-root': {
        backgroundColor: 'rgba(237, 108, 2, 0.08)',
        '& fieldset': {
          borderColor: '#ed6c02',
          borderWidth: 2,
        },
        '&:hover fieldset': {
          borderColor: '#ed6c02',
        },
        '&.Mui-focused fieldset': {
          borderColor: '#ed6c02',
        },
      },
    };
  }

  return {
    ...blinkKeyframes,
    '& .MuiOutlinedInput-root': {
      backgroundColor: 'rgba(237, 108, 2, 0.08)',
      animation: 'licenseExpirationBorderBlink 1.2s ease-in-out infinite',
      '& fieldset': {
        borderColor: '#ed6c02',
        borderWidth: 2,
      },
      '&:hover fieldset': {
        borderColor: '#ed6c02',
      },
      '&.Mui-focused fieldset': {
        borderColor: '#ed6c02',
      },
    },
  };
};

export const getLicenseExpirationRowClassName = (
  status: LicenseExpirationStatus,
  styles: {
    licenseExpirationRowExpired: string;
    licenseExpirationRowExpiringSoon: string;
    licenseExpirationRowExpiringToday: string;
  },
): string => {
  if (status === 'expired') return styles.licenseExpirationRowExpired;
  if (status === 'expiring-soon') return styles.licenseExpirationRowExpiringSoon;
  if (status === 'expiring-today') return styles.licenseExpirationRowExpiringToday;
  return '';
};
