import { FC, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { CalendarToday, Close } from '@mui/icons-material';
import { Box, Button as MuiButton, Popover, TextField, Typography } from '@mui/material';

import { CarColorSelect } from '@entities/car_color_select';
import { TransportTypeSelect } from '@entities/transport_type_select';
import { testids } from '@shared/const/testid';
import type { ID } from '@shared/types/BaseQueryTypes';
import { Button } from '@shared/ui/button';
import { Loader } from '@shared/ui/loader';

import { useCarAddChangeForm } from '../hooks/useCarAddChangeForm';
import style from './CarAddChangeForm.module.scss';

type CarAddMobileChangeFormProps = {
  closeModal: () => void;
  id?: ID;
};

export const CarAddMobileChangeForm: FC<CarAddMobileChangeFormProps> = ({ closeModal, id }) => {
  const { t } = useTranslation();
  const {
    errorMark,
    errorModel,
    errorVin,
    errorRegistrationNumber,
    errorYear,
    errorType,
    errorColor,
    selectType,
    selectColor,
    handleSubmit,
    onSetYearText,
    onSelect,
    register,
    yearTextValue,
    isLoadingCar,
    isDataLoaded,
    submitDisabled,
  } = useCarAddChangeForm(id, closeModal);

  const [yearPickerAnchor, setYearPickerAnchor] = useState<HTMLButtonElement | null>(null);
  const calendarButtonRef = useRef<HTMLButtonElement>(null);
  const currentYear = new Date().getFullYear();

  // Обработчик потери фокуса с обрезкой пробелов
  const handleBlurWithTrim = (fieldName: any) => (e: React.FocusEvent<HTMLInputElement>) => {
    const trimmedValue = e.target.value.trim().replace(/\s+/g, ' ');
    if (trimmedValue !== e.target.value) {
      // Создаем синтетическое событие с обрезанным значением
      const syntheticEvent = {
        target: {
          value: trimmedValue,
          name: e.target.name,
        },
      } as React.ChangeEvent<HTMLInputElement>;

      // Вызываем обработчик react-hook-form
      register(fieldName).onChange(syntheticEvent);
    }
  };

  // Функция для обработки выбора года через текстовое поле
  const handleYearChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Оставляем только цифры
    const numbersOnly = value.replace(/\D/g, '');

    // Ограничиваем длину до 4 символов (год)
    if (numbersOnly.length <= 4) {
      onSetYearText(numbersOnly);
    }
  };

  // Функция для открытия выбора года
  const handleOpenYearPicker = (event: React.MouseEvent<HTMLButtonElement>) => {
    setYearPickerAnchor(event.currentTarget);
  };

  // Функция для закрытия выбора года
  const handleCloseYearPicker = () => {
    setYearPickerAnchor(null);
  };

  // Функция для выбора года из календаря
  const handleSelectYear = (year: number) => {
    onSetYearText(year.toString());
    handleCloseYearPicker();
  };

  const generateYears = () => {
    const years = [];
    const startYear = 1980;
    const endYear = currentYear + 1;

    for (let year = endYear; year >= startYear; year--) {
      years.push(year);
    }
    return years;
  };

  const years = generateYears();

  return (
    <Loader isLoading={isLoadingCar}>
      <div className={style.mobileForm}>
        <div className={style.mobileFormHeader}>
          <Typography fontWeight={600} variant="h6">
            {id ? 'Редактирование ТС' : 'Добавление ТС'}
          </Typography>
          <button className={style.closeMobileButton} onClick={closeModal}>
            <Close fontSize="small" />
          </button>
        </div>

        {!isLoadingCar && isDataLoaded && (
          <form onSubmit={handleSubmit} className={style.mobileFormContent}>
            <div className={style.mobileInputsColumn}>
              <TextField
                helperText={<span>{errorMark}</span>}
                error={!!errorMark}
                {...register('mark')}
                label={t('form.make')}
                fullWidth
                onBlur={handleBlurWithTrim('mark')}
              />
              <TextField
                helperText={<span>{errorModel}</span>}
                error={!!errorModel}
                {...register('model')}
                label={t('form.model')}
                fullWidth
                onBlur={handleBlurWithTrim('model')}
              />
              <TransportTypeSelect
                name={'type'}
                testid={testids.page_transports.transports_widget_add_car_popup.CAR_POPUP_TYPE}
                value={selectType}
                setValueStore={onSelect}
                error={!!errorType}
                label={t('form.type')}
                helperText={errorType}
                slotProps={{
                  popper: {
                    style: {
                      zIndex: 9999,
                    },
                    modifiers: [
                      {
                        name: 'preventOverflow',
                        options: {
                          boundary: 'viewport',
                        },
                      },
                    ],
                  },
                  paper: {
                    style: {
                      maxHeight: '300px',
                      zIndex: 9999,
                    },
                  },
                }}
                ListboxProps={{
                  style: {
                    maxHeight: '300px',
                  },
                }}
              />
              <TextField
                helperText={<span>{errorVin}</span>}
                error={!!errorVin}
                {...register('vin')}
                label={'VIN'}
                fullWidth
                onBlur={handleBlurWithTrim('vin')}
              />
              <CarColorSelect
                name={'color'}
                testid={testids.page_transports.transports_widget_add_car_popup.CAR_POPUP_COLOR}
                value={selectColor}
                setValueStore={onSelect}
                error={!!errorColor}
                label={t('form.color')}
                helperText={errorColor}
                slotProps={{
                  popper: {
                    style: {
                      zIndex: 9999,
                    },
                    modifiers: [
                      {
                        name: 'preventOverflow',
                        options: {
                          boundary: 'viewport',
                        },
                      },
                    ],
                  },
                  paper: {
                    style: {
                      maxHeight: '300px',
                      zIndex: 9999,
                    },
                  },
                }}
                ListboxProps={{
                  style: {
                    maxHeight: '300px',
                  },
                }}
              />
              <TextField
                helperText={<span>{errorRegistrationNumber}</span>}
                error={!!errorRegistrationNumber}
                {...register('registrationNumber')}
                label={t('form.stateNumber')}
                fullWidth
                onBlur={handleBlurWithTrim('registrationNumber')}
              />

              {/* Поле года выпуска с иконкой календаря */}
              <div className={style.dateFieldContainer}>
                <TextField
                  helperText={<span>{errorYear}</span>}
                  error={!!errorYear}
                  value={yearTextValue || ''}
                  onChange={handleYearChange}
                  label={t('form.yearOfManufacture')}
                  fullWidth
                  InputLabelProps={{
                    shrink: true,
                  }}
                  inputProps={{
                    'data-testid':
                      testids.page_transports.transports_widget_add_car_popup.CAR_POPUP_YEAR,
                    inputMode: 'numeric',
                    pattern: '[0-9]*',
                    maxLength: 4,
                    placeholder: '2024',
                  }}
                />
                <button
                  ref={calendarButtonRef}
                  type="button"
                  className={style.calendarButton}
                  onClick={handleOpenYearPicker}
                  aria-label="Выбрать год из календаря">
                  <CalendarToday fontSize="small" />
                </button>
              </div>
            </div>

            <div className={style.mobileFormActions}>
              <Button
                type="submit"
                disabled={submitDisabled}
                sx={{
                  padding: '12px !important',
                  fontSize: '16px !important',
                  fontWeight: '600 !important',
                }}
                fullWidth>
                {id ? t('common.save') : t('common.add')}
              </Button>
              <Button
                onClick={closeModal}
                sx={{
                  padding: '12px !important',
                  fontSize: '16px !important',
                }}
                fullWidth>
                {t('common.cancel')}
              </Button>
            </div>
          </form>
        )}
      </div>

      {/* Поповер для выбора года */}
      <Popover
        open={Boolean(yearPickerAnchor)}
        anchorEl={yearPickerAnchor}
        onClose={handleCloseYearPicker}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'left',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'left',
        }}
        slotProps={{
          paper: {
            sx: {
              maxHeight: 300,
              width: 200,
              p: 1,
              zIndex: 9999,
            },
          },
        }}>
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            gap: 0.5,
            maxHeight: 280,
            overflowY: 'auto',
          }}>
          <Typography
            variant="subtitle2"
            sx={{
              p: 1,
              textAlign: 'center',
              borderBottom: '1px solid',
              borderColor: 'divider',
              mb: 0.5,
            }}>
            Выберите год
          </Typography>
          {years.map((year) => (
            <MuiButton
              key={year}
              variant={yearTextValue === year.toString() ? 'contained' : 'outlined'}
              size="small"
              onClick={() => handleSelectYear(year)}
              sx={{
                minWidth: 'auto',
                fontSize: '0.875rem',
                py: 0.5,
                justifyContent: 'center',
              }}>
              {year}
            </MuiButton>
          ))}
        </Box>
      </Popover>
    </Loader>
  );
};
