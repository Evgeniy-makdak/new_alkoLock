import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import CloseIcon from '@mui/icons-material/Close';
import LayersOutlinedIcon from '@mui/icons-material/LayersOutlined';
import { IconButton, TextField, Tooltip, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';

import {
  getReportHavingAggregationOptions,
  getReportHavingModeOptions,
  getReportHavingOperatorOptions,
  normalizeHavingModeForApi,
} from '@pages/reports/lib/buildReportGroupParam';
import { findReportTableFieldDefinition } from '@pages/reports/lib/buildReportTableFieldOptions';
import { buildDomainListValuesForAttribute } from '@pages/reports/lib/buildDomainListValuesForAttribute';
import { buildDeviceEventHavingValueOptions } from '@pages/reports/lib/fetchDeviceEventHavingValueOptions';
import {
  fetchReportDomainEntityRecords,
  resolveReportDomainListEntityForFieldPath,
} from '@pages/reports/lib/fetchReportDomainEntityRecords';
import {
  reportFilterAutocompleteSlotProps,
  reportFilterModalControlSx,
} from '@pages/reports/lib/reportFilterControlSx';
import { toValuesFromSingleSelect } from '@pages/reports/lib/reportFilterSingleSelectValue';
import { isReportBooleanField } from '@pages/reports/lib/reportFieldFilterKind';
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
import { ReportLogicOperatorConnector } from './ReportFilterLogicConnector';
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
  /** Филиалы суперадмина для all.branch.id.in в device-events. */
  branchIds?: number[];
};

function buildMetadataHavingValueOptions(fieldDef: ReportFieldDefinition | null): Values {
  if (!fieldDef) return [];
  if (isReportBooleanField(fieldDef)) {
    return [
      { value: 'true', label: 'true' },
      { value: 'false', label: 'false' },
    ];
  }
  return (fieldDef.allowedValues ?? [])
    .map((item) => {
      if (item == null) return null;
      if (typeof item === 'string' || typeof item === 'number') {
        return { value: item, label: String(item) };
      }
      const code = item.value ?? item.code ?? item.name;
      if (code == null) return null;
      return {
        value: code as string | number,
        label: String(item.label ?? item.name ?? code),
      };
    })
    .filter((item): item is Values[number] => Boolean(item));
}

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
  logicOperator,
  onLogicOperatorChange,
  entityMetadata,
  outputRows,
  tableMetadataByRowId,
  referenceEntityMetadataByName,
  branchIds = [],
}: ReportComposeGroupSectionProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const circleIconSx = getToolbarCircleIconButtonSx(theme);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [domainOptionsByPath, setDomainOptionsByPath] = useState<Record<string, Values>>({});
  const [domainOptionsLoading, setDomainOptionsLoading] = useState(false);
  const [domainSearchByPath, setDomainSearchByPath] = useState<Record<string, string>>({});

  const entityName = entityMetadata?.entityName?.trim() ?? '';

  // Одно и то же поле можно выбрать в нескольких группировках — не вырезаем «занятые».
  const domainValueFieldPaths = useMemo(() => {
    const paths = new Set<string>();
    for (const row of groupRows) {
      if (!row.columnKey.trim()) continue;
      if (normalizeHavingModeForApi(row.havingMode) !== 'comparison') continue;
      const fieldDef = resolveGroupFieldDef(
        row.columnKey,
        entityMetadata,
        outputRows,
        tableMetadataByRowId,
        referenceEntityMetadataByName,
      );
      // BOOLEAN / ENUM из metadata — без доменного API.
      if (buildMetadataHavingValueOptions(fieldDef).length > 0) continue;
      if (!resolveReportDomainListEntityForFieldPath(row.columnKey, entityName)) continue;
      paths.add(row.columnKey);
    }
    return Array.from(paths).sort();
  }, [
    groupRows,
    entityName,
    entityMetadata,
    outputRows,
    tableMetadataByRowId,
    referenceEntityMetadataByName,
  ]);

  const branchIdsKey = branchIds.join(',');
  const domainValueFieldPathsKey = domainValueFieldPaths.join('\0');
  const domainSearchKey = domainValueFieldPaths
    .map((path) => `${path}=${domainSearchByPath[path] ?? ''}`)
    .join('\0');

  useEffect(() => {
    const fieldPaths = domainValueFieldPathsKey
      ? domainValueFieldPathsKey.split('\0')
      : [];
    if (!fieldPaths.length) {
      setDomainOptionsByPath({});
      setDomainOptionsLoading(false);
      return;
    }

    // Не AbortController: при «Сформировать отчёт» модалка размонтируется и abort()
    // красит device-events как (canceled) в Network — это не ошибка API.
    // Достаточно игнорировать ответ через cancelled.
    let cancelled = false;
    setDomainOptionsLoading(true);

    const searchByPath: Record<string, string> = {};
    for (const part of domainSearchKey ? domainSearchKey.split('\0') : []) {
      const eq = part.indexOf('=');
      if (eq < 0) continue;
      searchByPath[part.slice(0, eq)] = part.slice(eq + 1);
    }

    void (async () => {
      try {
        const next: Record<string, Values> = {};
        // Группируем пути по сущности справочника — один запрос на сущность+search.
        const byEntity = new Map<string, string[]>();
        for (const fieldPath of fieldPaths) {
          const source =
            resolveReportDomainListEntityForFieldPath(fieldPath, entityName) ?? 'DeviceEvent';
          const search = searchByPath[fieldPath] ?? '';
          const key = `${source}\n${search}`;
          const list = byEntity.get(key) ?? [];
          list.push(fieldPath);
          byEntity.set(key, list);
        }

        await Promise.all(
          Array.from(byEntity.entries()).map(async ([key, paths]) => {
            const [source, search = ''] = key.split('\n');
            const records = await fetchReportDomainEntityRecords({
              entityName: source,
              searchQuery: search,
              branchIds,
            });
            for (const fieldPath of paths) {
              if (source === 'DeviceEvent') {
                next[fieldPath] = buildDeviceEventHavingValueOptions(records, fieldPath, search);
              } else {
                const attr = fieldPath.includes('.')
                  ? fieldPath.slice(fieldPath.lastIndexOf('.') + 1)
                  : fieldPath;
                next[fieldPath] = buildDomainListValuesForAttribute(source, records, attr);
              }
            }
          }),
        );

        if (!cancelled) setDomainOptionsByPath(next);
      } catch {
        if (!cancelled) setDomainOptionsByPath({});
      } finally {
        if (!cancelled) setDomainOptionsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [domainValueFieldPathsKey, domainSearchKey, entityName, branchIdsKey, branchIds]);

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
              // Подписи: сначала label из availableHaving (бэк), иначе i18n/fallback.
              const labelFromMetaOrI18n =
                (i18nKeyPrefix: string) => (code: string, metaLabel: string) => {
                  if (metaLabel && metaLabel !== code) return metaLabel;
                  return t(`${i18nKeyPrefix}.${code}`, { defaultValue: metaLabel || code });
                };
              const operatorOptions = opsToLabeledValues(
                getReportHavingOperatorOptions(fieldDef),
                labelFromMetaOrI18n('reports.havingOperator'),
              );
              const aggregationOptions = opsToLabeledValues(
                getReportHavingAggregationOptions(fieldDef),
                labelFromMetaOrI18n('reports.havingAggregation'),
              );
              const havingModeOptions = opsToLabeledValues(
                getReportHavingModeOptions(fieldDef),
                labelFromMetaOrI18n('reports.havingMode'),
              );
              const metadataValueOptions = buildMetadataHavingValueOptions(fieldDef);
              const remoteValueOptions = domainOptionsByPath[row.columnKey] ?? [];
              const valueOptions =
                metadataValueOptions.length > 0 ? metadataValueOptions : remoteValueOptions;

              const selectedColumn = columnOptions.find(
                (option) => String(option.value) === row.columnKey,
              );
              const columnValue: Values = selectedColumn
                ? [selectedColumn]
                : row.columnKey
                  ? [{ value: row.columnKey, label: row.columnKey }]
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

              const operatorValue = pickSingle(operatorOptions, row.operator);
              const aggregationValue = pickSingle(aggregationOptions, row.havingAggregation);
              const havingModeValue = pickSingle(havingModeOptions, row.havingMode);

              const columnChoices = [
                ...columnValue,
                ...columnOptions.filter((option) => String(option.value) !== row.columnKey),
              ];
              const uniqueColumnChoices = Array.from(
                new Map(columnChoices.map((item) => [String(item.value), item])).values(),
              );

              const normalizedHavingMode = normalizeHavingModeForApi(row.havingMode);
              // По swagger:
              // top_n → поле N (topN); comparison → operator + values;
              // max_only / min_only / above_avg → только aggregation.
              const showTopN = normalizedHavingMode === 'top_n';
              const showComparisonControls = normalizedHavingMode === 'comparison';
              const waitsDomainOptions =
                showComparisonControls &&
                metadataValueOptions.length === 0 &&
                Boolean(resolveReportDomainListEntityForFieldPath(row.columnKey, entityName)) &&
                domainOptionsLoading &&
                !valueOptions.length;
              const showValuesSelect =
                showComparisonControls && (valueOptions.length > 0 || waitsDomainOptions);
              const showValuesTextInput =
                showComparisonControls && !showValuesSelect && !waitsDomainOptions;

              return (
                <div key={row.id}>
                  {index > 0 ? (
                    <ReportLogicOperatorConnector
                      value={logicOperator}
                      onChange={onLogicOperatorChange}
                    />
                  ) : null}
                  <div className={composeStyles.filterGroup}>
                  <div className={composeStyles.filterGroupMain}>
                    <div className={composeStyles.filterGroupHead}>
                      <span className={composeStyles.filterGroupLabel}>
                        {t('reports.composeGroupCard', { number: index + 1 })}
                      </span>
                    </div>
                    <div className={composeStyles.filterGroupFields}>
                      {/* modalFilterRow — та же ширина контролов, что у «Фильтрация» */}
                      <div className={composeStyles.modalFilterRow}>
                        <ReportSearchMultipleSelect
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
                            });
                          }}
                        />

                        {aggregationOptions.length > 0 ? (
                          <ReportSearchMultipleSelect
                            multiple={false}
                            compact
                            name={`report-group-aggregation-${row.id}`}
                            label={t('reports.composeGroupHavingAggregationLabel')}
                            values={aggregationOptions}
                            value={aggregationValue}
                            serverFilter={false}
                            sx={reportFilterModalControlSx}
                            slotProps={reportFilterAutocompleteSlotProps}
                            setValueStore={(_, next) => {
                              const picked = toValuesFromSingleSelect(next)[0];
                              patchRow(row.id, {
                                havingAggregation: picked ? String(picked.value) : '',
                              });
                            }}
                          />
                        ) : null}

                        {havingModeOptions.length > 0 ? (
                          <ReportSearchMultipleSelect
                            multiple={false}
                            compact
                            name={`report-group-having-mode-${row.id}`}
                            label={t('reports.composeGroupHavingModeLabel')}
                            values={havingModeOptions}
                            value={havingModeValue}
                            serverFilter={false}
                            sx={reportFilterModalControlSx}
                            slotProps={reportFilterAutocompleteSlotProps}
                            setValueStore={(_, next) => {
                              const picked = toValuesFromSingleSelect(next)[0];
                              const nextMode = picked
                                ? normalizeHavingModeForApi(String(picked.value)) ??
                                  String(picked.value)
                                : '';
                              patchRow(row.id, {
                                havingMode: nextMode,
                                topN: nextMode === 'top_n' ? row.topN : '',
                                // operator/values только для comparison
                                operator: nextMode === 'comparison' ? row.operator : '',
                                values: nextMode === 'comparison' ? row.values : [],
                              });
                            }}
                          />
                        ) : null}

                        {showComparisonControls && operatorOptions.length > 0 ? (
                          <ReportSearchMultipleSelect
                            multiple={false}
                            compact
                            name={`report-group-operator-${row.id}`}
                            label={t('reports.filterOperationLabel')}
                            values={operatorOptions}
                            value={operatorValue}
                            serverFilter={false}
                            sx={reportFilterModalControlSx}
                            slotProps={reportFilterAutocompleteSlotProps}
                            setValueStore={(_, next) => {
                              const picked = toValuesFromSingleSelect(next)[0];
                              patchRow(row.id, {
                                operator: picked ? String(picked.value) : '',
                                values: [],
                              });
                            }}
                          />
                        ) : null}

                        {showTopN ? (
                          <TextField
                            size="small"
                            type="number"
                            label={t('reports.composeGroupTopNLabel')}
                            placeholder={t('reports.composeGroupTopNPlaceholder')}
                            value={row.topN}
                            onChange={(event) => {
                              // только цифры; в payload уйдёт number
                              const raw = event.target.value.replace(/[^\d]/g, '');
                              patchRow(row.id, { topN: raw });
                            }}
                            sx={reportFilterModalControlSx}
                            inputProps={{
                              min: 0,
                              step: 1,
                              inputMode: 'numeric',
                              pattern: '[0-9]*',
                            }}
                          />
                        ) : null}

                        {showValuesSelect ? (
                          <ReportSearchMultipleSelect
                            multiple
                            compact
                            name={`report-group-values-${row.id}`}
                            label={t('reports.composeGroupHavingValuesLabel')}
                            values={valueOptions}
                            value={row.values}
                            serverFilter
                            isLoading={waitsDomainOptions}
                            sx={reportFilterModalControlSx}
                            slotProps={reportFilterAutocompleteSlotProps}
                            onInputChange={(next) => {
                              setDomainSearchByPath((prev) => ({
                                ...prev,
                                [row.columnKey]: next,
                              }));
                            }}
                            setValueStore={(_, next) => {
                              patchRow(row.id, { values: (next as Values) ?? [] });
                            }}
                          />
                        ) : null}

                        {showValuesTextInput ? (
                          <TextField
                            size="small"
                            label={t('reports.composeGroupHavingValuesLabel')}
                            placeholder={t('reports.composeGroupHavingValuesPlaceholder')}
                            value={row.values[0] != null ? String(row.values[0].value) : ''}
                            onChange={(event) => {
                              const raw = event.target.value;
                              const parsed =
                                raw.trim() !== '' && /^-?\d+(\.\d+)?$/.test(raw.trim())
                                  ? Number(raw.trim())
                                  : raw;
                              patchRow(row.id, {
                                values: raw
                                  ? [{ value: parsed as string | number, label: raw }]
                                  : [],
                              });
                            }}
                            sx={reportFilterModalControlSx}
                          />
                        ) : null}
                      </div>
                    </div>
                  </div>
                  <Tooltip title={t('reports.composeRemoveGroup')}>
                    <IconButton
                      type="button"
                      aria-label={t('reports.composeRemoveGroup')}
                      className={`${composeStyles.filterGroupRemoveBtn} ${pageStyles.reportFilterCircleBtn}`}
                      onClick={() => handleRemove(row.id)}
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
        columnOptions={columnOptions}
        requireLogicOperator={groupRows.length > 0}
        onClose={() => setAddDialogOpen(false)}
        onConfirm={handleConfirmAdd}
      />
    </>
  );
}
