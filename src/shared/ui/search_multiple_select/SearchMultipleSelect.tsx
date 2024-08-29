import type React from 'react';
import { useState } from 'react';

import {
  Autocomplete,
  type AutocompleteInputChangeReason,
  type AutocompleteProps,
  type AutocompleteRenderInputParams,
  TextField,
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
  setValueStore,
  onInputChange,
  serverFilter = true,
  ...rest
}: SearchMultipleSelectProps<T>) {
  const [inputState, setInputState] = useState('');
  const debouncedFunc = debounce({ time: 500, callBack: onInputChange });

  const renderInput = (params: AutocompleteRenderInputParams) => {
    const prop = {
      ...params,
      inputProps: {
        ...params.inputProps,
        'data-testid': testid,
      },
    };
    return <TextField helperText={helperText} {...prop} label={label} error={error} />;
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
    if (reason === 'clear') {
      setValueStore(name, []);
      setInputState('');
      return;
    }
    setValueStore(name, value);
  };

  const readyValue = multiple ? value : value[0];
  return (
    <div className={style.searchSelect}>
      <Autocomplete
        {...rest}
        inputValue={inputState}
        multiple={multiple}
        onChange={onChange}
        fullWidth
        freeSolo
        value={readyValue}
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
