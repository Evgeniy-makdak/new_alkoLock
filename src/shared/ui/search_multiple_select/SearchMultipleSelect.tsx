/* eslint-disable react-hooks/exhaustive-deps */
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import {
  Autocomplete,
  type AutocompleteInputChangeReason,
  type AutocompleteProps,
  type AutocompleteRenderInputParams,
  Chip,
  TextField,
  Tooltip,
  createFilterOptions,
} from '@mui/material';

import { debounce } from '@shared/lib/debounce';

import style from './SearchMultipleSelect.module.scss';
import {
  type OnChange,
  type Value,
  type Values,
  isOptionEqualToValue,
  renderOptions,
} from './helpers';

// TODO => почистить тип пропсов, очень много лишнего (не используется)
export type SearchMultipleSelectProps<T> = {
  testid?: string;
  error?: boolean;
  label?: string;
  isLoading?: boolean;
  values: Values;
  name: keyof T | string;
  value?: Values;
  onSelect?: (value: number[] | number) => void;
  onInputChange?: (value: string) => void;
  onReset?: () => void;
  setValueStore?: (
    type: keyof T | string,
    value: string | Values | Value | (string | Values | Value)[],
  ) => void;
  helperText?: string;
  serverFilter?: boolean;
  allowCustomEvents?: boolean;
  getTooltipTitle?: (value: string) => string;
} & Partial<
  Omit<AutocompleteProps<Value, boolean, boolean, boolean>, 'onInputChange' | 'value' | 'name'>
>;

export function SearchMultipleSelect<T>({
  testid,
  label,
  error,
  isLoading,
  values,
  value = [],
  multiple,
  name,
  helperText,
  allowCustomEvents,
  setValueStore,
  onInputChange,
  serverFilter = true,
  getTooltipTitle,
  slotProps: userSlotProps,
  ...rest
}: SearchMultipleSelectProps<T>) {
  const { t } = useTranslation();
  const clearLabel = t('datePicker.clear');
  const [inputState, setInputState] = useState('');
  const [focused, setFocused] = useState(false);
  const debouncedFunc = debounce({ time: 500, callBack: onInputChange });
  useEffect(() => {
    if (allowCustomEvents) return;
    const onReset = () => {
      setInputState('');
    };
    window.addEventListener('resetFilters', onReset);

    return () => {
      window.removeEventListener('resetFilters', onReset);
    };
  }, []);
  const renderInput = (params: AutocompleteRenderInputParams) => {
    const { InputProps = {}, ...restParams } = params;
    const inputProps = InputProps as {
      onFocus?: (e: React.FocusEvent) => void;
      onBlur?: (e: React.FocusEvent) => void;
    };
    const prop = {
      ...restParams,
      InputProps: {
        ...InputProps,
        onFocus: (e: React.FocusEvent) => {
          inputProps.onFocus?.(e);
          setFocused(true);
        },
        onBlur: (e: React.FocusEvent) => {
          inputProps.onBlur?.(e);
          setFocused(false);
        },
      },
      inputProps: {
        ...params.inputProps,
        'data-testid': testid,
      },
    };
    const hasValue = (value && value.length > 0) || !!inputState;
    // Пустая строка label у OutlinedInput оставляет «вырез» в рамке — пропадает верхняя граница (иногда нестабильно из‑за legend)
    const displayLabel = typeof label === 'string' && label.trim() !== '' ? label : undefined;
    const inputPropsNoLabel = displayLabel === undefined ? { notched: false as const } : {};
    return (
      <TextField
        helperText={helperText}
        {...prop}
        label={displayLabel}
        error={error}
        InputProps={{
          ...prop.InputProps,
          ...inputPropsNoLabel,
        }}
        InputLabelProps={{
          shrink: focused || !!hasValue || displayLabel === undefined,
        }}
      />
    );
  };

  const renderTags = (value: Value[], getTagProps: any) => {
    return value.map((option, index) => {
      const { key: tagKey, ...tagProps } = getTagProps({ index });
      return (
        <Tooltip
          key={option.value}
          title={getTooltipTitle ? getTooltipTitle(option.label) : option.label}>
          <span className={style.chipWrapper}>
            <Chip
              key={tagKey}
              label={option.label}
              {...tagProps}
              sx={{
                maxWidth: '100%',
                '& .MuiChip-label': {
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                },
              }}
            />
          </span>
        </Tooltip>
      );
    });
  };

  const onInputChangeHandler = (
    _event: React.SyntheticEvent<Element, Event>,
    value: string,
    reason: AutocompleteInputChangeReason,
  ) => {
    if (reason === 'reset' && value !== '[object Object]') {
      setInputState(value);
    }
    if (reason === 'clear') {
      setValueStore(name, []);
      setInputState('');
      if (!debouncedFunc) return;

      debouncedFunc('');
    }
    if (reason !== 'input') return;
    setInputState(value);
    if (!debouncedFunc) return;

    debouncedFunc(value);
  };

  const onChange: OnChange = (_event, value, reason) => {
    if (reason === 'clear' || !value) {
      // Очистить значение при сбросе или отсутствии значения
      setValueStore(name, []);
      setInputState('');
      return;
    }

    if (reason === 'selectOption') {
      // Очистить inputState при выборе опции
      setInputState('');
      debouncedFunc('');
    }

    // Установить значение при выборе
    setValueStore(name, value);
  };

  const readyValue = multiple ? value : value.length > 0 ? value[0] : null;

  const mergedSlotProps = {
    ...userSlotProps,
    clearIndicator: {
      ...userSlotProps?.clearIndicator,
      title: clearLabel,
      'aria-label': clearLabel,
    },
  };

  return (
    <div className={style.searchSelect}>
      <Autocomplete
        {...rest}
        slotProps={mergedSlotProps}
        getOptionLabel={(option) => {
          // ВАЖНОЕ ИСПРАВЛЕНИЕ: всегда возвращаем строку
          if (typeof option === 'string') return option;
          if (option && typeof option === 'object' && 'label' in option) {
            return option.label || '';
          }
          return String(option || '');
        }}
        renderTags={getTooltipTitle ? renderTags : undefined}
        inputValue={inputState || ''}
        multiple={multiple}
        onChange={onChange}
        fullWidth
        freeSolo
        value={readyValue || null}
        isOptionEqualToValue={isOptionEqualToValue}
        options={!isLoading ? values : []}
        loading={isLoading}
        filterOptions={serverFilter ? (op) => op : createFilterOptions()}
        onInputChange={onInputChangeHandler}
        loadingText={'Загрузка...'}
        renderOption={(props, option) => renderOptions(props, option as Value, testid)}
        renderInput={renderInput}
        noOptionsText={'Ничего не найдено'}
      />
    </div>
  );
}
