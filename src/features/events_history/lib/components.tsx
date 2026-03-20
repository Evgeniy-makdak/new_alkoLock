/* eslint-disable react-hooks/exhaustive-deps */

/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react';
import { useTranslation } from 'react-i18next';

import dayjs, { Dayjs } from 'dayjs';
import 'dayjs/locale/be';
import 'dayjs/locale/en';
import 'dayjs/locale/kk';
import 'dayjs/locale/ky';
import 'dayjs/locale/ru';
import 'dayjs/locale/uz-latn';

import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import { Tooltip, Typography } from '@mui/material';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { beBY, enUS, kzKZ, ruRU } from '@mui/x-date-pickers/locales';

import { TypeEventSelect } from '@entities/type_event_select';
import {
  EventsFilters,
  useEventsFilterPanel,
} from '@features/events_filter_panel/hooks/useEventsFilterPanel';
import { StyledTable } from '@shared/styled_components/styledTable';
import { InputDate } from '@shared/ui/input_date/InputDate';
import { ResetFilters } from '@shared/ui/reset_filters/ResetFilters';
import { Values } from '@shared/ui/search_multiple_select';
import { FilterButton } from '@shared/ui/table_filter_button/FilterButton';
import { TouchLoader } from '@shared/ui/touch_loader';

import i18n from '../../../i18n';
import style from '../ui/EventsHistory.module.scss';

interface EventsFilterPanelProps {
  open: boolean;
  onFilterChange: (values?: Values) => void;
  sortField: 'id' | 'timestamp' | null;
  sortOrder: 'ASC' | 'DESC' | null;
  onRequestSort: (property: 'id' | 'timestamp') => void;
  disableFilters?: boolean;
  // Новые пропсы для сохранения состояния фильтров
  initialTypeEventFilters?: Values;
  initialStartDate?: Dayjs | null;
  initialEndDate?: Dayjs | null;
}

export const Text = (text: string) => (
  <Typography marginTop={1} width={'100%'} textAlign={'center'} fontSize={20} fontWeight={500}>
    {text}
  </Typography>
);

export const getTextList = (isLoading: boolean, length: number) => {
  if (isLoading) return <TouchLoader />;
  if (!isLoading && length > 0) return Text(i18n.t('history.noMoreEvents'));
  if (!isLoading && length === 0) return Text(i18n.t('history.noEvents'));
};

export const TableHeader = ({
  onFilterChange,
  setStartDate,
  setEndDate,
  startDate,
  endDate,
  sortField,
  sortOrder,
  onRequestSort,
  disableFilters = false,
  // Новые пропсы для сохранения состояния фильтров
  initialTypeEventFilters = [],
  initialStartDate = null,
  initialEndDate = null,
}: EventsFilterPanelProps & {
  setStartDate: (date: Dayjs | null) => void;
  setEndDate: (date: Dayjs | null) => void;
  startDate: Dayjs | null;
  endDate: Dayjs | null;
}) => {
  const { t, i18n } = useTranslation();
  const lang = (i18n.language || 'ru').split('-')[0].toLowerCase();

  const pickersLocalePack: Record<string, typeof ruRU | typeof enUS | typeof kzKZ | typeof beBY> = {
    ru: ruRU,
    en: enUS,
    kk: kzKZ,
    ky: ruRU,
    be: beBY,
    uz: enUS,
  };
  const dayjsLocaleByLang: Record<string, string> = {
    ru: 'ru',
    en: 'en',
    kk: 'kk',
    ky: 'ky',
    be: 'be',
    uz: 'uz-latn',
  };
  const pickerPack = pickersLocalePack[lang] || ruRU;
  const localeText = pickerPack.components.MuiLocalizationProvider.defaultProps.localeText;
  const adapterLocale = dayjsLocaleByLang[lang] || 'ru';

  React.useEffect(() => {
    dayjs.locale(adapterLocale);
  }, [adapterLocale]);

  const { filters: eventFilters, setFilters: setEventFilters } = useEventsFilterPanel();
  const [localStartDate, setLocalStartDate] = React.useState<Dayjs | null>(initialStartDate);
  const [localEndDate, setLocalEndDate] = React.useState<Dayjs | null>(initialEndDate);
  const [showFilters, setShowFilters] = React.useState(false);
  const [hoveredColumn, setHoveredColumn] = React.useState<'id' | 'timestamp' | null>(null);
  // Добавляем ключ для принудительного сброса TypeEventSelect
  const [typeEventSelectKey, setTypeEventSelectKey] = React.useState(0);

  // Инициализируем фильтры начальными значениями при монтировании
  React.useEffect(() => {
    setLocalStartDate(initialStartDate);
    setLocalEndDate(initialEndDate);
    setEventFilters('typeEvent', initialTypeEventFilters);
    onFilterChange(initialTypeEventFilters);
    setStartDate(initialStartDate);
    setEndDate(initialEndDate);
  }, []);

  React.useEffect(() => {
    setLocalStartDate(startDate);
    setLocalEndDate(endDate);
  }, [startDate, endDate]);

  const handleStartDateChange = (newValue: Dayjs | null) => {
    setLocalStartDate(newValue);
    if (newValue?.isValid()) setStartDate(newValue);
    else setStartDate(null);
  };

  const handleEndDateChange = (newValue: Dayjs | null) => {
    setLocalEndDate(newValue);
    if (newValue?.isValid()) setEndDate(newValue);
    else setEndDate(null);
  };

  const handleEventFilterChange = (name: keyof EventsFilters, value: Values) => {
    // Фильтруем только валидные числовые значения для API
    const validValues = value.filter((v) => !isNaN(Number(v.value)));
    setEventFilters(name, validValues);
    onFilterChange(validValues);
  };

  const toggleFilters = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowFilters(!showFilters);
  };

  const handleSortClick = (field: 'id' | 'timestamp') => {
    onRequestSort(field);
  };

  const resetAllFilters = () => {
    // Сбрасываем все состояния полностью
    setStartDate(null);
    setEndDate(null);
    setEventFilters('typeEvent', []);
    onFilterChange([]);
    setLocalStartDate(null);
    setLocalEndDate(null);
    // Принудительно сбрасываем TypeEventSelect через изменение ключа
    setTypeEventSelectKey((prev) => prev + 1);
  };

  return (
    <LocalizationProvider
      dateAdapter={AdapterDayjs}
      localeText={localeText}
      adapterLocale={adapterLocale}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <StyledTable.HeaderRow className={style.headerTitleRow}>
            <StyledTable.HeaderCell
              className={style.typeOfEventTitle}
              onClick={() => handleSortClick('id')}
              onMouseEnter={() => setHoveredColumn('id')}
              onMouseLeave={() => setHoveredColumn(null)}
              sx={{ cursor: 'pointer', position: 'relative' }}>
              {t('tables.eventType')}
              <span style={{ display: 'inline-block', position: 'absolute', marginLeft: 10 }}>
                <Tooltip title={t('common.sortTooltip')}>
                  <span style={{ display: 'inline-flex' }}>
                    {(sortField === 'id' || hoveredColumn === 'id') && (
                      <ArrowUpwardIcon
                        sx={{
                          fontSize: '1rem',
                          color: sortField === 'id' ? 'rgba(0, 0, 0, 0.87)' : 'rgba(0, 0, 0, 0.5)',
                          transform:
                            sortField === 'id' && sortOrder === 'DESC'
                              ? 'rotate(180deg)'
                              : 'rotate(0deg)',
                          opacity: sortField === 'id' ? 1 : 0.5,
                        }}
                      />
                    )}
                  </span>
                </Tooltip>
              </span>
            </StyledTable.HeaderCell>

            <StyledTable.HeaderCell className={style.dateTitle}>
              <div className={style.dateTitleContent} style={{ position: 'relative' }}>
                <div
                  onClick={() => handleSortClick('timestamp')}
                  onMouseEnter={() => setHoveredColumn('timestamp')}
                  onMouseLeave={() => setHoveredColumn(null)}
                  style={{
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    position: 'relative',
                    paddingRight: 30,
                  }}>
                  <span>{t('tables.date')}</span>
                  <span
                    style={{
                      display: 'inline-block',
                      position: 'absolute',
                      left: 'calc(100% - 20px)',
                    }}>
                    <Tooltip title={t('common.sortTooltip')}>
                      <span style={{ display: 'inline-flex' }}>
                        {(sortField === 'timestamp' || hoveredColumn === 'timestamp') && (
                          <ArrowUpwardIcon
                            sx={{
                              fontSize: '1rem',
                              color:
                                sortField === 'timestamp'
                                  ? 'rgba(0, 0, 0, 0.87)'
                                  : 'rgba(0, 0, 0, 0.5)',
                              transform:
                                sortField === 'timestamp' && sortOrder === 'DESC'
                                  ? 'rotate(180deg)'
                                  : 'rotate(0deg)',
                              opacity: sortField === 'timestamp' ? 1 : 0.5,
                            }}
                          />
                        )}
                      </span>
                    </Tooltip>
                  </span>
                </div>

                <div
                  style={{
                    position: 'absolute',
                    right: 0,
                    top: '50%',
                    transform: 'translateY(-50%)',
                  }}>
                  <FilterButton
                    open={showFilters}
                    //@ts-expect-error: "Временное решение"
                    toggle={toggleFilters}
                    active={showFilters}
                    testid="filter-button"
                    disabled={disableFilters}
                  />
                </div>
              </div>
            </StyledTable.HeaderCell>

            <StyledTable.HeaderCell className={style.headerCell} />
          </StyledTable.HeaderRow>

          {showFilters && !disableFilters && (
            <StyledTable.HeaderRow className={`${style.tr} ${style.filterRow}`}>
              <StyledTable.HeaderCell
                className={style.typeOfEvent}
                style={{ paddingRight: '5px', width: '160px' }}>
                {/* Добавляем key для принудительного сброса */}
                <TypeEventSelect
                  key={`type-event-select-${typeEventSelectKey}`} // Ключ для принудительного сброса
                  multiple={true}
                  name="typeEvent"
                  setValueStore={(name, value) =>
                    handleEventFilterChange(name as keyof EventsFilters, value)
                  }
                  value={eventFilters.typeEvent} // Используем очищенные фильтры
                  levelEvent={eventFilters.level}
                  label={t('filters.eventType')}
                  getTooltipTitle={(label) => `${label}`}
                  sx={{ width: 150 }}
                />
              </StyledTable.HeaderCell>

              <StyledTable.HeaderCell
                className={style.headerCellDate}
                style={{ paddingLeft: '5px', position: 'relative', width: 'auto' }}>
                <div style={{ display: 'flex', alignItems: 'center', width: '100%', gap: '5px' }}>
                  <div
                    className={style.datePickerContainer}
                    style={{ display: 'flex', gap: '50px', flexShrink: 0 }}>
                    <InputDate
                      value={localStartDate}
                      onChange={handleStartDateChange}
                      tooltipTitle={t('history.startDate')}
                      sx={{
                        '& .MuiInputBase-root': {
                          height: '56px',
                          width: '200px',
                        },
                      }}
                    />
                    <InputDate
                      value={localEndDate}
                      onChange={handleEndDateChange}
                      tooltipTitle={t('history.endDate')}
                      sx={{
                        '& .MuiInputBase-root': {
                          height: '56px',
                          width: '200px',
                        },
                      }}
                    />
                  </div>
                  {/* Десктопная версия - кнопка справа от полей дат */}
                  <div
                    className={style.desktopResetButton}
                    style={{ marginLeft: '50px', marginRight: '20px' }}>
                    <ResetFilters reset={resetAllFilters} />
                  </div>
                </div>
              </StyledTable.HeaderCell>

              <StyledTable.HeaderCell className={style.headerCell} />
            </StyledTable.HeaderRow>
          )}

          {/* Мобильная версия - дополнительный ряд с кнопкой справа от "Тип события" */}
          {showFilters && !disableFilters && (
            <StyledTable.HeaderRow
              className={`${style.tr} ${style.filterRowMobile}`}
              style={{ display: 'none' }}>
              <StyledTable.HeaderCell
                className={style.typeOfEvent}
                style={{ paddingRight: '5px', width: '100%' }}>
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: '12px',
                    width: '100%',
                    flexWrap: 'wrap',
                  }}>
                  <div
                    style={{
                      flex: '1',
                      minWidth: '200px',
                      maxWidth: '280px',
                    }}>
                    <TypeEventSelect
                      key={`type-event-select-mobile-${typeEventSelectKey}`}
                      multiple={true}
                      name="typeEvent"
                      setValueStore={(name, value) =>
                        handleEventFilterChange(name as keyof EventsFilters, value)
                      }
                      value={eventFilters.typeEvent}
                      levelEvent={eventFilters.level}
                      label={t('filters.eventType')}
                      getTooltipTitle={(label) => `${label}`}
                      sx={{ width: '100%' }}
                    />
                  </div>
                  <div
                    style={{
                      flexShrink: 0,
                      minWidth: '140px',
                    }}>
                    <ResetFilters reset={resetAllFilters} />
                  </div>
                </div>
              </StyledTable.HeaderCell>

              <StyledTable.HeaderCell
                className={style.headerCellDate}
                style={{ paddingLeft: '5px', position: 'relative', width: '100%' }}>
                <div
                  style={{ display: 'flex', flexDirection: 'column', width: '100%', gap: '12px' }}>
                  <div
                    className={style.datePickerContainer}
                    style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                    <InputDate
                      value={localStartDate}
                      onChange={handleStartDateChange}
                      tooltipTitle={t('history.startDate')}
                      sx={{
                        '& .MuiInputBase-root': {
                          height: '40px',
                          width: '180px',
                        },
                      }}
                    />
                    <InputDate
                      value={localEndDate}
                      onChange={handleEndDateChange}
                      tooltipTitle={t('history.endDate')}
                      sx={{
                        '& .MuiInputBase-root': {
                          height: '40px',
                          width: '180px',
                        },
                      }}
                    />
                  </div>
                </div>
              </StyledTable.HeaderCell>

              <StyledTable.HeaderCell className={style.headerCell} />
            </StyledTable.HeaderRow>
          )}
        </thead>
      </table>
    </LocalizationProvider>
  );
};
