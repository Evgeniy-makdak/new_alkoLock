import { useCallback, useEffect, useMemo, useState, type Dispatch, type SetStateAction } from 'react';
import { useTranslation } from 'react-i18next';

import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
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

function fieldDisplayLabel(item: Value, customLabels: Record<string, string>, defaultLabels: Record<string, string>): string {
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
      sortFieldsByLabel(
        value.map((item) => mergeOptionMeta(item, customLabelsByKey, defaultLabelsByValue)),
        customLabelsByKey,
        defaultLabelsByValue,
        sortLocale,
      ),
    [value, customLabelsByKey, defaultLabelsByValue, sortLocale],
  );

  const optionsKey = useMemo(() => options.map(fieldKey).join('|'), [options]);

  useEffect(() => {
    setAvailableSelected([]);
    setChosenSelected([]);
    setRenamingKey(null);
    setCustomLabelsByKey((prev) => collectCustomLabelsFromValues(value, prev));
  }, [optionsKey, value]);

  const emitChosen = useCallback(
    (next: Values) => {
      onChange(sortFieldsByLabel(next, customLabelsByKey, defaultLabelsByValue, sortLocale));
    },
    [onChange, customLabelsByKey, defaultLabelsByValue, sortLocale],
  );

  useEffect(() => {
    if (!value.length) return;
    const sorted = sortFieldsByLabel(
      value.map((item) => mergeOptionMeta(item, customLabelsByKey, defaultLabelsByValue)),
      customLabelsByKey,
      defaultLabelsByValue,
      sortLocale,
    );
    const currentKeys = value.map(fieldKey).join('\0');
    const sortedKeys = sorted.map(fieldKey).join('\0');
    if (currentKeys !== sortedKeys) {
      emitChosen(sorted);
    }
  }, [value, customLabelsByKey, defaultLabelsByValue, sortLocale, emitChosen]);

  const moveToChosen = (keys: string[]) => {
    if (!keys.length) return;
    const next = [...value.map((item) => mergeOptionMeta(item, customLabelsByKey, defaultLabelsByValue))];
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
        const isSelected = selectedKeys.includes(key);
        const label = fieldDisplayLabel(option, customLabelsByKey, defaultLabelsByValue);
        const isRenaming = side === 'chosen' && renamingKey === key;

        return (
          <ListItem
            key={key}
            disablePadding
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
              selected={isSelected}
              disabled={disabled}
              onClick={() => onToggle(key)}
              className={composeStyles.transferListItemButton}>
              <ListItemIcon className={composeStyles.transferListCheckbox}>
                <Checkbox
                  edge="start"
                  size="small"
                  checked={isSelected}
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
                <ListItemText
                  primary={label}
                  primaryTypographyProps={{ variant: 'body2', noWrap: true }}
                />
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

  return (
    <div className={composeStyles.transferRoot}>
      <div className={composeStyles.transferPanel}>
        <Typography variant="caption" className={composeStyles.transferPanelTitle}>
          {t('reports.composeTransferAvailable')}
        </Typography>
        <Box className={composeStyles.transferListBox}>
          {renderList(availableOptions, availableSelected, (key) => toggleInList(key, setAvailableSelected), 'available')}
        </Box>
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
        <Typography variant="caption" className={composeStyles.transferPanelTitle}>
          {t('reports.composeTransferSelected')}
        </Typography>
        <Box className={composeStyles.transferListBox}>
          {renderList(chosenOptions, chosenSelected, (key) => toggleInList(key, setChosenSelected), 'chosen')}
        </Box>
      </div>
    </div>
  );
}
