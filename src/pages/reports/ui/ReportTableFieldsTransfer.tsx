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

import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import {
  Box,
  Checkbox,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';

import { OverflowTooltip } from '@shared/ui/overflow_tooltip/OverflowTooltip';
import type { Value, Values } from '@shared/ui/search_multiple_select';

import composeStyles from './ReportComposeModal.module.scss';

export type ReportTableFieldsTransferProps = {
  options: Values;
  value: Values;
  onChange: (selected: Values) => void;
  disabled?: boolean;
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
  return (customLabels[key] ?? item?.label ?? defaultLabels[key] ?? key).trim() || key;
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
}: ReportTableFieldsTransferProps) {
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

  const chosenKeys = useMemo(() => new Set(value.map(fieldKey)), [value]);

  const availableOptions = useMemo(
    () =>
      sortFieldsByLabel(
        options
          .filter((o) => !chosenKeys.has(fieldKey(o)))
          .map((o) => mergeOptionMeta(o, customLabelsByKey, defaultLabelsByValue)),
        customLabelsByKey,
        defaultLabelsByValue,
        sortLocale,
      ),
    [options, chosenKeys, customLabelsByKey, defaultLabelsByValue, sortLocale],
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
      onChange(next.map((item) => mergeOptionMeta(item, customLabelsByKey, defaultLabelsByValue)));
    },
    [onChange, customLabelsByKey, defaultLabelsByValue],
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
    const remove = new Set(keys);
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
    setCustomLabelsByKey((prev) => ({ ...prev, [fieldValue]: trimmed }));
    emitChosen(
      value.map((item) =>
        fieldKey(item) === fieldValue ? { ...item, value: fieldValue, label: trimmed } : item,
      ),
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

  const renderListStepper = (
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
      {items.map((option) => {
        const key = fieldKey(option);
        const isChecked = selectedKeys.includes(key);
        const label = fieldDisplayLabel(option, customLabelsByKey, defaultLabelsByValue);
        const isRenaming = side === 'chosen' && renamingKey === key;

        return (
          <ListItem
            key={key}
            disablePadding
            data-transfer-key={key}
            className={composeStyles.transferListItem}
            secondaryAction={
              side === 'chosen' && !disabled ? (
                <Tooltip title={t('reports.composeTransferRename')}>
                  <IconButton
                    edge="end"
                    size="small"
                    aria-label={t('reports.composeTransferRename')}
                    onClick={() => startRename(key, label)}>
                    <EditOutlinedIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              ) : undefined
            }>
            <ListItemButton
              selected={false}
              disabled={disabled}
              onClick={() => onToggle(key)}
              className={composeStyles.transferListItemButton}>
              <ListItemIcon className={composeStyles.transferListCheckbox}>
                <Checkbox
                  edge="start"
                  size="small"
                  checked={isChecked}
                  tabIndex={-1}
                  disableRipple
                  disabled={disabled}
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
                  sx={{ flex: 1, minWidth: 0, mr: side === 'chosen' ? 4 : 0 }}
                />
              ) : (
                <OverflowTooltip title={label}>
                  <ListItemText
                    primary={label}
                    primaryTypographyProps={{
                      variant: 'body2',
                      noWrap: true,
                      component: 'span',
                      sx: { display: 'block', overflow: 'hidden', textOverflow: 'ellipsis' },
                    }}
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
        {renderListStepper(
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
        {renderListStepper(
          chosenKeysList,
          scrollIndexChosen,
          setScrollIndexChosen,
          chosenListRef,
        )}
      </div>
    </div>
  );
}
