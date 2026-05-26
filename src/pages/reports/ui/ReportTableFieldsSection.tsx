import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Box, Checkbox, FormControlLabel, FormGroup, TextField, Typography } from '@mui/material';

import type { Values } from '@shared/ui/search_multiple_select';

type ReportTableFieldLabelEditorProps = {
  value: string;
  label: string;
  disabled: boolean;
  onChange: (nextLabel: string) => void;
};

function ReportTableFieldLabelEditor({
  value,
  label,
  disabled,
  onChange,
}: ReportTableFieldLabelEditorProps) {
  const { t } = useTranslation();
  const [editing, setEditing] = useState(false);

  if (editing && !disabled) {
    return (
      <TextField
        autoFocus
        size="small"
        fullWidth
        value={label}
        onChange={(e) => onChange(e.target.value)}
        onBlur={() => setEditing(false)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === 'Escape') {
            setEditing(false);
          }
        }}
        inputProps={{ 'aria-label': t('reports.tableFieldRenameAria', { field: value }) }}
        sx={{ ml: 0.5, flex: 1 }}
      />
    );
  }

  return (
    <Typography
      component="span"
      variant="body2"
      onClick={(e) => {
        if (disabled) return;
        e.preventDefault();
        e.stopPropagation();
        setEditing(true);
      }}
      sx={{
        ml: 0.5,
        flex: 1,
        cursor: disabled ? 'default' : 'pointer',
        color: disabled ? 'text.disabled' : 'text.primary',
        borderBottom: disabled ? 'none' : '1px dashed',
        borderColor: 'divider',
        py: 0.25,
      }}>
      {label || value}
    </Typography>
  );
}

export type ReportTableFieldsSectionProps = {
  options: Values;
  value: Values;
  onChange: (selected: Values) => void;
  disabled?: boolean;
};

export function buildReportTableFieldsSelection(
  options: Values,
  checkedValues: Set<string>,
  labelsByValue: Record<string, string>,
  defaultLabelsByValue: Record<string, string>,
): Values {
  return options
    .filter((o) => checkedValues.has(String(o.value)))
    .map((o) => {
      const fieldValue = String(o.value);
      const label = (labelsByValue[fieldValue] ?? defaultLabelsByValue[fieldValue] ?? fieldValue).trim();
      return {
        ...o,
        label: label || defaultLabelsByValue[fieldValue] || fieldValue,
      };
    });
}

export function ReportTableFieldsSection({
  options,
  value,
  onChange,
  disabled = false,
}: ReportTableFieldsSectionProps) {
  const { t } = useTranslation();

  const defaultLabelsByValue = useMemo(() => {
    const map: Record<string, string> = {};
    for (const option of options) {
      map[String(option.value)] = option.label ?? String(option.value);
    }
    return map;
  }, [options]);

  const optionValues = useMemo(
    () => options.map((o) => String(o.value)),
    [options],
  );

  const [checkedValues, setCheckedValues] = useState<Set<string>>(() => new Set());
  const [labelsByValue, setLabelsByValue] = useState<Record<string, string>>({});
  const [optionsKey, setOptionsKey] = useState('');

  useEffect(() => {
    const nextKey = optionValues.join('|');
    if (nextKey === optionsKey && checkedValues.size > 0) return;

    const savedByValue = new Map(
      value.map((item) => [String(item.value), item.label ?? String(item.value)]),
    );

    const labels: Record<string, string> = {};
    for (const fieldValue of optionValues) {
      labels[fieldValue] = savedByValue.get(fieldValue) ?? defaultLabelsByValue[fieldValue] ?? fieldValue;
    }

    const checked =
      value.length > 0
        ? new Set(value.map((item) => String(item.value)))
        : new Set(optionValues);

    setLabelsByValue(labels);
    setCheckedValues(checked);
    setOptionsKey(nextKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset when options set changes
  }, [optionValues.join('|'), defaultLabelsByValue]);

  const emitChange = (checked: Set<string>, labels: Record<string, string>) => {
    onChange(buildReportTableFieldsSelection(options, checked, labels, defaultLabelsByValue));
  };

  const allChecked = optionValues.length > 0 && optionValues.every((v) => checkedValues.has(v));
  const someChecked = optionValues.some((v) => checkedValues.has(v));

  const toggleAll = () => {
    const next = allChecked ? new Set<string>() : new Set(optionValues);
    setCheckedValues(next);
    emitChange(next, labelsByValue);
  };

  const toggleOne = (fieldValue: string) => {
    setCheckedValues((prev) => {
      const next = new Set(prev);
      if (next.has(fieldValue)) {
        next.delete(fieldValue);
      } else {
        next.add(fieldValue);
      }
      emitChange(next, labelsByValue);
      return next;
    });
  };

  const updateLabel = (fieldValue: string, nextLabel: string) => {
    setLabelsByValue((prev) => {
      const labels = { ...prev, [fieldValue]: nextLabel };
      emitChange(checkedValues, labels);
      return labels;
    });
  };

  if (!options.length) {
    return (
      <Box sx={{ color: 'text.secondary', py: 1 }}>{t('reports.tableFieldsDialogEmpty')}</Box>
    );
  }

  return (
    <>
      <FormControlLabel
        control={
          <Checkbox
            checked={allChecked}
            indeterminate={someChecked && !allChecked}
            onChange={toggleAll}
            disabled={disabled}
          />
        }
        label={t('reports.tableFieldsSelectAll')}
      />
      <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>
        {t('reports.tableFieldRenameHint')}
      </Typography>
      <Box
        sx={{
          maxHeight: 280,
          overflowY: 'auto',
          border: 1,
          borderColor: 'divider',
          borderRadius: 1,
          px: 1,
          py: 0.5,
        }}>
        <FormGroup>
          {options.map((option) => {
            const fieldValue = String(option.value);
            const isChecked = checkedValues.has(fieldValue);
            return (
              <Box
                key={fieldValue}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  minHeight: 40,
                  py: 0.25,
                }}>
                <Checkbox
                  checked={isChecked}
                  onChange={() => toggleOne(fieldValue)}
                  disabled={disabled}
                  sx={{ p: 0.75 }}
                />
                <ReportTableFieldLabelEditor
                  value={fieldValue}
                  label={labelsByValue[fieldValue] ?? defaultLabelsByValue[fieldValue] ?? fieldValue}
                  disabled={disabled || !isChecked}
                  onChange={(next) => updateLabel(fieldValue, next)}
                />
              </Box>
            );
          })}
        </FormGroup>
      </Box>
    </>
  );
}
