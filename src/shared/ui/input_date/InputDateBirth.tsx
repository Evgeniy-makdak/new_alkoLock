/* eslint-disable prettier/prettier */

/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { type FC, forwardRef, useId, useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import dayjs, { Dayjs } from 'dayjs';
import 'dayjs/locale/ru';
import updateLocale from 'dayjs/plugin/updateLocale';
import omit from 'lodash/omit';

import {
  IconButton,
  MenuItem,
  type Theme,
  ThemeProvider,
  Tooltip,
  createTheme,
} from '@mui/material';
import { DatePicker, type DatePickerProps, type PickersActionBarProps } from '@mui/x-date-pickers';

import { MuiLocalizationProvider } from '@shared/components/mui_localization_provider';

interface InputDateProps extends DatePickerProps<Dayjs> {
  testid?: string;
}

dayjs.extend(updateLocale);
dayjs.updateLocale('ru', {
  weekStart: 1,
});

const createTooltipButton = (tooltipTitle: string, ariaLabel: string) =>
  // eslint-disable-next-line react/display-name
  forwardRef<HTMLButtonElement, Record<string, unknown>>((props, ref) => (
    <Tooltip title={tooltipTitle}>
      <IconButton {...omit(props, 'title')} ref={ref} aria-label={ariaLabel} />
    </Tooltip>
  ));

const ClearActionMenuItem = (props: PickersActionBarProps) => {
  const { t } = useTranslation();
  const { onClear } = props;
  const id = useId();
  return (
    <MenuItem
      data-mui-test="clear-action-button"
      onClick={() => {
        onClear();
      }}
      style={{
        alignSelf: 'center',
        backgroundColor: '#e6e6e6',
        color: '#1976d2',
        borderRadius: '3px',
      }}
      key={id}>
      {t('datePicker.clear')}
    </MenuItem>
  );
};

type MyInputDateProps = {
  theme?: Theme;
} & InputDateProps;

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
    MuiPickersSlideTransition: {
      styleOverrides: {
        root: {
          maxHeight: 200,
          minHeight: '150px !important',
          height: 200,
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
  },
});

export const InputDateBirth: FC<MyInputDateProps> = (props) => {
  const { t } = useTranslation();
  const theme = props.theme || {};
  const myTheme = createTheme(newTheme() as Theme);
  const textFieldProps = props?.slotProps?.textField || {};
  const maxDate = dayjs().subtract(1, 'day');

  const OpenPickerButton = useMemo(
    () => createTooltipButton(t('datePicker.openCalendar'), t('datePicker.openCalendar')),
    [t],
  );
  const NextIconButton = useMemo(
    () => createTooltipButton(t('datePicker.nextMonth'), t('datePicker.nextMonth')),
    [t],
  );
  const PreviousIconButton = useMemo(
    () => createTooltipButton(t('datePicker.previousMonth'), t('datePicker.previousMonth')),
    [t],
  );
  const SwitchViewButton = useMemo(
    () => createTooltipButton(t('datePicker.switchView'), t('datePicker.switchView')),
    [t],
  );

  return (
    <MuiLocalizationProvider>
      <ThemeProvider theme={{ ...myTheme, ...theme }}>
        <DatePicker
          {...props}
          maxDate={maxDate}
          slots={{
            actionBar: ClearActionMenuItem,
            openPickerButton: OpenPickerButton,
            nextIconButton: NextIconButton,
            previousIconButton: PreviousIconButton,
            switchViewButton: SwitchViewButton,
          }}
          slotProps={{
            field: { clearable: true },
            actionBar: {
              actions: ['clear'],
              id: 'ACTION_BAR',
            },
            popper: {
              id: `POPER ${props.testid}_POPER`,
            },
            textField: {
              ...textFieldProps,
              id: `TEXT_FIELD ${props.testid}_TEXT_FIELD`,
            },
          }}
        />
      </ThemeProvider>
    </MuiLocalizationProvider>
  );
};
