import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Box, Checkbox, FormControlLabel, FormGroup, TextField, Typography } from '@mui/material';

import { InputsColumnWrapper } from '@shared/components/Inputs_column_wrapper';
import { Button } from '@shared/ui/button';
import { Popup } from '@shared/ui/popup';
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

type ReportTableFieldsDialogProps = {
  open: boolean;
  options: Values;
  /** Предыдущий выбор (в т.ч. переименованные label → alias в POST). */
  initialSelection?: Values;
  onClose: () => void;
  onConfirm: (selected: Values) => void;
};

export function ReportTableFieldsDialog({
  open,
  options,
  initialSelection,
  onClose,
  onConfirm,
}: ReportTableFieldsDialogProps) {
  const { t } = useTranslation();
  const [checkedValues, setCheckedValues] = useState<Set<string>>(new Set());
  const [labelsByValue, setLabelsByValue] = useState<Record<string, string>>({});

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

  useEffect(() => {
    if (!open) return;

    const savedByValue = new Map(
      (initialSelection ?? []).map((item) => [String(item.value), item.label ?? String(item.value)]),
    );

    const labels: Record<string, string> = {};
    for (const value of optionValues) {
      labels[value] = savedByValue.get(value) ?? defaultLabelsByValue[value] ?? value;
    }

    const checked =
      initialSelection && initialSelection.length > 0
        ? new Set(initialSelection.map((item) => String(item.value)))
        : new Set(optionValues);

    setLabelsByValue(labels);
    setCheckedValues(checked);
  }, [open, optionValues, defaultLabelsByValue, initialSelection]);

  const allChecked = optionValues.length > 0 && optionValues.every((v) => checkedValues.has(v));
  const someChecked = optionValues.some((v) => checkedValues.has(v));

  const toggleAll = () => {
    if (allChecked) {
      setCheckedValues(new Set());
    } else {
      setCheckedValues(new Set(optionValues));
    }
  };

  const toggleOne = (value: string) => {
    setCheckedValues((prev) => {
      const next = new Set(prev);
      if (next.has(value)) {
        next.delete(value);
      } else {
        next.add(value);
      }
      return next;
    });
  };

  const updateLabel = (value: string, nextLabel: string) => {
    setLabelsByValue((prev) => ({ ...prev, [value]: nextLabel }));
  };

  const handleConfirm = () => {
    const selected = options
      .filter((o) => checkedValues.has(String(o.value)))
      .map((o) => {
        const value = String(o.value);
        const label = (labelsByValue[value] ?? defaultLabelsByValue[value] ?? value).trim();
        return {
          ...o,
          label: label || defaultLabelsByValue[value] || value,
        };
      });
    if (!selected.length) return;
    onConfirm(selected);
    onClose();
  };

  const handleClose = () => {
    onClose();
  };

  return (
    <Popup
      isOpen={open}
      headerTitle={t('reports.tableFieldsDialogTitle')}
      toggleModal={handleClose}
      onCloseModal={handleClose}
      body={
        <InputsColumnWrapper>
          {options.length > 0 ? (
            <>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={allChecked}
                    indeterminate={someChecked && !allChecked}
                    onChange={toggleAll}
                  />
                }
                label={t('reports.tableFieldsSelectAll')}
              />
              <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5 }}>
                {t('reports.tableFieldRenameHint')}
              </Typography>
              <Box
                sx={{
                  maxHeight: 360,
                  overflowY: 'auto',
                  border: 1,
                  borderColor: 'divider',
                  borderRadius: 1,
                  px: 1,
                  py: 0.5,
                }}>
                <FormGroup>
                  {options.map((option) => {
                    const value = String(option.value);
                    const isChecked = checkedValues.has(value);
                    return (
                      <Box
                        key={value}
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          minHeight: 40,
                          py: 0.25,
                        }}>
                        <Checkbox
                          checked={isChecked}
                          onChange={() => toggleOne(value)}
                          sx={{ p: 0.75 }}
                        />
                        <ReportTableFieldLabelEditor
                          value={value}
                          label={labelsByValue[value] ?? defaultLabelsByValue[value] ?? value}
                          disabled={!isChecked}
                          onChange={(next) => updateLabel(value, next)}
                        />
                      </Box>
                    );
                  })}
                </FormGroup>
              </Box>
            </>
          ) : (
            <Box sx={{ color: 'text.secondary', py: 1 }}>{t('reports.tableFieldsDialogEmpty')}</Box>
          )}
        </InputsColumnWrapper>
      }
      buttons={[
        <Button key="create" disabled={!someChecked} onClick={handleConfirm}>
          {t('reports.createReport')}
        </Button>,
        <Button key="cancel" onClick={handleClose}>
          {t('common.cancel')}
        </Button>,
      ]}
    />
  );
}
