import {
  type Dispatch,
  type RefObject,
  type SetStateAction,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useTranslation } from 'react-i18next';

import AddIcon from '@mui/icons-material/Add';
import AutorenewIcon from '@mui/icons-material/Autorenew';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import VisibilityOffOutlinedIcon from '@mui/icons-material/VisibilityOffOutlined';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import {
  Box,
  Checkbox,
  FormControl,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  MenuItem,
  Select,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';

import { OverflowTooltip } from '@shared/ui/overflow_tooltip/OverflowTooltip';
import type { Value, Values } from '@shared/ui/search_multiple_select';

import { encodeReportIdentifierDisplayParam } from '@pages/reports/lib/reportTableFieldDisplayParam';
import {
  buildDuplicateColumnKey,
  getDuplicateColumnIndex,
  stripDuplicateColumnSuffix,
} from '@pages/reports/lib/reportColumnDuplicate';
import {
  isReportIdentifierFieldPath,
  orderReportCompositionFieldsByIdentifier,
} from '@pages/reports/lib/reportTableFieldIdentifier';

import composeStyles from './ReportComposeModal.module.scss';

export type ReportTableFieldsTransferProps = {
  options: Values;
  value: Values;
  onChange: (selected: Values) => void;
  disabled?: boolean;
  /** Параметры отображения (fn:/op:) по fieldName строки «Текущий состав». */
  displayParamByKey?: Record<string, string>;
  getDisplayOptions?: (fieldPath: string) => Values;
  onDisplayParamChange?: (fieldPath: string, encoded: string) => void;
  /** true = скрыто в гриде (закрытый глаз), в payload остаётся. */
  hiddenByKey?: Record<string, boolean>;
  onVisibilityChange?: (fieldPath: string, visible: boolean) => void;
  /** Ключи, которые нельзя убрать из «Текущего состава». */
  lockedChosenKeys?: string[];
};

function fieldKey(item: Value): string {
  return String(item.value);
}

/** Подпись для UI: кастомный алиас → label из value → дефолт из metadata. */
function resolveFieldLabel(
  key: string,
  customLabels: Record<string, string>,
  defaultLabels: Record<string, string>,
  item?: Value,
): string {
  const baseKey = stripDuplicateColumnSuffix(key);
  return (
    customLabels[key] ?? item?.label ?? defaultLabels[baseKey] ?? defaultLabels[key] ?? baseKey
  )
    .trim() || baseKey;
}

function fieldDisplayLabel(
  item: Value,
  customLabels: Record<string, string>,
  defaultLabels: Record<string, string>,
): string {
  return resolveFieldLabel(fieldKey(item), customLabels, defaultLabels, item);
}

function sortFieldsByLabel(
  items: Values,
  customLabels: Record<string, string>,
  defaultLabels: Record<string, string>,
  locale: string,
): Values {
  return [...items].sort((a, b) =>
    fieldDisplayLabel(a, customLabels, defaultLabels).localeCompare(
      fieldDisplayLabel(b, customLabels, defaultLabels),
      locale,
      { sensitivity: 'base' },
    ),
  );
}

function mergeOptionMeta(
  option: Value,
  customLabels: Record<string, string>,
  defaults: Record<string, string>,
): Value {
  const key = fieldKey(option);
  const label = resolveFieldLabel(key, customLabels, defaults, option);
  return {
    ...option,
    value: key,
    label,
  };
}

function listCheckboxSelectionState(
  itemKeys: string[],
  selectedKeys: string[],
): { allChecked: boolean; indeterminate: boolean } {
  if (!itemKeys.length) {
    return { allChecked: false, indeterminate: false };
  }
  let selectedCount = 0;
  for (const key of itemKeys) {
    if (selectedKeys.includes(key)) selectedCount += 1;
  }
  return {
    allChecked: selectedCount === itemKeys.length,
    indeterminate: selectedCount > 0 && selectedCount < itemKeys.length,
  };
}

function collectCustomLabelsFromValues(
  items: Values,
  into: Record<string, string>,
): Record<string, string> {
  const next = { ...into };
  for (const item of items) {
    const key = fieldKey(item);
    const label = item.label?.trim();
    if (label) {
      next[key] = label;
    }
  }
  return next;
}

function findTransferRow(container: HTMLDivElement, key: string): Element | null {
  const escaped = typeof CSS !== 'undefined' && CSS.escape ? CSS.escape(key) : key;
  return container.querySelector(`[data-transfer-key="${escaped}"]`);
}

/** Верхняя видимая строка в прокручиваемом списке (учитывает ручной скролл колёсиком). */
function resolveVisibleScrollIndex(container: HTMLDivElement | null, keys: string[]): number | null {
  if (!container || !keys.length) return null;

  const containerRect = container.getBoundingClientRect();
  let topmostVisible: number | null = null;
  let topmostTop = Infinity;

  for (let i = 0; i < keys.length; i += 1) {
    const row = findTransferRow(container, keys[i]!);
    if (!row) continue;

    const rect = row.getBoundingClientRect();
    if (rect.bottom <= containerRect.top + 1) continue;
    if (rect.top >= containerRect.bottom - 1) break;

    if (rect.top < topmostTop) {
      topmostTop = rect.top;
      topmostVisible = i;
    }
  }

  return topmostVisible;
}

function canScrollListUp(container: HTMLDivElement | null): boolean {
  return (container?.scrollTop ?? 0) > 1;
}

function canScrollListDown(container: HTMLDivElement | null): boolean {
  if (!container) return false;
  const maxScroll = container.scrollHeight - container.clientHeight;
  return container.scrollTop < maxScroll - 1;
}

export function ReportTableFieldsTransfer({
  options,
  value,
  onChange,
  disabled = false,
  displayParamByKey = {},
  getDisplayOptions,
  onDisplayParamChange,
  hiddenByKey = {},
  onVisibilityChange,
  lockedChosenKeys = [],
}: ReportTableFieldsTransferProps) {
  const lockedChosen = useMemo(() => new Set(lockedChosenKeys.map(String)), [lockedChosenKeys]);
  const { t, i18n } = useTranslation();
  const sortLocale = i18n.language || 'ru';
  const [availableSelected, setAvailableSelected] = useState<string[]>([]);
  const [chosenSelected, setChosenSelected] = useState<string[]>([]);
  /** Индекс строки для построчного скролла (без выделения и без перестановки). */
  const [scrollIndexAvailable, setScrollIndexAvailable] = useState<number | null>(null);
  const [scrollIndexChosen, setScrollIndexChosen] = useState<number | null>(null);
  const availableListRef = useRef<HTMLDivElement>(null);
  const chosenListRef = useRef<HTMLDivElement>(null);
  const [renamingKey, setRenamingKey] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState('');
  /** Алиасы колонок по fieldName — сохраняются при переносе между списками. */
  const [customLabelsByKey, setCustomLabelsByKey] = useState<Record<string, string>>({});

  const defaultLabelsByValue = useMemo(() => {
    const map: Record<string, string> = {};
    for (const option of options) {
      map[fieldKey(option)] = option.label ?? fieldKey(option);
    }
    return map;
  }, [options]);

  const optionByKey = useMemo(() => {
    const map = new Map<string, Value>();
    for (const option of options) {
      map.set(fieldKey(option), option);
    }
    return map;
  }, [options]);

  /** Базовые fieldPath в составе (без «#N») — поле скрыто в «Доступных», пока есть хоть один экземпляр. */
  const chosenBaseKeys = useMemo(
    () => new Set(value.map((item) => stripDuplicateColumnSuffix(fieldKey(item)))),
    [value],
  );

  const availableOptions = useMemo(
    () =>
      sortFieldsByLabel(
        options
          .filter((o) => !chosenBaseKeys.has(fieldKey(o)))
          .map((o) => mergeOptionMeta(o, customLabelsByKey, defaultLabelsByValue)),
        customLabelsByKey,
        defaultLabelsByValue,
        sortLocale,
      ),
    [options, chosenBaseKeys, customLabelsByKey, defaultLabelsByValue, sortLocale],
  );

  const chosenOptions = useMemo(
    () =>
      value.map((item) => mergeOptionMeta(item, customLabelsByKey, defaultLabelsByValue)),
    [value, customLabelsByKey, defaultLabelsByValue],
  );

  const availableKeys = useMemo(() => availableOptions.map(fieldKey), [availableOptions]);
  const chosenKeysList = useMemo(() => chosenOptions.map(fieldKey), [chosenOptions]);

  const optionsKey = useMemo(() => options.map(fieldKey).join('|'), [options]);

  const valueRef = useRef(value);
  valueRef.current = value;

  useEffect(() => {
    setAvailableSelected([]);
    setChosenSelected([]);
    setScrollIndexAvailable(null);
    setScrollIndexChosen(null);
    setRenamingKey(null);
    setCustomLabelsByKey((prev) => collectCustomLabelsFromValues(valueRef.current, prev));
  }, [optionsKey]);

  const scrollListByRowStep = (
    keys: string[],
    scrollIndex: number | null,
    delta: number,
    listRef: RefObject<HTMLDivElement | null>,
  ): number | null => {
    const container = listRef.current;
    if (!container || !keys.length) return null;

    const anchorIndex = scrollIndex ?? resolveVisibleScrollIndex(container, keys) ?? 0;
    const clampedAnchor = Math.min(Math.max(anchorIndex, 0), keys.length - 1);
    const anchorRow = findTransferRow(container, keys[clampedAnchor]!);
    const rowStep = Math.max(anchorRow?.getBoundingClientRect().height ?? 32, 1);

    const maxScroll = Math.max(0, container.scrollHeight - container.clientHeight);
    const prevScrollTop = container.scrollTop;
    const nextScrollTop = Math.max(0, Math.min(maxScroll, prevScrollTop + delta * rowStep));

    if (nextScrollTop === prevScrollTop) {
      return clampedAnchor;
    }

    container.scrollTo({ top: nextScrollTop, behavior: 'auto' });

    const resolved = resolveVisibleScrollIndex(container, keys);
    if (resolved != null && resolved !== clampedAnchor) {
      return resolved;
    }
    const stepped = clampedAnchor + (delta > 0 ? 1 : -1);
    return Math.min(keys.length - 1, Math.max(0, stepped));
  };

  const syncScrollIndexFromList = (
    container: HTMLDivElement | null,
    keys: string[],
    setScrollIndex: Dispatch<SetStateAction<number | null>>,
  ) => {
    const index = resolveVisibleScrollIndex(container, keys);
    if (index != null) {
      setScrollIndex(index);
    }
  };

  const emitChosen = useCallback(
    (next: Values) => {
      // Подмешиваем label из next поверх customLabels — иначе updateLabel
      // (setState customLabels ещё не применился) затирает новый алиас старым.
      const labels = { ...customLabelsByKey };
      for (const item of next) {
        const key = fieldKey(item);
        const explicit = item.label?.trim();
        if (explicit) labels[key] = explicit;
      }
      // id / *.id всегда сверху (корневой id → связанные идентификаторы → прочие).
      const ordered = orderReportCompositionFieldsByIdentifier(
        next.map((item) => mergeOptionMeta(item, labels, defaultLabelsByValue)),
      );
      onChange(ordered);
    },
    [onChange, customLabelsByKey, defaultLabelsByValue],
  );

  const reorderChosenKeys = useCallback(
    (keys: string[]) => {
      const valueByKey = new Map(value.map((item) => [fieldKey(item), item]));
      return keys.map((key) => {
        const existing = valueByKey.get(key);
        if (existing) {
          return mergeOptionMeta(existing, customLabelsByKey, defaultLabelsByValue);
        }
        const option = optionByKey.get(key);
        if (option) {
          return mergeOptionMeta(option, customLabelsByKey, defaultLabelsByValue);
        }
        return {
          value: key,
          label: resolveFieldLabel(key, customLabelsByKey, defaultLabelsByValue),
        };
      });
    },
    [value, customLabelsByKey, defaultLabelsByValue, optionByKey],
  );

  const moveChosenRow = useCallback(
    (key: string, direction: -1 | 1) => {
      // Идентификаторы не переставляются; выше блока id нельзя поднять другие поля.
      if (isReportIdentifierFieldPath(key)) return;
      const keys = [...chosenKeysList];
      const index = keys.indexOf(key);
      if (index < 0) return;
      const swapWith = index + direction;
      if (swapWith < 0 || swapWith >= keys.length) return;
      if (isReportIdentifierFieldPath(keys[swapWith]!)) return;
      [keys[index], keys[swapWith]] = [keys[swapWith]!, keys[index]!];
      emitChosen(reorderChosenKeys(keys));
    },
    [chosenKeysList, emitChosen, reorderChosenKeys],
  );

  const moveToChosen = (keys: string[]) => {
    if (!keys.length) return;
    const next = [
      ...value.map((item) => mergeOptionMeta(item, customLabelsByKey, defaultLabelsByValue)),
    ];
    const existing = new Set(next.map(fieldKey));
    for (const key of keys) {
      if (existing.has(key)) continue;
      const option = optionByKey.get(key);
      if (option) {
        next.push(mergeOptionMeta(option, customLabelsByKey, defaultLabelsByValue));
      } else {
        next.push({
          value: key,
          label: resolveFieldLabel(key, customLabelsByKey, defaultLabelsByValue),
        });
      }
    }
    emitChosen(next);
    setAvailableSelected([]);
  };

  const moveToAvailable = (keys: string[]) => {
    if (!keys.length) return;
    const remove = new Set(keys.filter((key) => !lockedChosen.has(key)));
    if (!remove.size) return;
    setCustomLabelsByKey((prev) => {
      const next = { ...prev };
      for (const item of value) {
        const key = fieldKey(item);
        if (!remove.has(key)) continue;
        next[key] = resolveFieldLabel(key, prev, defaultLabelsByValue, item);
      }
      return next;
    });
    emitChosen(value.filter((item) => !remove.has(fieldKey(item))));
    setChosenSelected([]);
    if (renamingKey && remove.has(renamingKey)) {
      setRenamingKey(null);
    }
  };

  const updateLabel = (fieldValue: string, nextLabel: string) => {
    const trimmed = nextLabel.trim() || defaultLabelsByValue[fieldValue] || fieldValue;
    const nextLabels = { ...customLabelsByKey, [fieldValue]: trimmed };
    setCustomLabelsByKey(nextLabels);
    // Пишем в родителя сразу с новым алиасом (без stale customLabels в emitChosen).
    onChange(
      value.map((item) => {
        const key = fieldKey(item);
        return {
          value: key,
          label:
            key === fieldValue
              ? trimmed
              : resolveFieldLabel(key, nextLabels, defaultLabelsByValue, item),
        };
      }),
    );
  };

  const startRename = (key: string, currentLabel: string) => {
    setRenamingKey(key);
    setRenameDraft(currentLabel);
  };

  const commitRename = (key: string) => {
    updateLabel(key, renameDraft);
    setRenamingKey(null);
  };

  const cancelRename = () => {
    setRenamingKey(null);
    setRenameDraft('');
  };

  /** Вернуть подпись колонки к дефолту из metadata («Сущность -> поле»). */
  const resetLabelToDefault = (fieldValue: string) => {
    const defaultLabel =
      defaultLabelsByValue[stripDuplicateColumnSuffix(fieldValue)] || fieldValue;
    const nextLabels = { ...customLabelsByKey };
    delete nextLabels[fieldValue];
    setCustomLabelsByKey(nextLabels);
    if (renamingKey === fieldValue) {
      setRenamingKey(null);
      setRenameDraft('');
    }
    onChange(
      value.map((item) => {
        const key = fieldKey(item);
        return {
          value: key,
          label:
            key === fieldValue
              ? defaultLabel
              : resolveFieldLabel(key, nextLabels, defaultLabelsByValue, item),
        };
      }),
    );
  };

  /**
   * Дублирование строки «Текущего состава»: вставка идентичной строки ниже текущей
   * с УНИКАЛЬНЫМ составным ключом «field#N» и дефолтной агрегацией (дисплей-параметр
   * нового ключа не задан → селект показывает «Без агрегации»).
   */
  const duplicateChosenRow = useCallback(
    (rowKey: string, rowIndex: number) => {
      if (isReportIdentifierFieldPath(rowKey)) return;
      const base = stripDuplicateColumnSuffix(rowKey);
      const maxIndex = Math.max(
        1,
        ...value.map((item) => {
          const k = fieldKey(item);
          return stripDuplicateColumnSuffix(k) === base ? getDuplicateColumnIndex(k) : 0;
        }),
      );
      const dupKey = buildDuplicateColumnKey(base, maxIndex + 1);
      const dupLabel = resolveFieldLabel(rowKey, customLabelsByKey, defaultLabelsByValue);
      const next = value.map((item) =>
        mergeOptionMeta(item, customLabelsByKey, defaultLabelsByValue),
      );
      next.splice(rowIndex + 1, 0, { value: dupKey, label: dupLabel });
      emitChosen(next);
    },
    [value, customLabelsByKey, defaultLabelsByValue, emitChosen],
  );

  const renderScrollListStepper = (
    keys: string[],
    scrollIndex: number | null,
    setScrollIndex: Dispatch<SetStateAction<number | null>>,
    listRef: RefObject<HTMLDivElement | null>,
  ) => {
    const canScrollUp = canScrollListUp(listRef.current);
    const canScrollDown = canScrollListDown(listRef.current);

    return (
      <div className={composeStyles.transferListStepper}>
        <Tooltip title={t('reports.composeTransferMoveUp')}>
          <span>
            <IconButton
              type="button"
              size="small"
              disabled={disabled || !canScrollUp}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setScrollIndex((prev) => scrollListByRowStep(keys, prev, -1, listRef));
              }}>
              <KeyboardArrowUpIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
        <Tooltip title={t('reports.composeTransferMoveDown')}>
          <span>
            <IconButton
              type="button"
              size="small"
              disabled={disabled || !canScrollDown}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setScrollIndex((prev) => scrollListByRowStep(keys, prev, 1, listRef));
              }}>
              <KeyboardArrowDownIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
      </div>
    );
  };

  if (!options.length) {
    return (
      <Typography variant="body2" color="text.secondary">
        {t('reports.tableFieldsDialogEmpty')}
      </Typography>
    );
  }

  const renderList = (
    items: Values,
    selectedKeys: string[],
    onToggle: (key: string) => void,
    side: 'available' | 'chosen',
  ) => (
    <List dense disablePadding className={composeStyles.transferList}>
      {items.map((option, rowIndex) => {
        const key = fieldKey(option);
        const isChecked = selectedKeys.includes(key);
        const label = fieldDisplayLabel(option, customLabelsByKey, defaultLabelsByValue);
        const isRenaming = side === 'chosen' && renamingKey === key;
        const displayOptions = side === 'chosen' ? (getDisplayOptions?.(key) ?? []) : [];
        const selectedDisplayParam = displayParamByKey[key] ?? '';
        const isIdentifier = isReportIdentifierFieldPath(key);
        const prevRowKey = rowIndex > 0 ? fieldKey(items[rowIndex - 1]!) : '';
        const nextRowKey = rowIndex < items.length - 1 ? fieldKey(items[rowIndex + 1]!) : '';
        const canMoveRowUp =
          side === 'chosen' &&
          !isIdentifier &&
          rowIndex > 0 &&
          !isReportIdentifierFieldPath(prevRowKey);
        const canMoveRowDown =
          side === 'chosen' &&
          !isIdentifier &&
          rowIndex < items.length - 1 &&
          !isReportIdentifierFieldPath(nextRowKey);
        const identifierCountEncoded =
          displayOptions.find((item) => {
            const raw = String(item.value);
            const code = raw.startsWith('fn:') ? raw.slice(3) : raw;
            return code.toLowerCase().replace(/[_-]/g, '') === 'count';
          })?.value ?? encodeReportIdentifierDisplayParam();
        // «Без агрегации» из metadata (fn:none) — дефолт селекта вместо фронтового «не выбрано».
        const noAggregationEncoded =
          displayOptions.find((item) => {
            const raw = String(item.value);
            const code = raw.startsWith('fn:') ? raw.slice(3) : raw;
            return code.toLowerCase().replace(/[_-]/g, '') === 'none';
          })?.value ?? '';
        const showDisplaySelect =
          side === 'chosen' &&
          (displayOptions.length > 0 || isIdentifier) &&
          Boolean(onDisplayParamChange);
        // Агрегация идентификатора — как у прочих полей: список с бэка, выбор не locked.
        const selectOptions =
          displayOptions.length > 0
            ? displayOptions
            : isIdentifier
              ? [
                  {
                    value: identifierCountEncoded,
                    label: t('reports.havingAggregation.count'),
                  },
                ]
              : [];
        const selectValue = selectOptions.some(
          (item) => String(item.value) === selectedDisplayParam,
        )
          ? selectedDisplayParam
          : selectedDisplayParam ||
            (isIdentifier ? String(identifierCountEncoded) : noAggregationEncoded);
        // Идентификатор при добавлении — видим (как прочие); глаз не блокируем.
        const isHidden = Boolean(hiddenByKey[key]);
        const isLockedChosen = side === 'chosen' && lockedChosen.has(key);
        const defaultLabel =
          (defaultLabelsByValue[stripDuplicateColumnSuffix(key)] || key).trim();
        const isCustomLabel = !isIdentifier && label.trim() !== defaultLabel;

        return (
          <ListItem
            key={key}
            disablePadding
            data-transfer-key={key}
            className={composeStyles.transferListItem}
            secondaryAction={
              side === 'chosen' ? (
                <Box className={composeStyles.transferRowActions}>
                  {showDisplaySelect ? (
                    <FormControl
                      size="small"
                      className={composeStyles.transferDisplayParam}
                      onClick={(e) => e.stopPropagation()}>
                      <Select
                        displayEmpty={!isIdentifier}
                        value={selectValue}
                        disabled={disabled}
                        onChange={(e) => {
                          onDisplayParamChange?.(key, String(e.target.value ?? ''));
                        }}
                        inputProps={{
                          'aria-label': t('reports.filterFunctionLabel'),
                        }}>
                        {selectOptions.map((item) => (
                          <MenuItem key={String(item.value)} value={String(item.value)}>
                            {item.label}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  ) : (
                    <span className={composeStyles.transferDisplayParamSpacer} aria-hidden />
                  )}
                  <span className={composeStyles.transferActionSlot}>
                    {onVisibilityChange ? (
                      <Tooltip
                        title={
                          isHidden
                            ? t('reports.composeTransferShowColumn')
                            : t('reports.composeTransferHideColumn')
                        }>
                        <span>
                          <IconButton
                            size="small"
                            disabled={disabled}
                            aria-label={
                              isHidden
                                ? t('reports.composeTransferShowColumn')
                                : t('reports.composeTransferHideColumn')
                            }
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              onVisibilityChange(key, isHidden);
                            }}>
                            {isHidden ? (
                              <VisibilityOffOutlinedIcon fontSize="small" />
                            ) : (
                              <VisibilityOutlinedIcon fontSize="small" />
                            )}
                          </IconButton>
                        </span>
                      </Tooltip>
                    ) : null}
                  </span>
                  <span className={composeStyles.transferActionSlot}>
                    {!disabled && !isIdentifier ? (
                      <Tooltip title={t('reports.composeTransferMoveUp')}>
                        <span>
                          <IconButton
                            size="small"
                            disabled={!canMoveRowUp}
                            aria-label={t('reports.composeTransferMoveUp')}
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              moveChosenRow(key, -1);
                            }}>
                            <KeyboardArrowUpIcon fontSize="small" />
                          </IconButton>
                        </span>
                      </Tooltip>
                    ) : null}
                  </span>
                  <span className={composeStyles.transferActionSlot}>
                    {!disabled && !isIdentifier ? (
                      <Tooltip title={t('reports.composeTransferMoveDown')}>
                        <span>
                          <IconButton
                            size="small"
                            disabled={!canMoveRowDown}
                            aria-label={t('reports.composeTransferMoveDown')}
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              moveChosenRow(key, 1);
                            }}>
                            <KeyboardArrowDownIcon fontSize="small" />
                          </IconButton>
                        </span>
                      </Tooltip>
                    ) : null}
                  </span>
                  <span className={composeStyles.transferActionSlot}>
                    {!disabled && !isIdentifier ? (
                      <Tooltip title={t('reports.composeTransferRename')}>
                        <IconButton
                          size="small"
                          aria-label={t('reports.composeTransferRename')}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            startRename(key, label);
                          }}>
                          <EditOutlinedIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    ) : null}
                  </span>
                  <span className={composeStyles.transferActionSlot}>
                    {!disabled && !isIdentifier ? (
                      <Tooltip title={t('reports.composeTransferDuplicate')}>
                        <IconButton
                          size="small"
                          aria-label={t('reports.composeTransferDuplicate')}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            duplicateChosenRow(key, rowIndex);
                          }}>
                          <AddIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    ) : null}
                  </span>
                  <span className={composeStyles.transferActionSlot}>
                    {!disabled && isCustomLabel ? (
                      <Tooltip title={t('common.resetToDefault')}>
                        <IconButton
                          size="small"
                          aria-label={t('common.resetToDefault')}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            resetLabelToDefault(key);
                          }}>
                          <AutorenewIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    ) : null}
                  </span>
                </Box>
              ) : undefined
            }>
            <ListItemButton
              selected={false}
              disabled={disabled || isLockedChosen}
              onClick={() => {
                if (isLockedChosen) return;
                onToggle(key);
              }}
              className={
                side === 'chosen'
                  ? `${composeStyles.transferListItemButton} ${composeStyles.transferListItemButtonChosen}`
                  : composeStyles.transferListItemButton
              }>
              <ListItemIcon className={composeStyles.transferListCheckbox}>
                <Checkbox
                  edge="start"
                  size="small"
                  checked={isChecked}
                  tabIndex={-1}
                  disableRipple
                  disabled={disabled || isLockedChosen}
                />
              </ListItemIcon>
              {isRenaming ? (
                <TextField
                  autoFocus
                  size="small"
                  fullWidth
                  value={renameDraft}
                  disabled={disabled}
                  onClick={(e) => e.stopPropagation()}
                  onChange={(e) => setRenameDraft(e.target.value)}
                  onBlur={() => commitRename(key)}
                  onKeyDown={(e) => {
                    e.stopPropagation();
                    if (e.key === 'Enter') {
                      commitRename(key);
                    }
                    if (e.key === 'Escape') {
                      cancelRename();
                    }
                  }}
                  inputProps={{ 'aria-label': t('reports.tableFieldRenameAria', { field: key }) }}
                  sx={{ flex: 1, minWidth: 0, mr: side === 'chosen' ? 10 : 0 }}
                />
              ) : (
                <OverflowTooltip title={label}>
                  <ListItemText
                    primary={label}
                    primaryTypographyProps={{
                      variant: 'body2',
                      noWrap: true,
                      component: 'span',
                      className:
                        side === 'chosen' ? composeStyles.transferChosenLabelPrimary : undefined,
                      sx: { display: 'block', overflow: 'hidden', textOverflow: 'ellipsis' },
                    }}
                    className={
                      side === 'chosen' ? composeStyles.transferChosenLabel : undefined
                    }
                    sx={{ minWidth: 0, flex: 1, m: 0 }}
                  />
                </OverflowTooltip>
              )}
            </ListItemButton>
          </ListItem>
        );
      })}
    </List>
  );

  const toggleInList = (key: string, setter: Dispatch<SetStateAction<string[]>>) => {
    setter((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
  };

  const renderPanelHead = (
    title: string,
    itemKeys: string[],
    selectedKeys: string[],
    setSelectedKeys: Dispatch<SetStateAction<string[]>>,
  ) => {
    const { allChecked, indeterminate } = listCheckboxSelectionState(itemKeys, selectedKeys);

    return (
      <div className={composeStyles.transferPanelHead}>
        <Checkbox
          size="small"
          disabled={disabled || !itemKeys.length}
          checked={allChecked}
          indeterminate={indeterminate}
          onChange={() => {
            if (allChecked) {
              setSelectedKeys([]);
              return;
            }
            setSelectedKeys([...itemKeys]);
          }}
          onClick={(e) => e.stopPropagation()}
          inputProps={{
            'aria-label': `${title}: ${t('reports.tableFieldsSelectAll')}`,
          }}
          sx={{ p: 0.25, flexShrink: 0 }}
        />
        <Typography variant="caption" component="span" className={composeStyles.transferPanelTitle}>
          {title}
        </Typography>
      </div>
    );
  };

  return (
    <div className={composeStyles.transferRoot}>
      <div className={composeStyles.transferPanel}>
        {renderPanelHead(
          t('reports.composeTransferAvailable'),
          availableKeys,
          availableSelected,
          setAvailableSelected,
        )}
        <Box
          ref={availableListRef}
          className={composeStyles.transferListBox}
          onScroll={() =>
            syncScrollIndexFromList(availableListRef.current, availableKeys, setScrollIndexAvailable)
          }>
          {renderList(
            availableOptions,
            availableSelected,
            (key) => toggleInList(key, setAvailableSelected),
            'available',
          )}
        </Box>
        {renderScrollListStepper(
          availableKeys,
          scrollIndexAvailable,
          setScrollIndexAvailable,
          availableListRef,
        )}
      </div>

      <div className={composeStyles.transferActions}>
        <Tooltip title={t('reports.composeTransferAdd')}>
          <span>
            <IconButton
              size="small"
              disabled={disabled || !availableSelected.length}
              onClick={() => moveToChosen(availableSelected)}>
              <ChevronRightIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
        <Tooltip title={t('reports.composeTransferRemove')}>
          <span>
            <IconButton
              size="small"
              disabled={disabled || !chosenSelected.length}
              onClick={() => moveToAvailable(chosenSelected)}>
              <ChevronLeftIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
      </div>

      <div className={composeStyles.transferPanel}>
        {renderPanelHead(
          t('reports.composeTransferSelected'),
          chosenKeysList,
          chosenSelected,
          setChosenSelected,
        )}
        <Box
          ref={chosenListRef}
          className={composeStyles.transferListBox}
          onScroll={() =>
            syncScrollIndexFromList(chosenListRef.current, chosenKeysList, setScrollIndexChosen)
          }>
          {renderList(
            chosenOptions,
            chosenSelected,
            (key) => toggleInList(key, setChosenSelected),
            'chosen',
          )}
        </Box>
        {renderScrollListStepper(
          chosenKeysList,
          scrollIndexChosen,
          setScrollIndexChosen,
          chosenListRef,
        )}
      </div>
    </div>
  );
}
