import { type Dayjs } from 'dayjs';
import 'dayjs/locale/ru';

import { type Theme, createTheme } from '@mui/material';

import { InputDate } from '../input_date/InputDate';
import style from './InputDate.module.scss';

const newTheme = (theme?: Theme) => ({
  ...theme,
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
          backgroundColor: '#f1f1f1',
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
const theme = createTheme(newTheme());
export const InputsDates = ({
  valueStartDatePicker,
  valueEndDatePicker,
  onChangeStartDate,
  onChangeEndDate,
  inputStartTestId,
  inputEndTestId,
}: InputsDatesProps) => {
  return (
    <div className={style.datePickers}>
      <InputDate
        theme={theme}
        testid={inputStartTestId}
        value={valueStartDatePicker}
        onChange={onChangeStartDate}
      />
      <InputDate
        theme={theme}
        testid={inputEndTestId}
        value={valueEndDatePicker}
        onChange={onChangeEndDate}
      />
    </div>
  );
};
