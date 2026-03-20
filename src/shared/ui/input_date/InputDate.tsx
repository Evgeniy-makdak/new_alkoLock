/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { FC, forwardRef, useCallback, useId, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import dayjs, { Dayjs } from 'dayjs';
import 'dayjs/locale/ru';
import updateLocale from 'dayjs/plugin/updateLocale';
import omit from 'lodash/omit';

import { IconButton, MenuItem, Theme, ThemeProvider, Tooltip, createTheme } from '@mui/material';
import { DatePicker, DatePickerProps, PickersActionBarProps } from '@mui/x-date-pickers';

import { MuiLocalizationProvider } from '@shared/components/mui_localization_provider';

interface InputDateProps extends DatePickerProps<Dayjs> {
  testid?: string;
  tooltipTitle?: string;
}

dayjs.extend(updateLocale);
dayjs.updateLocale('ru', {
  weekStart: 1,
});

const createTooltipButton = (tooltipTitle: string, ariaLabel: string, extraOnClick?: () => void) =>
  // eslint-disable-next-line react/display-name
  forwardRef<HTMLButtonElement, Record<string, unknown>>((props, ref) => {
    const { onClick, ...rest } = omit(props, 'title') as Record<string, unknown> & {
      onClick?: (e: React.MouseEvent) => void;
    };
    return (
      <Tooltip title={tooltipTitle}>
        <IconButton
          {...rest}
          ref={ref}
          aria-label={ariaLabel}
          onClick={(e) => {
            onClick?.(e);
            extraOnClick?.();
          }}
        />
      </Tooltip>
    );
  });

const ClearActionMenuItem = (props: PickersActionBarProps) => {
  const { t } = useTranslation();
  const { onClear } = props;
  const id = useId();
  return (
    <MenuItem
      data-mui-test="clear-action-button"
      onClick={() => onClear()}
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
  minDateFlag?: boolean; // Флаг для установки минимальной даты (завтрашний день)
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

export const InputDate: FC<MyInputDateProps> = (props) => {
  const { t } = useTranslation();
  const { tooltipTitle } = props;
  const calendarTooltip = tooltipTitle ?? t('datePicker.openCalendar');
  const theme = props.theme || {};
  const myTheme = createTheme(newTheme() as Theme);
  const textFieldProps = props?.slotProps?.textField || {};
  const [open, setOpen] = useState(false);
  const minDate = props.minDateFlag ? dayjs().add(1, 'day') : undefined;

  const handleOpen = useCallback(() => {
    setOpen(true);
  }, []);

  const handleClose = useCallback(() => {
    setOpen(false);
  }, []);

  const OpenPickerButton = useMemo(
    () => createTooltipButton(calendarTooltip, calendarTooltip, handleOpen),
    [calendarTooltip, handleOpen],
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
  const ClearButton = useMemo(
    () => createTooltipButton(t('datePicker.clearDate'), t('datePicker.clearDate')),
    [t],
  );

  return (
    <MuiLocalizationProvider>
      <ThemeProvider theme={{ ...myTheme, ...theme }}>
        <DatePicker
          {...props}
          open={open}
          onOpen={handleOpen}
          onClose={handleClose}
          minDate={minDate}
          slots={{
            actionBar: ClearActionMenuItem,
            openPickerButton: OpenPickerButton,
            nextIconButton: NextIconButton,
            previousIconButton: PreviousIconButton,
            switchViewButton: SwitchViewButton,
            clearButton: ClearButton,
          }}
          slotProps={{
            field: { clearable: true },
            actionBar: {
              actions: ['clear'],
              id: 'ACTION_BAR',
            },
            popper: {
              id: `POPER ${props.testid}_POPER`,
              onKeyDown: (e: React.KeyboardEvent) => {
                e.stopPropagation();
                // Добавляем обработчик для сохранения фокуса
                if (e.key === 'Escape') {
                  handleClose();
                }
              },
            },
            textField: {
              ...textFieldProps,
              id: `TEXT_FIELD ${props.testid}_TEXT_FIELD`,
            },
            desktopPaper: {
              onKeyDown: (e: React.KeyboardEvent) => {
                // Предотвращаем закрытие при навигации
                if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
                  e.stopPropagation();
                }
              },
            },
          }}
        />
      </ThemeProvider>
    </MuiLocalizationProvider>
  );
};
