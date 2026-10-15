import type { SxProps, Theme } from '@mui/material';

export const reportFilterControlSx: SxProps<Theme> = {
  flex: '0 1 auto',
  width: 'max-content',
  minWidth: 160,
  maxWidth: '100%',
  boxSizing: 'border-box',
};

/** Диапазон дата + время — шире обычного селекта. */
export const reportFilterDateTimeControlSx: SxProps<Theme> = {
  flex: '0 1 auto',
  minWidth: 'max-content',
  maxWidth: '100%',
  width: 'max-content',
  boxSizing: 'border-box',
};

export const reportFilterAutocompleteSlotProps = {
  popper: {
    sx: { minWidth: 240 },
  },
  paper: {
    sx: { minWidth: 240 },
  },
} as const;

/** Компактные контролы в модалке «Новый отчёт» — ширина по контенту (лейбл + значение + крестик). */
export const reportFilterModalControlSx: SxProps<Theme> = {
  width: 'max-content',
  minWidth: 200,
  maxWidth: '100%',
  boxSizing: 'border-box',
  '& .MuiFormControl-root': {
    width: 'max-content',
    minWidth: 'inherit',
    maxWidth: '100%',
    overflow: 'visible',
  },
  '& .MuiAutocomplete-root': {
    width: 'max-content',
    minWidth: 'inherit',
    maxWidth: '100%',
  },
  '& .MuiOutlinedInput-root': {
    minHeight: 40,
    width: 'max-content',
    minWidth: 'inherit',
    maxWidth: '100%',
  },
  // Лейбл не должен вылезать за рамку: ширина контрола задаётся снаружи по длине текста.
  '& .MuiInputLabel-root': {
    maxWidth: 'calc(100% - 24px)',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  '& .MuiInputLabel-root.MuiInputLabel-shrink': {
    maxWidth: 'calc(100% - 24px)',
  },
  // Без field-sizing: content — иначе высота input сжимается и значение «съезжает».
  '& .MuiInputBase-input': {
    width: 'auto',
    minWidth: '12ch',
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

/** Полноширинные контролы в диалогах «Добавить сортировку / группировку». */
export const reportFilterDialogControlSx: SxProps<Theme> = {
  width: '100%',
  minWidth: 0,
  maxWidth: '100%',
  boxSizing: 'border-box',
  '& .MuiFormControl-root': {
    width: '100%',
    minWidth: 0,
    maxWidth: '100%',
  },
  '& .MuiAutocomplete-root': {
    width: '100%',
    minWidth: 0,
    maxWidth: '100%',
  },
  '& .MuiOutlinedInput-root': {
    minHeight: 40,
    width: '100%',
    minWidth: 0,
    maxWidth: '100%',
  },
  '& .MuiInputLabel-root': {
    maxWidth: 'calc(100% - 32px)',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  '& .MuiInputBase-input': {
    width: '100%',
    minWidth: 0,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
};

export const reportFilterDialogSelectSx: SxProps<Theme> = {
  width: '100%',
  '& .MuiSelect-select': {
    display: 'flex',
    alignItems: 'center',
  },
  '& .MuiSelect-icon': {
    top: '50%',
    right: 8,
    transform: 'translateY(-50%)',
  },
  '& .MuiSelect-iconOpen': {
    transform: 'translateY(-50%) rotate(180deg)',
  },
};
