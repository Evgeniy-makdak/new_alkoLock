import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import FilterAltOutlinedIcon from '@mui/icons-material/FilterAltOutlined';
import { Box, TextField, Typography } from '@mui/material';

import {
  getReportHavingAggregationOptions,
  getReportHavingModeOptions,
  getReportHavingOperatorOptions,
  normalizeHavingAggregationForApi,
  normalizeHavingModeForApi,
} from '@pages/reports/lib/buildReportGroupParam';
import { findReportTableFieldDefinition } from '@pages/reports/lib/buildReportTableFieldOptions';
import { buildDomainListValuesForAttribute } from '@pages/reports/lib/buildDomainListValuesForAttribute';
import { buildVehicleAttributeOptions } from '@pages/reports/lib/buildVehicleAttributeOptions';
import { buildDeviceEventHavingValueOptions } from '@pages/reports/lib/fetchDeviceEventHavingValueOptions';
import {
  fetchReportDomainEntityRecords,
  resolveReportDomainListEntityForFieldPath,
} from '@pages/reports/lib/fetchReportDomainEntityRecords';
import {
  commitReportBetweenFilterSlot,
  reportBetweenSlotValues,
} from '@pages/reports/lib/reportBetweenFilterSlots';
import {
  resolveReportFilterValueControlMode,
  resolveReportOperationNumberParameter,
} from '@pages/reports/lib/mapReportQueryOperator';
import {
  reportFilterAutocompleteSlotProps,
  reportFilterModalControlSx,
} from '@pages/reports/lib/reportFilterControlSx';
import { normalizeReportFilterSelectValues } from '@pages/reports/lib/reportFilterSelectValues';
import { toValuesFromSingleSelect } from '@pages/reports/lib/reportFilterSingleSelectValue';
import { isReportBooleanField } from '@pages/reports/lib/reportFieldFilterKind';
import { resolveComposeColumnDisplayLabel } from '@pages/reports/lib/restoreReportComposeTableFields';
import { reportsStore } from '@pages/reports/model/reportsStore';

import pageStyles from './Reports.module.scss';
import type { ReportComposeGroupRow } from '@pages/reports/types/reportComposeGroup';
import type {
  ReportEntityMetadata,
  ReportFieldDefinition,
  ReportFieldOperation,
  ReportOutputRow,
} from '@pages/reports/types/reportApiTypes';
import type { Values } from '@shared/ui/search_multiple_select';

import composeStyles from './ReportComposeModal.module.scss';
import { ReportComposeSection } from './ReportComposeSection';
import { ReportSearchMultipleSelect } from './ReportSearchMultipleSelect';

type ReportComposeHavingSectionProps = {
  columnOptions: Values;
  groupRows: ReportComposeGroupRow[];
  onChange: (rows: ReportComposeGroupRow[]) => void;
  entityMetadata: ReportEntityMetadata | null;
  outputRows: ReportOutputRow[];
  tableMetadataByRowId: Record<string, ReportEntityMetadata | null>;
  referenceEntityMetadataByName: Record<string, ReportEntityMetadata | null>;
  branchIds?: number[];
  columnHeaderLabels?: Record<string, string>;
};

function leafAttributeName(fieldPath: string): string {
  const key = fieldPath.trim();
  if (!key.includes('.')) return key;
  return key.slice(key.lastIndexOf('.') + 1);
}

function isVehicleColorOrTypePath(fieldPath: string): boolean {
  const leaf = leafAttributeName(fieldPath);
  return leaf === 'color' || leaf === 'type';
}

function buildMetadataHavingValueOptions(fieldDef: ReportFieldDefinition | null): Values {
  if (!fieldDef) return [];
  if (isReportBooleanField(fieldDef)) {
    return [
      { value: 'true', label: 'true' },
      { value: 'false', label: 'false' },
    ];
  }
  const out: Values = [];
  for (const item of fieldDef.allowedValues ?? []) {
    if (item == null) continue;
    if (typeof item === 'string' || typeof item === 'number') {
      out.push({ value: item, label: String(item) });
      continue;
    }
    const code = item.value ?? item.code ?? item.name;
    if (code == null) continue;
    out.push({
      value: code as string | number,
      label: String(item.label ?? item.name ?? code),
    });
  }
  return out;
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

function rowHasAggregation(row: ReportComposeGroupRow): boolean {
  const code = normalizeHavingAggregationForApi(row.havingAggregation);
  return Boolean(row.columnKey.trim() && code && code !== 'none');
}

/**
 * «Дополнительный фильтр к результату» — после «Группировки».
 * Поле подставляется автоматически из строки с агрегацией;
 * пользователь задаёт оператор и значение (и режим having при необходимости).
 */
export function ReportComposeHavingSection({
  columnOptions,
  groupRows,
  onChange,
  entityMetadata,
  outputRows,
  tableMetadataByRowId,
  referenceEntityMetadataByName,
  branchIds = [],
  columnHeaderLabels = {},
}: ReportComposeHavingSectionProps) {
  const { t } = useTranslation();
  const [domainOptionsByPath, setDomainOptionsByPath] = useState<Record<string, Values>>({});
  const [domainOptionsLoading, setDomainOptionsLoading] = useState(false);
  const vehicleLabelMaps = reportsStore((s) => s.vehicleLabelMaps);
  const loadVehicleLabelMaps = reportsStore((s) => s.loadVehicleLabelMaps);

  const entityName = entityMetadata?.entityName?.trim() ?? '';
  const havingRows = useMemo(() => groupRows.filter(rowHasAggregation), [groupRows]);

  useEffect(() => {
    const needsVehicleMaps = havingRows.some(
      (row) =>
        normalizeHavingModeForApi(row.havingMode) === 'comparison' &&
        isVehicleColorOrTypePath(row.columnKey),
    );
    if (needsVehicleMaps || entityName === 'Vehicle') {
      void loadVehicleLabelMaps();
    }
  }, [havingRows, entityName, loadVehicleLabelMaps]);

  const domainValueFieldPaths = useMemo(() => {
    const paths = new Set<string>();
    for (const row of havingRows) {
      if (normalizeHavingModeForApi(row.havingMode) !== 'comparison') continue;
      if (isVehicleColorOrTypePath(row.columnKey)) continue;
      const fieldDef = resolveGroupFieldDef(
        row.columnKey,
        entityMetadata,
        outputRows,
        tableMetadataByRowId,
        referenceEntityMetadataByName,
      );
      if (buildMetadataHavingValueOptions(fieldDef).length > 0) continue;
      if (!resolveReportDomainListEntityForFieldPath(row.columnKey, entityName)) continue;
      paths.add(row.columnKey);
    }
    return Array.from(paths).sort();
  }, [
    havingRows,
    entityName,
    entityMetadata,
    outputRows,
    tableMetadataByRowId,
    referenceEntityMetadataByName,
  ]);

  const branchIdsKey = branchIds.join(',');
  const domainValueFieldPathsKey = domainValueFieldPaths.join('\0');

  useEffect(() => {
    const fieldPaths = domainValueFieldPathsKey ? domainValueFieldPathsKey.split('\0') : [];
    if (!fieldPaths.length) {
      setDomainOptionsByPath({});
      setDomainOptionsLoading(false);
      return;
    }

    let cancelled = false;
    setDomainOptionsLoading(true);

    void (async () => {
      try {
        const next: Record<string, Values> = {};
        const byEntity = new Map<string, string[]>();
        for (const fieldPath of fieldPaths) {
          const source =
            resolveReportDomainListEntityForFieldPath(fieldPath, entityName) ?? 'DeviceEvent';
          const list = byEntity.get(source) ?? [];
          list.push(fieldPath);
          byEntity.set(source, list);
        }

        await Promise.all(
          Array.from(byEntity.entries()).map(async ([source, paths]) => {
            const records = await fetchReportDomainEntityRecords({
              entityName: source,
              searchQuery: '',
              branchIds,
            });
            for (const fieldPath of paths) {
              if (source === 'DeviceEvent') {
                next[fieldPath] = buildDeviceEventHavingValueOptions(records, fieldPath, '');
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
  }, [domainValueFieldPathsKey, entityName, branchIdsKey, branchIds]);

  const patchRow = (id: string, patch: Partial<ReportComposeGroupRow>) => {
    onChange(groupRows.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  };

  return (
    <ReportComposeSection
      icon={FilterAltOutlinedIcon}
      iconTone="amber"
      title={t('reports.composeSectionHaving', {
        defaultValue: 'Дополнительный фильтр к результату',
      })}>
      {havingRows.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          {t('reports.composeHavingEmpty', {
            defaultValue:
              'Появится после выбора агрегирующей функции в блоке «Группировка».',
          })}
        </Typography>
      ) : (
        <div className={composeStyles.filterGroups}>
          {havingRows.map((row, index) => {
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
            const leafAttr = leafAttributeName(row.columnKey);
            const vehicleDictionaryOptions =
              leafAttr === 'color' || leafAttr === 'type'
                ? buildVehicleAttributeOptions([], leafAttr, vehicleLabelMaps)
                : [];
            const metadataValueOptions = buildMetadataHavingValueOptions(fieldDef);
            const remoteValueOptions = domainOptionsByPath[row.columnKey] ?? [];
            const valueOptions =
              vehicleDictionaryOptions.length > 0
                ? vehicleDictionaryOptions
                : metadataValueOptions.length > 0
                  ? metadataValueOptions
                  : remoteValueOptions;

            const fieldLabel = resolveComposeColumnDisplayLabel(
              row.columnKey,
              columnOptions,
              columnHeaderLabels,
            );
            const aggregationLabel =
              aggregationOptions.find(
                (option) => String(option.value) === row.havingAggregation,
              )?.label ?? row.havingAggregation;
            const fieldValue: Values = [
              {
                value: row.columnKey,
                label: aggregationLabel
                  ? `${fieldLabel} (${aggregationLabel})`
                  : fieldLabel,
              },
            ];

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
            const havingModeValue = pickSingle(havingModeOptions, row.havingMode);
            const normalizedHavingMode = normalizeHavingModeForApi(row.havingMode);
            const showTopN = normalizedHavingMode === 'top_n';
            const showComparisonControls = normalizedHavingMode === 'comparison';
            const havingOperatorSelected = Boolean(String(row.operator ?? '').trim());
            const havingOperatorNumberParameter = resolveReportOperationNumberParameter(
              getReportHavingOperatorOptions(fieldDef),
              row.operator,
            );
            const havingValueMode = resolveReportFilterValueControlMode({
              operationCode: row.operator,
              numberParameter: havingOperatorNumberParameter,
            });
            // Значение — только после выбора оператора (каскад слева направо).
            const showHavingValueControls =
              showComparisonControls &&
              havingOperatorSelected &&
              havingValueMode.showValueControl;
            const waitsDomainOptions =
              showHavingValueControls &&
              metadataValueOptions.length === 0 &&
              Boolean(resolveReportDomainListEntityForFieldPath(row.columnKey, entityName)) &&
              domainOptionsLoading &&
              !valueOptions.length;
            // Справочник (users/…) если есть опции; иначе TextField.
            // commitFreeText на select — чтобы endsWith с ручным вводом тоже попадал в having.values.
            const showBetweenValues =
              showHavingValueControls && havingValueMode.isBetween;
            const showValuesSelect =
              showHavingValueControls &&
              !showBetweenValues &&
              (valueOptions.length > 0 || waitsDomainOptions);
            const showValuesTextInput =
              showHavingValueControls &&
              !showBetweenValues &&
              !showValuesSelect &&
              !waitsDomainOptions;

            return (
              <div key={row.id}>
                <div className={composeStyles.filterGroup}>
                  <div className={composeStyles.filterGroupMain}>
                    <div className={composeStyles.filterGroupHead}>
                      <span className={composeStyles.filterGroupLabel}>
                        {t('reports.composeHavingCard', {
                          number: index + 1,
                          defaultValue: 'Фильтр результата №{{number}}',
                        })}
                      </span>
                    </div>
                    <div className={composeStyles.filterGroupFields}>
                      <div className={composeStyles.modalFilterRow}>
                        <ReportSearchMultipleSelect
                          key={`report-having-field-${row.id}`}
                          multiple={false}
                          compact
                          name={`report-having-field-${row.id}`}
                          label={t('reports.composeHavingFieldLabel', {
                            defaultValue: 'Поле',
                          })}
                          values={fieldValue}
                          value={fieldValue}
                          serverFilter={false}
                          disabled
                          disableClearable
                          sx={reportFilterModalControlSx}
                          slotProps={reportFilterAutocompleteSlotProps}
                          setValueStore={() => undefined}
                        />

                        {havingModeOptions.length > 0 ? (
                          <ReportSearchMultipleSelect
                            key={`report-having-mode-${row.id}-${row.havingAggregation}`}
                            multiple={false}
                            compact
                            name={`report-having-mode-${row.id}`}
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
                                operator: nextMode === 'comparison' ? row.operator : '',
                                values: nextMode === 'comparison' ? row.values : [],
                              });
                            }}
                          />
                        ) : null}

                        {showComparisonControls && operatorOptions.length > 0 ? (
                          <ReportSearchMultipleSelect
                            key={`report-having-operator-${row.id}-${row.havingMode}`}
                            multiple={false}
                            compact
                            name={`report-having-operator-${row.id}`}
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

                        {showBetweenValues ? (
                          <Box className={pageStyles.reportFilterDateTimeRootRange}>
                            <ReportSearchMultipleSelect
                              key={`report-having-values-${row.id}-start`}
                              multiple
                              maxValues={1}
                              compact
                              commitFreeText
                              name={`report-having-values-${row.id}-start`}
                              label={t('reports.dateRangeStart')}
                              values={valueOptions}
                              value={reportBetweenSlotValues(row.values, 0)}
                              serverFilter={false}
                              isLoading={waitsDomainOptions}
                              sx={reportFilterModalControlSx}
                              slotProps={reportFilterAutocompleteSlotProps}
                              setValueStore={(_, next) => {
                                patchRow(row.id, {
                                  values: commitReportBetweenFilterSlot(
                                    row.values,
                                    0,
                                    normalizeReportFilterSelectValues(next),
                                  ),
                                });
                              }}
                            />
                            <Typography
                              component="span"
                              className={pageStyles.reportFilterDateTimeRangeSep}
                              color="text.secondary">
                              —
                            </Typography>
                            <ReportSearchMultipleSelect
                              key={`report-having-values-${row.id}-end`}
                              multiple
                              maxValues={1}
                              compact
                              commitFreeText
                              name={`report-having-values-${row.id}-end`}
                              label={t('reports.dateRangeEnd')}
                              values={valueOptions}
                              value={reportBetweenSlotValues(row.values, 1)}
                              serverFilter={false}
                              isLoading={waitsDomainOptions}
                              sx={reportFilterModalControlSx}
                              slotProps={reportFilterAutocompleteSlotProps}
                              setValueStore={(_, next) => {
                                patchRow(row.id, {
                                  values: commitReportBetweenFilterSlot(
                                    row.values,
                                    1,
                                    normalizeReportFilterSelectValues(next),
                                  ),
                                });
                              }}
                            />
                          </Box>
                        ) : null}

                        {showValuesSelect ? (
                          <ReportSearchMultipleSelect
                            multiple={!havingValueMode.isSingle}
                            maxValues={havingValueMode.maxValues}
                            compact
                            commitFreeText={!havingValueMode.isSingle}
                            name={`report-having-values-${row.id}`}
                            label={t('reports.composeGroupHavingValuesLabel')}
                            values={valueOptions}
                            value={
                              havingValueMode.isSingle ? row.values.slice(0, 1) : row.values
                            }
                            // Клиентский фильтр: serverFilter+поиск по /users на каждый символ
                            // дергает reset Autocomplete и стирает ввод после 1-го символа.
                            serverFilter={false}
                            isLoading={waitsDomainOptions}
                            sx={reportFilterModalControlSx}
                            slotProps={reportFilterAutocompleteSlotProps}
                            setValueStore={(_, next) => {
                              patchRow(row.id, {
                                values: havingValueMode.isSingle
                                  ? toValuesFromSingleSelect(next)
                                  : ((next as Values) ?? []),
                              });
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
                </div>
              </div>
            );
          })}
        </div>
      )}
    </ReportComposeSection>
  );
}
