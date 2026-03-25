import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { type Dayjs } from 'dayjs';
import 'dayjs/locale/ru';

import { type Theme, createTheme } from '@mui/material';
import { useTheme } from '@mui/material/styles';

import { InputDate } from '../input_date/InputDate';
import style from './InputDate.module.scss';

/** Тема для пары дат в шапке таблиц: наследует светлую/тёмную палитру приложения */
function buildInputsDatesTheme(outer: Theme) {
  const isDark = outer.palette.mode === 'dark';

  return createTheme(outer, {
    components: {
      'MuiDayCalendar-slideTransition': {
        styleOverrides: {
          root: {
            maxHeight: 200,
            minHeight: '100px !important',
            height: 200,
          },
        },
      },
      MuiInputBase: {
        styleOverrides: {
          root: {
            width: '181px',
            height: '30px',
            backgroundColor: isDark ? 'rgba(255, 255, 255, 0.06)' : '#f1f1f1',
            borderRadius: 12,
            transition: 'background-color 0.15s ease',
          },
        },
      },
      MuiOutlinedInput: {
        styleOverrides: {
          root: {
            borderRadius: 12,
            ...(isDark
              ? {
                  '&:hover': {
                    backgroundColor: 'rgba(255, 255, 255, 0.09)',
                  },
                  '& .MuiOutlinedInput-notchedOutline': {
                    borderColor: 'rgba(255, 255, 255, 0.14)',
                  },
                  '&:hover .MuiOutlinedInput-notchedOutline': {
                    borderColor: 'rgba(255, 255, 255, 0.22)',
                  },
                  '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                    borderColor: 'rgba(144, 202, 249, 0.45)',
                    borderWidth: 1,
                  },
                }
              : {
                  '& .MuiOutlinedInput-notchedOutline': {
                    borderColor: 'rgba(0, 0, 0, 0.14)',
                  },
                  '&:hover .MuiOutlinedInput-notchedOutline': {
                    borderColor: 'rgba(0, 0, 0, 0.22)',
                  },
                }),
          },
        },
      },
      MuiPickersSlideTransition: {
        styleOverrides: {
          root: {
            maxHeight: '200px',
            minHeight: '150px !important',
            height: '200px',
          },
        },
      },
      MuiPickersLayout: {
        styleOverrides: {
          root: {
            paddingBottom: '20px',
            display: 'flex',
            flexDirection: 'column',
            maxHeight: 350,
          },
        },
      },
      MuiDateCalendar: {
        styleOverrides: {
          root: {
            height: 'auto',
          },
        },
      },
    },
  });
}

interface InputsDatesProps {
  inputStartTestId?: string;
  inputEndTestId?: string;
  maxDate?: Dayjs;
  minDate?: Dayjs;
  onChangeStartDate?: (value: Dayjs) => void;
  onChangeEndDate?: (value: Dayjs) => void;
  valueStartDatePicker?: Dayjs;
  valueEndDatePicker?: Dayjs;
  onClear?: () => void;
}

export const InputsDates = ({
  valueStartDatePicker,
  valueEndDatePicker,
  onChangeStartDate,
  onChangeEndDate,
  inputStartTestId,
  inputEndTestId,
}: InputsDatesProps) => {
  const { t } = useTranslation();
  const placeholder = t('datePlaceholder');
  const outerTheme = useTheme();
  const pickerTheme = useMemo(() => buildInputsDatesTheme(outerTheme), [outerTheme]);

  return (
    <div className={style.datePickers}>
      <InputDate
        theme={pickerTheme}
        testid={inputStartTestId}
        value={valueStartDatePicker}
        onChange={onChangeStartDate}
        slotProps={{ textField: { placeholder } }}
      />
      <InputDate
        theme={pickerTheme}
        testid={inputEndTestId}
        value={valueEndDatePicker}
        onChange={onChangeEndDate}
        slotProps={{ textField: { placeholder } }}
      />
    </div>
  );
};
