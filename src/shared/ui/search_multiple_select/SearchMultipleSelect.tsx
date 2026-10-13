/* eslint-disable react-hooks/exhaustive-deps */
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import ClearIcon from '@mui/icons-material/Clear';
import CloseIcon from '@mui/icons-material/Close';
import {
  Autocomplete,
  type AutocompleteChangeReason,
  type AutocompleteInputChangeReason,
  type AutocompleteProps,
  type AutocompleteRenderInputParams,
  Box,
  Checkbox,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormHelperText,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  TextField,
  Tooltip,
  Typography,
  createFilterOptions,
} from '@mui/material';
import type { SxProps, Theme } from '@mui/material/styles';
import { useTheme } from '@mui/material/styles';

import { debounce } from '@shared/lib/debounce';
import {
  DESKTOP_CLOSE_UI_OVERLAYS_EVENT,
  isElectronDesktopShell,
} from '@shared/lib/desktopCloseUiOverlays';
import { Button, ButtonsType } from '@shared/ui/button';
import { OverflowTooltip } from '@shared/ui/overflow_tooltip/OverflowTooltip';

import style from './SearchMultipleSelect.module.scss';
import {
  type OnChange,
  type Value,
  type Values,
  isOptionEqualToValue,
  renderOptions,
} from './helpers';

function resolveSearchSelectDisplayLabel(label: ReactNode | undefined): ReactNode | undefined {
  if (label == null || label === false) {
    return undefined;
  }
  if (typeof label === 'string') {
    return label.trim() !== '' ? label : undefined;
  }
  return label;
}

function toValuesArray(
  value: string | Value | Values | (string | Value | Values)[] | null,
): Values {
  if (!value) return [];
  if (Array.isArray(value)) return value as Values;
  if (typeof value === 'object' && 'value' in value) return [value as Value];
  return [];
}

function applyMaxValuesLimit(
  values: Values,
  maxValues: number | undefined,
  reason: AutocompleteChangeReason,
  pickedOption?: Value | null,
): Values {
  if (maxValues == null || maxValues < 1) return values;
  if (reason === 'selectOption' && maxValues === 1 && pickedOption) {
    return [pickedOption];
  }
  if (values.length <= maxValues) return values;
  return values.slice(-maxValues);
}

/** Один чип (maxValues=1): одна строка, без пустого инпута под чипом. */
const singleChipLockedSx: SxProps<Theme> = {
  '& .MuiOutlinedInput-root': {
    flexWrap: 'nowrap !important',
    alignItems: 'center',
    alignContent: 'center',
    py: '2px',
    minHeight: 40,
    height: 40,
    boxSizing: 'border-box',
  },
  '& .MuiAutocomplete-input': {
    display: 'none !important',
    width: '0 !important',
    minWidth: '0 !important',
    padding: '0 !important',
    margin: '0 !important',
    height: '0 !important',
    minHeight: '0 !important',
    flex: '0 0 0 !important',
    opacity: 0,
  },
  '& .MuiAutocomplete-tag': {
    my: 0,
    mx: '2px',
    maxWidth: 'calc(100% - 28px)',
  },
};

// TODO => почистить тип пропсов, очень много лишнего (не используется)
export type SearchMultipleSelectProps<T> = {
  testid?: string;
  error?: boolean;
  label?: React.ReactNode;
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
  placeholder?: string;
  serverFilter?: boolean;
  allowCustomEvents?: boolean;
  getTooltipTitle?: (value: string) => string;
  /** Tooltip с полным текстом, если значение обрезано в узком поле. */
  overflowTooltip?: boolean;
  /** Мобильный режим: список типов в модальном окне с чекбоксами (только при multiple). */
  mobileModalPicker?: boolean;
  /** Лимит выбранных значений; включает режим чипов (multiple) и блокирует список при достижении лимита. */
  maxValues?: number;
} & Partial<
  Omit<AutocompleteProps<Value, boolean, boolean, boolean>, 'onInputChange' | 'value' | 'name'>
>;

function SearchMultipleSelectMobileModal<T>({
  testid,
  label,
  error,
  isLoading,
  values,
  value = [],
  name,
  helperText,
  setValueStore,
  onInputChange,
  disabled,
  placeholder,
  maxValues,
  sx,
}: Pick<
  SearchMultipleSelectProps<T>,
  | 'testid'
  | 'label'
  | 'error'
  | 'isLoading'
  | 'values'
  | 'value'
  | 'name'
  | 'helperText'
  | 'setValueStore'
  | 'onInputChange'
  | 'disabled'
  | 'placeholder'
  | 'maxValues'
> & { sx?: SearchMultipleSelectProps<T>['sx'] }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const modalSearchDebounceRef = useRef<number | undefined>(undefined);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Values>([]);
  const [filterText, setFilterText] = useState('');
  const debouncedFunc = debounce({ time: 500, callBack: onInputChange });

  const displayLabel = resolveSearchSelectDisplayLabel(label);

  /** Список из API: поиск в модалке обновляет `values` через onInputChange → searchQuery. */
  const listOptions = !isLoading ? values : [];

  const chipSx = useMemo(
    () =>
      theme.palette.mode === 'dark'
        ? {
            height: '28px',
            maxWidth: '100%',
            borderRadius: '16px',
            backgroundColor: 'rgba(144, 202, 249, 0.14)',
            borderColor: 'rgba(144, 202, 249, 0.45)',
            color: 'rgba(255, 255, 255, 0.92)',
            '& .MuiChip-label': {
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              px: 1.25,
              fontSize: '14px',
              color: 'rgba(255, 255, 255, 0.92)',
            },
          }
        : {
            height: '28px',
            maxWidth: '100%',
            borderRadius: '16px',
            backgroundColor: '#eef5ff',
            borderColor: '#b8d3ff',
            '& .MuiChip-label': {
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              px: 1.25,
              fontSize: '14px',
            },
          },
    [theme.palette.mode],
  );

  const openModal = () => {
    if (disabled) return;
    setDraft(value?.length ? [...value] : []);
    setFilterText('');
    onInputChange?.('');
    setOpen(true);
  };

  const closeModal = () => {
    setOpen(false);
    setFilterText('');
    onInputChange?.('');
  };

  const toggleDraft = (opt: Value) => {
    setDraft((prev) => {
      const exists = prev.some((p) => String(p.value) === String(opt.value));
      if (exists) return prev.filter((p) => String(p.value) !== String(opt.value));
      if (maxValues === 1) return [opt];
      if (maxValues != null && prev.length >= maxValues) {
        return [...prev.slice(1), opt];
      }
      return [...prev, opt];
    });
  };

  const applyDraft = () => {
    window.clearTimeout(modalSearchDebounceRef.current);
    setFilterText('');
    onInputChange?.('');
    setValueStore?.(name, draft);
    setOpen(false);
  };

  const isSameSelectionAsInitial = useMemo(() => {
    const initial = value || [];
    if (draft.length !== initial.length) return false;
    const draftSet = new Set(draft.map((v) => String(v.value)));
    return initial.every((v) => draftSet.has(String(v.value)));
  }, [draft, value]);

  const isApplyDisabled = draft.length === 0 || isSameSelectionAsInitial;

  const clearSelection = (e: React.MouseEvent) => {
    e.stopPropagation();
    setValueStore?.(name, []);
    debouncedFunc?.('');
  };

  const removeSingleValue = (e: React.MouseEvent, optionValue: Value['value']) => {
    e.stopPropagation();
    const next = (value || []).filter((v) => String(v.value) !== String(optionValue));
    setValueStore?.(name, next);
  };

  const handleModalSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setFilterText(v);
    window.clearTimeout(modalSearchDebounceRef.current);
    modalSearchDebounceRef.current = window.setTimeout(() => {
      onInputChange?.(v);
    }, 320);
  };

  useEffect(() => {
    return () => {
      window.clearTimeout(modalSearchDebounceRef.current);
    };
  }, []);

  return (
    <div className={`${style.searchSelect} ${style.mobileModalWrap}`}>
      <Box
        sx={{
          width: '100%',
          maxWidth: '100%',
          minWidth: 0,
          ...((typeof sx === 'object' && sx !== null && !Array.isArray(sx) ? sx : {}) as object),
        }}>
        {displayLabel ? (
          <Typography
            component="label"
            variant="body2"
            sx={{
              display: 'block',
              mb: 0.5,
              color: error ? 'error.main' : 'text.secondary',
              fontSize: 12,
              fontWeight: 500,
            }}>
            {displayLabel}
          </Typography>
        ) : null}
        <Box
          data-testid={testid}
          role="button"
          tabIndex={disabled ? -1 : 0}
          aria-disabled={disabled}
          onClick={disabled ? undefined : openModal}
          onKeyDown={(e) => {
            if (disabled) return;
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              openModal();
            }
          }}
          sx={(theme) => ({
            position: 'relative',
            width: '100%',
            maxWidth: '100%',
            minWidth: 0,
            boxSizing: 'border-box',
            minHeight: 52,
            px: 1.25,
            py: 1,
            pr: value?.length ? 5 : 1.25,
            border: '1px solid',
            borderColor: error
              ? theme.palette.error.main
              : theme.palette.mode === 'dark'
                ? 'rgba(255, 255, 255, 0.23)'
                : 'rgba(0, 0, 0, 0.23)',
            borderRadius: 1,
            bgcolor: theme.palette.background.paper,
            cursor: disabled ? 'default' : 'pointer',
            '&:focus-visible': {
              outline: `2px solid ${theme.palette.primary.main}`,
              outlineOffset: 2,
            },
          })}>
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              gap: 0.75,
              alignItems: 'stretch',
              alignContent: 'flex-start',
              width: '100%',
              minWidth: 0,
            }}>
            {(value || []).length === 0 ? (
              <Typography
                component="span"
                variant="body2"
                color="text.secondary"
                sx={{ minWidth: 0 }}>
                {placeholder ?? '\u00a0'}
              </Typography>
            ) : (
              (value || []).map((v) => (
                <OverflowTooltip key={String(v.value)} title={v.label || ''}>
                  <Chip
                    size="small"
                    variant="outlined"
                    label={v.label}
                    onDelete={(e) => removeSingleValue(e as unknown as React.MouseEvent, v.value)}
                    onMouseDown={(e) => e.stopPropagation()}
                    sx={{
                      ...chipSx,
                      width: 'fit-content',
                      maxWidth: '100%',
                      '& .MuiChip-label': {
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      },
                    }}
                  />
                </OverflowTooltip>
              ))
            )}
          </Box>
          {value && value.length > 0 ? (
            <IconButton
              size="small"
              aria-label={t('datePicker.clear')}
              onClick={clearSelection}
              sx={{
                position: 'absolute',
                top: 4,
                right: 2,
                zIndex: 1,
                color: 'text.secondary',
              }}>
              <ClearIcon fontSize="small" />
            </IconButton>
          ) : null}
        </Box>
        {helperText ? (
          <FormHelperText error={error} sx={{ mx: 0 }}>
            {helperText}
          </FormHelperText>
        ) : null}
      </Box>

      <Dialog
        open={open}
        onClose={closeModal}
        fullWidth
        maxWidth="sm"
        slotProps={{
          paper: {
            sx: (theme) => ({
              borderRadius: 2,
              bgcolor: theme.palette.background.paper,
            }),
          },
        }}>
        <DialogTitle
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 1,
            pr: 1,
          }}>
          <span>{displayLabel || t('filters.eventType')}</span>
          <IconButton aria-label={t('common.close')} onClick={closeModal} size="small">
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers sx={{ pt: 2, px: 2, pb: 1 }}>
          <TextField
            size="small"
            fullWidth
            placeholder={t('common.search')}
            value={filterText}
            onChange={handleModalSearchChange}
            autoComplete="off"
            sx={{ mb: 2 }}
          />
          <List
            dense
            sx={{
              maxHeight: 'min(50vh, 380px)',
              overflow: 'auto',
              py: 0,
              border: (theme) => `1px solid ${theme.palette.divider}`,
              borderRadius: 1,
            }}>
            {listOptions.map((opt) => {
              const checked = draft.some((d) => String(d.value) === String(opt.value));
              return (
                <ListItem key={String(opt.value)} disablePadding>
                  <ListItemButton onClick={() => toggleDraft(opt)} dense>
                    <ListItemIcon sx={{ minWidth: 42 }}>
                      <Checkbox edge="start" checked={checked} tabIndex={-1} disableRipple />
                    </ListItemIcon>
                    <ListItemText primary={opt.label} />
                  </ListItemButton>
                </ListItem>
              );
            })}
            {!isLoading && listOptions.length === 0 ? (
              <ListItem>
                <ListItemText primary={t('common.noData')} />
              </ListItem>
            ) : null}
          </List>
        </DialogContent>
        <DialogActions sx={{ px: 2, py: 2, justifyContent: 'flex-start' }}>
          <Button typeButton={ButtonsType.action} onClick={applyDraft} disabled={isApplyDisabled}>
            {t('modals.apply')}
          </Button>
          <Button typeButton={ButtonsType.action} onClick={closeModal}>
            {t('common.cancel')}
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}

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
  overflowTooltip = false,
  slotProps: userSlotProps,
  disabled,
  placeholder,
  mobileModalPicker,
  maxValues,
  sx,
  size,
  ...rest
}: SearchMultipleSelectProps<T>) {
  const { t } = useTranslation();
  const clearLabel = t('datePicker.clear');
  const [inputState, setInputState] = useState('');
  const [focused, setFocused] = useState(false);
  const [popupOpen, setPopupOpen] = useState(false);
  const debouncedFunc = debounce({ time: 500, callBack: onInputChange });
  const isMultipleMode = maxValues != null ? true : Boolean(multiple);
  const atMaxCapacity =
    maxValues != null && maxValues > 0 && (value?.length ?? 0) >= maxValues;
  const singleChipLocked = atMaxCapacity && maxValues === 1;
  // Electron: управляемое состояние open + закрытие по глобальному событию (DesktopUiOverlayCloser / IPC).
  const isElectronDesktop = isElectronDesktopShell();

  if (mobileModalPicker && isMultipleMode) {
    return (
      <SearchMultipleSelectMobileModal<T>
        testid={testid}
        label={label}
        error={error}
        isLoading={isLoading}
        values={values}
        value={value}
        name={name}
        helperText={helperText}
        setValueStore={setValueStore}
        onInputChange={onInputChange}
        disabled={disabled}
        placeholder={placeholder}
        maxValues={maxValues}
        sx={sx}
      />
    );
  }
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

  useEffect(() => {
    if (!isElectronDesktop) return;

    const closePopup = () => setPopupOpen(false);
    window.addEventListener(DESKTOP_CLOSE_UI_OVERLAYS_EVENT, closePopup);

    return () => {
      window.removeEventListener(DESKTOP_CLOSE_UI_OVERLAYS_EVENT, closePopup);
    };
  }, [isElectronDesktop]);
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
        ...(singleChipLocked ? { readOnly: true, tabIndex: -1 } : {}),
        style: {
          ...(params.inputProps?.style as React.CSSProperties | undefined),
          ...(overflowTooltip
            ? {
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }
            : {}),
          ...(singleChipLocked
            ? {
                display: 'none',
                width: 0,
                minWidth: 0,
                padding: 0,
                margin: 0,
                height: 0,
                minHeight: 0,
              }
            : {}),
        },
      },
    };
    const hasValue = (value && value.length > 0) || !!inputState;
    // Пустая строка label у OutlinedInput оставляет «вырез» в рамке — пропадает верхняя граница (иногда нестабильно из‑за legend)
    const displayLabel = resolveSearchSelectDisplayLabel(label);
    const inputPropsNoLabel = displayLabel === undefined ? { notched: false as const } : {};
    // Сжимаем label только при фокусе или значении — иначе длинный label вылезает за рамку узкого поля.
    const shrinkLabel =
      focused ||
      !!hasValue ||
      displayLabel === undefined ||
      !!(disabled && placeholder && String(placeholder).trim() !== '');
    const modalLabelEllipsisSx =
      overflowTooltip && (displayLabel || placeholderText)
        ? {
            '& .MuiFormControl-root': {
              overflowX: 'clip',
              overflowY: 'visible',
            },
            '& .MuiInputLabel-root': {
              maxWidth: 'calc(100% - 32px)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              display: 'block',
            },
            '& .MuiInputBase-input::placeholder': {
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            },
          }
        : {};
    return (
      <TextField
        helperText={helperText}
        {...prop}
        size={size}
        label={displayLabel}
        error={error}
        disabled={disabled}
        placeholder={placeholder}
        sx={
          disabled
            ? (theme) => ({
                ...modalLabelEllipsisSx,
                '& .MuiOutlinedInput-root': {
                  backgroundColor: theme.palette.action.hover,
                  cursor: 'not-allowed',
                },
                '& .MuiInputBase-input::placeholder': {
                  color: theme.palette.text.disabled,
                  opacity: 1,
                },
              })
            : modalLabelEllipsisSx
        }
        InputProps={{
          ...prop.InputProps,
          ...inputPropsNoLabel,
        }}
        InputLabelProps={{
          shrink: shrinkLabel,
        }}
      />
    );
  };

  const renderTags = (value: Value[], getTagProps: any) => {
    return value.map((option, index) => {
      const { key: tagKey, ...tagProps } = getTagProps({ index });
      const chipTitle = getTooltipTitle ? getTooltipTitle(option.label) : option.label;
      const chip = (
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
      );

      if (overflowTooltip || getTooltipTitle) {
        return (
          <OverflowTooltip key={option.value} title={chipTitle}>
            <span className={style.chipWrapper}>{chip}</span>
          </OverflowTooltip>
        );
      }

      return (
        <OverflowTooltip key={option.value} title={option.label || ''}>
          <span className={style.chipWrapper}>{chip}</span>
        </OverflowTooltip>
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

  const onChange: OnChange = (_event, nextValue, reason, details) => {
    if (reason === 'clear' || !nextValue) {
      setValueStore(name, []);
      setInputState('');
      setPopupOpen(false);
      return;
    }

    if (reason === 'selectOption') {
      setInputState('');
      debouncedFunc('');
    }

    const pickedOption =
      details?.option && typeof details.option === 'object'
        ? (details.option as Value)
        : null;
    const limited = applyMaxValuesLimit(
      toValuesArray(nextValue),
      maxValues,
      reason,
      pickedOption,
    );
    setValueStore(name, limited);
    if (maxValues != null && limited.length >= maxValues) {
      setPopupOpen(false);
    }
  };

  const readyValue = isMultipleMode ? value : value.length > 0 ? value[0] : null;

  const displayLabel = resolveSearchSelectDisplayLabel(label);
  const displayLabelText =
    typeof displayLabel === 'string' && displayLabel.trim() !== '' ? displayLabel.trim() : '';
  const placeholderText =
    placeholder && String(placeholder).trim() !== '' ? String(placeholder).trim() : '';

  const singleOverflowTitle =
    !isMultipleMode && readyValue && typeof readyValue === 'object' && 'label' in readyValue
      ? String(readyValue.label ?? '')
      : '';

  const overflowTooltipTitle =
    overflowTooltip && singleOverflowTitle
      ? singleOverflowTitle
      : overflowTooltip && displayLabelText
        ? displayLabelText
        : overflowTooltip && placeholderText
          ? placeholderText
          : '';

  const mergedSlotProps = {
    ...userSlotProps,
    clearIndicator: {
      ...userSlotProps?.clearIndicator,
      title: clearLabel,
      'aria-label': clearLabel,
    },
  };

  const mergedAutocompleteSx: SearchMultipleSelectProps<T>['sx'] = singleChipLocked
    ? sx
      ? ([sx, singleChipLockedSx] as SearchMultipleSelectProps<T>['sx'])
      : singleChipLockedSx
    : sx;

  const autocompleteNode = (
    <div
      className={[style.searchSelect, singleChipLocked ? style.singleChipLocked : '']
        .filter(Boolean)
        .join(' ')}>
      <Autocomplete
        {...rest}
        size={size}
        sx={mergedAutocompleteSx}
        disabled={disabled}
        slotProps={mergedSlotProps}
        getOptionLabel={(option) => {
          // ВАЖНОЕ ИСПРАВЛЕНИЕ: всегда возвращаем строку
          if (typeof option === 'string') return option;
          if (option && typeof option === 'object' && 'label' in option) {
            return option.label || '';
          }
          return String(option || '');
        }}
        renderTags={overflowTooltip || getTooltipTitle || maxValues != null ? renderTags : undefined}
        inputValue={atMaxCapacity ? '' : inputState || ''}
        multiple={isMultipleMode}
        onChange={onChange}
        fullWidth
        freeSolo
        value={readyValue || null}
        open={
          isElectronDesktop
            ? maxValues != null
              ? atMaxCapacity
                ? false
                : popupOpen
              : popupOpen
            : maxValues != null
              ? atMaxCapacity
                ? false
                : popupOpen
              : undefined
        }
        onOpen={() => {
          if (atMaxCapacity) return;
          setPopupOpen(true);
        }}
        onClose={() => setPopupOpen(false)}
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

  if (overflowTooltip && overflowTooltipTitle) {
    return (
      <OverflowTooltip title={overflowTooltipTitle}>
        <span className={style.overflowTooltipWrap}>{autocompleteNode}</span>
      </OverflowTooltip>
    );
  }

  return autocompleteNode;
}
