import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import CloseIcon from '@mui/icons-material/Close';
import LayersOutlinedIcon from '@mui/icons-material/LayersOutlined';
import { Checkbox, FormControlLabel, IconButton, Tooltip, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';

import {
  getReportHavingAggregationOptions,
  normalizeHavingAggregationForApi,
} from '@pages/reports/lib/buildReportGroupParam';
import { findReportTableFieldDefinition } from '@pages/reports/lib/buildReportTableFieldOptions';
import {
  reportFilterAutocompleteSlotProps,
  reportFilterModalControlSx,
} from '@pages/reports/lib/reportFilterControlSx';
import { toValuesFromSingleSelect } from '@pages/reports/lib/reportFilterSingleSelectValue';
import { resolveComposeColumnDisplayLabel } from '@pages/reports/lib/restoreReportComposeTableFields';
import { getToolbarCircleIconButtonSx } from '@shared/lib/toolbarCircleAddButtonSx';
import type { ReportComposeGroupRow } from '@pages/reports/types/reportComposeGroup';
import { createReportComposeGroupRow } from '@pages/reports/types/reportComposeGroup';
import type {
  ReportEntityMetadata,
  ReportFieldDefinition,
  ReportFieldOperation,
  ReportLogicOperator,
  ReportOutputRow,
} from '@pages/reports/types/reportApiTypes';
import type { Values } from '@shared/ui/search_multiple_select';

import { ReportAddGroupDialog, type ReportAddGroupConfirm } from './ReportAddGroupDialog';
import composeStyles from './ReportComposeModal.module.scss';
import { ReportComposeSection } from './ReportComposeSection';
import { ReportSearchMultipleSelect } from './ReportSearchMultipleSelect';
import pageStyles from './Reports.module.scss';

type ReportComposeGroupSectionProps = {
  columnOptions: Values;
  groupRows: ReportComposeGroupRow[];
  onChange: (rows: ReportComposeGroupRow[]) => void;
  logicOperator: ReportLogicOperator;
  onLogicOperatorChange: (logicOperator: ReportLogicOperator) => void;
  entityMetadata: ReportEntityMetadata | null;
  outputRows: ReportOutputRow[];
  tableMetadataByRowId: Record<string, ReportEntityMetadata | null>;
  referenceEntityMetadataByName: Record<string, ReportEntityMetadata | null>;
  /** Филиалы суперадмина для all.branch.id.in в device-events (having-секция). */
  branchIds?: number[];
  /** Подписи колонок сформированного отчёта (edit) — если поля нет в columnOptions. */
  columnHeaderLabels?: Record<string, string>;
};

function resolveGroupFieldDef(
  columnKey: string,
  entityMetadata: ReportEntityMetadata | null,
  outputRows: ReportOutputRow[],
  tableMetadataByRowId: Record<string, ReportEntityMetadata | null>,
  referenceEntityMetadataByName: Record<string, ReportEntityMetadata | null>,
): ReportFieldDefinition | null {
  if (!entityMetadata || !columnKey) return null;
  const fieldMap = new Map(entityMetadata.fields.map((field) => [field.fieldName, field]));
  return (
    findReportTableFieldDefinition(
      columnKey,
      entityMetadata,
      outputRows,
      fieldMap,
      tableMetadataByRowId,
      referenceEntityMetadataByName,
    ) ?? null
  );
}

function opsToLabeledValues(
  ops: ReportFieldOperation[],
  labelOf: (code: string, fallback: string) => string,
): Values {
  return ops.map((op) => {
    const code = String(op.code);
    return { value: code, label: labelOf(code, op.label || code) };
  });
}

export function ReportComposeGroupSection({
  columnOptions,
  groupRows,
  onChange,
  onLogicOperatorChange,
  entityMetadata,
  outputRows,
  tableMetadataByRowId,
  referenceEntityMetadataByName,
  columnHeaderLabels = {},
}: ReportComposeGroupSectionProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const circleIconSx = getToolbarCircleIconButtonSx(theme);
  const [addDialogOpen, setAddDialogOpen] = useState(false);

  const handleConfirmAdd = ({ columnKey, logicOperator: nextLogic }: ReportAddGroupConfirm) => {
    if (nextLogic) {
      onLogicOperatorChange(nextLogic);
    }
    onChange([...groupRows, createReportComposeGroupRow(columnKey)]);
  };

  const handleRemove = (id: string) => {
    onChange(groupRows.filter((row) => row.id !== id));
  };

  const patchRow = (id: string, patch: Partial<ReportComposeGroupRow>) => {
    onChange(groupRows.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  };

  const canAddGroup = columnOptions.length > 0;

  const usedGroupColumnKeys = useMemo(
    () => new Set(groupRows.map((row) => row.columnKey.trim()).filter(Boolean)),
    [groupRows],
  );
  const availableGroupColumnOptions = columnOptions.filter(
    (option) => !usedGroupColumnKeys.has(String(option.value)),
  );

  return (
    <>
      <ReportComposeSection
        icon={LayersOutlinedIcon}
        iconTone="amber"
        title={t('reports.composeSectionGroup')}
        action={
          <button
            type="button"
            className={composeStyles.addGroupLink}
            disabled={!canAddGroup}
            onClick={() => setAddDialogOpen(true)}>
            {t('reports.composeAddGroup')}
          </button>
        }>
        {groupRows.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            {t('reports.composeGroupColumnPlaceholder')}
          </Typography>
        ) : (
          <div className={composeStyles.filterGroups}>
            {groupRows.map((row, index) => {
              const fieldDef = resolveGroupFieldDef(
                row.columnKey,
                entityMetadata,
                outputRows,
                tableMetadataByRowId,
                referenceEntityMetadataByName,
              );
              const labelFromMetaOrI18n =
                (i18nKeyPrefix: string) => (code: string, metaLabel: string) => {
                  if (metaLabel && metaLabel !== code) return metaLabel;
                  return t(`${i18nKeyPrefix}.${code}`, { defaultValue: metaLabel || code });
                };
              const aggregationOptions = opsToLabeledValues(
                getReportHavingAggregationOptions(fieldDef),
                labelFromMetaOrI18n('reports.havingAggregation'),
              );
              const noAggregationOption = aggregationOptions.find((option) => {
                const raw = String(option.value);
                const code = raw.startsWith('fn:') ? raw.slice(3) : raw;
                return normalizeHavingAggregationForApi(code) === 'none';
              });

              const selectedColumn = columnOptions.find(
                (option) => String(option.value) === row.columnKey,
              );
              const columnValue: Values = selectedColumn
                ? [selectedColumn]
                : row.columnKey
                  ? [
                      {
                        value: row.columnKey,
                        label: resolveComposeColumnDisplayLabel(
                          row.columnKey,
                          columnOptions,
                          columnHeaderLabels,
                        ),
                      },
                    ]
                  : [];

              const pickSingle = (options: Values, code: string): Values =>
                code
                  ? [
                      options.find((o) => String(o.value) === code) ?? {
                        value: code,
                        label: code,
                      },
                    ]
                  : [];

              const aggregationValue = pickSingle(
                aggregationOptions,
                row.havingAggregation ||
                  (noAggregationOption ? String(noAggregationOption.value) : ''),
              );

              const columnChoices = [
                ...columnValue,
                ...columnOptions.filter((option) => String(option.value) !== row.columnKey),
              ];
              const uniqueColumnChoices = Array.from(
                new Map(columnChoices.map((item) => [String(item.value), item])).values(),
              );

              const hasColumn = Boolean(row.columnKey.trim());
              const aggregationCode = normalizeHavingAggregationForApi(row.havingAggregation);
              const hasAggregation = Boolean(aggregationCode && aggregationCode !== 'none');

              return (
                <div key={row.id}>
                  <div className={composeStyles.filterGroup}>
                    <div className={composeStyles.filterGroupMain}>
                      <div className={composeStyles.filterGroupHead}>
                        <span className={composeStyles.filterGroupLabel}>
                          {t('reports.composeGroupCard', { number: index + 1 })}
                        </span>
                      </div>
                      <div className={composeStyles.filterGroupFields}>
                        <div className={composeStyles.modalFilterRow}>
                          <ReportSearchMultipleSelect
                            key={`report-group-field-${row.id}`}
                            multiple={false}
                            compact
                            name={`report-group-field-${row.id}`}
                            label={t('reports.composeGroupColumnLabel')}
                            placeholder={t('reports.composeGroupColumnPlaceholder')}
                            values={uniqueColumnChoices}
                            value={columnValue}
                            serverFilter={false}
                            sx={reportFilterModalControlSx}
                            slotProps={reportFilterAutocompleteSlotProps}
                            setValueStore={(_, next) => {
                              const picked = toValuesFromSingleSelect(next)[0];
                              patchRow(row.id, {
                                columnKey: picked ? String(picked.value) : '',
                                operator: '',
                                havingAggregation: '',
                                havingMode: '',
                                topN: '',
                                values: [],
                                autoAggregateRemainingFields: false,
                              });
                            }}
                          />

                          {hasColumn && aggregationOptions.length > 0 ? (
                            <ReportSearchMultipleSelect
                              key={`report-group-aggregation-${row.id}-${row.columnKey}`}
                              multiple={false}
                              compact
                              name={`report-group-aggregation-${row.id}`}
                              label={t('reports.composeGroupHavingAggregationLabel')}
                              values={aggregationOptions}
                              value={aggregationValue}
                              serverFilter={false}
                              disableClearable
                              onKeyDown={(event) => {
                                const keyEdit = event.key;
                                if (event.ctrlKey || event.metaKey || event.altKey) return;
                                if (
                                  keyEdit.length === 1 ||
                                  keyEdit === 'Backspace' ||
                                  keyEdit === 'Delete'
                                ) {
                                  event.preventDefault();
                                }
                              }}
                              sx={reportFilterModalControlSx}
                              slotProps={reportFilterAutocompleteSlotProps}
                              setValueStore={(_, next) => {
                                const picked = toValuesFromSingleSelect(next)[0];
                                const nextAgg = picked ? String(picked.value) : '';
                                const nextAggCode = normalizeHavingAggregationForApi(nextAgg);
                                const clearsHavingChildren =
                                  !nextAggCode || nextAggCode === 'none';
                                patchRow(row.id, {
                                  havingAggregation: nextAgg,
                                  ...(clearsHavingChildren
                                    ? {
                                        havingMode: '',
                                        operator: '',
                                        topN: '',
                                        values: [],
                                        autoAggregateRemainingFields: false,
                                      }
                                    : {}),
                                });
                              }}
                            />
                          ) : null}
                        </div>

                        {hasColumn && hasAggregation ? (
                          <FormControlLabel
                            sx={{
                              mt: 0.5,
                              ml: 0,
                              alignItems: 'center',
                              '& .MuiFormControlLabel-label': {
                                lineHeight: 1.25,
                              },
                            }}
                            control={
                              <Checkbox
                                size="small"
                                checked={row.autoAggregateRemainingFields}
                                onChange={(event) => {
                                  patchRow(row.id, {
                                    autoAggregateRemainingFields: event.target.checked,
                                  });
                                }}
                                sx={{ p: 0.5 }}
                              />
                            }
                            label={t('reports.composeGroupAutoAggregateRemaining', {
                              defaultValue:
                                'Автоматически добавлять остальные поля в агрегирующую функцию',
                            })}
                          />
                        ) : null}
                      </div>
                    </div>
                    <Tooltip title={t('reports.composeRemoveGroup')}>
                      <IconButton
                        type="button"
                        aria-label={t('reports.composeRemoveGroup')}
                        className={`${composeStyles.filterGroupRemoveBtn} ${pageStyles.reportFilterCircleBtn}`}
                        onClick={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          handleRemove(row.id);
                        }}
                        sx={circleIconSx}>
                        <CloseIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </ReportComposeSection>

      <ReportAddGroupDialog
        open={addDialogOpen}
        columnOptions={availableGroupColumnOptions}
        requireLogicOperator={false}
        onClose={() => setAddDialogOpen(false)}
        onConfirm={handleConfirmAdd}
      />
    </>
  );
}
