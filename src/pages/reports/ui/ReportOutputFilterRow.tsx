import { useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
import { Box, IconButton, Tooltip } from '@mui/material';
import { useTheme } from '@mui/material/styles';

import { operationsToValues } from '@pages/reports/lib/buildReportQueryRequest';
import { isReportSingleValueFilterOperation } from '@pages/reports/lib/mapReportQueryOperator';
import { getStaticOptionsForControl } from '@pages/reports/lib/extractMetadataFilterOptions';
import {
  isNestedFilterPathReadyForValueInput,
  normalizeNestedFilterPath,
  resolveNestedFilterLeafEntityName,
  resolveNestedFilterLeafField,
} from '@pages/reports/lib/reportNestedFilterPath';
import {
  isRootCompositeOutputFilter,
  parseCompositePath,
  resolveReportOutputPrimaryField,
} from '@pages/reports/lib/reportEntityCompositeFields';
import { isReportOutputRowComplete } from '@pages/reports/lib/reportOutputRow';
import {
  reportFilterAutocompleteSlotProps,
  reportFilterControlSx,
  reportFilterModalControlSx,
} from '@pages/reports/lib/reportFilterControlSx';
import { toValuesFromSingleSelect } from '@pages/reports/lib/reportFilterSingleSelectValue';
import {
  reportOutputFunctionKey,
  reportOutputOperationKey,
} from '@pages/reports/lib/reportOutputFilterKeys';
import { reportsStore } from '@pages/reports/model/reportsStore';
import { getToolbarCircleIconButtonSx } from '@shared/lib/toolbarCircleAddButtonSx';
import type {
  ReportEntityMetadata,
  ReportFieldDefinition,
  ReportFilterControlDef,
  ReportNestedEntityFilterState,
  ReportOutputRow,
} from '@pages/reports/types/reportApiTypes';
import type { Values } from '@shared/ui/search_multiple_select';

import { ReportCompositeEntityValueControl } from './ReportCompositeEntityValueControl';
import { ReportFieldFilterControl } from './ReportFieldFilterControl';
import { ReportNestedEntityFilterControl } from './ReportNestedEntityFilterControl';
import { ReportSearchMultipleSelect } from './ReportSearchMultipleSelect';

import composeStyles from './ReportComposeModal.module.scss';
import pageStyles from './Reports.module.scss';

type ReportOutputFilterRowProps = {
  row: ReportOutputRow;
  /** modal — все контролы строки видны сразу (без пошагового раскрытия). */
  variant?: 'inline' | 'modal';
  isPrimaryRow: boolean;
  metadata: ReportEntityMetadata;
  outputFieldOptions: Values;
  fieldMap: Map<string, ReportFieldDefinition>;
  groupControls: ReportFilterControlDef[];
  showAddButton: boolean;
  onRequestAddRow: () => void;
  onRemoveRow?: () => void;
  onOutputFieldChange: (values: Values) => void;
  onFilterChange: (controlId: string, values: Values) => void;
  onNestedFilterChange: (fieldName: string, patch: Partial<ReportNestedEntityFilterState>) => void;
};

export function ReportOutputFilterRow({
  row,
  variant = 'inline',
  isPrimaryRow,
  metadata,
  outputFieldOptions,
  fieldMap,
  groupControls,
  showAddButton,
  onRequestAddRow,
  onRemoveRow,
  onOutputFieldChange,
  onFilterChange,
  onNestedFilterChange,
}: ReportOutputFilterRowProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const addCircleSx = getToolbarCircleIconButtonSx(theme);

  const primaryKey = row.selectedOutputFields[0] ? String(row.selectedOutputFields[0].value) : '';
  const primaryField = primaryKey
    ? resolveReportOutputPrimaryField(primaryKey, fieldMap, metadata, t)
    : null;
  const rootCompositeFilter = isRootCompositeOutputFilter(primaryKey, metadata);
  const rootCompositeParsed = rootCompositeFilter ? parseCompositePath(primaryKey) : null;
  const rootCompositeKind =
    rootCompositeParsed &&
    rootCompositeParsed.kind !== 'Coordinates' &&
    (rootCompositeParsed.kind === 'User' ||
      rootCompositeParsed.kind === 'MonitoringDevice' ||
      rootCompositeParsed.kind === 'Vehicle')
      ? rootCompositeParsed.kind
      : undefined;
  const refEntity = rootCompositeFilter ? null : primaryField?.referenceEntity?.trim();
  const loadReportTableFieldsMetadata = reportsStore((s) => s.loadReportTableFieldsMetadata);
  const tableFieldsMetadata = reportsStore((s) => s.reportTableFieldsMetadataByRowId[row.id] ?? null);
  const tableFieldsMetadataLoading = reportsStore(
    (s) => s.reportTableFieldsMetadataLoadingByRowId[row.id] ?? false,
  );
  const referenceEntityMetadataByName = reportsStore((s) => s.referenceEntityMetadataByName);
  const referenceEntityMetadataLoadingByName = reportsStore(
    (s) => s.referenceEntityMetadataLoadingByName,
  );
  const vehicleLabelMaps = reportsStore((s) => s.vehicleLabelMaps);

  const nestedState = primaryField ? row.nestedEntityFilterByField[primaryField.fieldName] : undefined;
  const nestedPath = nestedState ? normalizeNestedFilterPath(nestedState) : [];

  useEffect(() => {
    if (!refEntity) return;
    void loadReportTableFieldsMetadata(row.id, refEntity);
  }, [refEntity, row.id, loadReportTableFieldsMetadata]);

  const operationKey = reportOutputOperationKey(row.id);
  const functionKey = reportOutputFunctionKey(row.id);
  const filterOperationCode = useMemo(() => {
    const picked = row.filterSelections[operationKey]?.[0];
    return picked?.value != null && picked.value !== '' ? String(picked.value) : null;
  }, [row.filterSelections, operationKey]);

  /** Операторы/функции — только availableOperations / availableFunctions текущего листа metadata. */
  const operationFunctionSource = useMemo(() => {
    if (!primaryField) return null;
    if (refEntity) {
      if (!nestedPath.length) return null;
      return (
        resolveNestedFilterLeafField(
          tableFieldsMetadata,
          nestedPath,
          referenceEntityMetadataByName,
        ) ?? null
      );
    }
    return primaryField;
  }, [primaryField, refEntity, nestedPath, tableFieldsMetadata, referenceEntityMetadataByName]);

  const operationOptions = useMemo(
    () => operationsToValues(operationFunctionSource?.availableOperations),
    [operationFunctionSource],
  );
  const functionOptions = useMemo(
    () => operationsToValues(operationFunctionSource?.availableFunctions),
    [operationFunctionSource],
  );

  // Смена листа metadata: сбрасываем оператор/функцию, которых нет в новых списках.
  useEffect(() => {
    // Пока лист не известен — не трогаем выбор (идут промежуточные metadata).
    if (!operationFunctionSource) return;

    const allowedOps = new Set(operationOptions.map((o) => String(o.value)));
    const allowedFns = new Set(functionOptions.map((o) => String(o.value)));
    const selectedOp = row.filterSelections[operationKey]?.[0];
    const selectedFn = row.filterSelections[functionKey]?.[0];

    if (selectedOp && !allowedOps.has(String(selectedOp.value))) {
      onFilterChange(operationKey, []);
    }
    if (selectedFn && !allowedFns.has(String(selectedFn.value))) {
      onFilterChange(functionKey, []);
    }
  }, [
    operationFunctionSource,
    operationOptions,
    functionOptions,
    operationKey,
    functionKey,
    row.filterSelections,
    onFilterChange,
  ]);

  const nestedAttributeReady = Boolean(
    refEntity &&
      isNestedFilterPathReadyForValueInput(
        tableFieldsMetadata,
        nestedPath,
        referenceEntityMetadataByName,
      ),
  );

  const nestedTerminalReady = Boolean(
    nestedAttributeReady && (nestedState?.values?.length ?? 0) > 0,
  );

  const scalarTerminalReady = Boolean(
    primaryField &&
      !refEntity &&
      primaryField.filterable &&
      (row.filterSelections[primaryField.fieldName]?.length ?? 0) > 0,
  );

  const outputControlsReady = Boolean(
    primaryField &&
      (nestedTerminalReady || scalarTerminalReady || (!refEntity && !primaryField.filterable)),
  );

  const selectedOutputSingle = row.selectedOutputFields.slice(0, 1);

  const isModalVariant = variant === 'modal';
  const rowComplete = isReportOutputRowComplete(
    row,
    fieldMap,
    tableFieldsMetadata,
    metadata,
    referenceEntityMetadataByName,
    t,
  );
  const canShowAddButton = showAddButton && rowComplete && !isModalVariant;

  const showOperatorField = isModalVariant
    ? Boolean(primaryField) &&
      operationOptions.length > 0 &&
      (!refEntity || nestedAttributeReady)
    : refEntity
      ? nestedAttributeReady && operationOptions.length > 0
      : outputControlsReady && operationOptions.length > 0;

  const showFunctionField =
    (isModalVariant ? Boolean(primaryField) : outputControlsReady) && functionOptions.length > 0;

  const selectSx = isModalVariant ? reportFilterModalControlSx : reportFilterControlSx;
  const selectCompact = isModalVariant;

  const filterOperationBlock =
    primaryField && showOperatorField ? (
      <ReportSearchMultipleSelect
        multiple={false}
        compact={selectCompact}
        name={operationKey}
        label={t('reports.filterOperationLabel')}
        values={operationOptions}
        value={row.filterSelections[operationKey] ?? []}
        serverFilter={false}
        isLoading={Boolean(refEntity && tableFieldsMetadataLoading)}
        sx={selectSx}
        slotProps={reportFilterAutocompleteSlotProps}
        setValueStore={(_, value) => {
          const nextOperation = toValuesFromSingleSelect(value);
          const prevOperationCode = filterOperationCode;
          const nextOperationCode =
            nextOperation[0]?.value != null && nextOperation[0].value !== ''
              ? String(nextOperation[0].value)
              : null;

          onFilterChange(operationKey, nextOperation);

          const operatorCleared = nextOperation.length === 0;
          const switchedToSingleOperator =
            isReportSingleValueFilterOperation(nextOperationCode) &&
            Boolean(prevOperationCode) &&
            !isReportSingleValueFilterOperation(prevOperationCode);

          if ((operatorCleared || switchedToSingleOperator) && primaryField) {
            if (refEntity) {
              onNestedFilterChange(primaryField.fieldName, { values: [] });
            } else if (primaryField.filterable) {
              onFilterChange(primaryField.fieldName, []);
            }
          }
        }}
      />
    ) : null;

  const filterFunctionBlock =
    primaryField && showFunctionField ? (
      <ReportSearchMultipleSelect
        multiple={false}
        compact={selectCompact}
        name={functionKey}
        label={
          isModalVariant ? (
            <Box component="span" sx={{ display: 'inline-flex', alignItems: 'baseline', gap: 0.5 }}>
              {t('reports.filterFunctionLabel')}
              <Box
                component="span"
                sx={{
                  fontSize: '0.75rem',
                  fontWeight: 400,
                  color: 'text.secondary',
                  letterSpacing: 0,
                }}>
                {t('reports.filterFunctionOptionalBadge')}
              </Box>
            </Box>
          ) : (
            t('reports.filterFunctionLabel')
          )
        }
        values={functionOptions}
        value={row.filterSelections[functionKey] ?? []}
        serverFilter={false}
        isLoading={Boolean(refEntity && tableFieldsMetadataLoading)}
        sx={selectSx}
        slotProps={reportFilterAutocompleteSlotProps}
        setValueStore={(_, value) =>
          onFilterChange(functionKey, toValuesFromSingleSelect(value))
        }
      />
    ) : null;

  const filterFunctionField =
    filterFunctionBlock && isModalVariant ? (
      <Tooltip title={t('reports.filterFunctionOptionalHint')} placement="top">
        <Box className={composeStyles.optionalFilterControl}>{filterFunctionBlock}</Box>
      </Tooltip>
    ) : (
      filterFunctionBlock
    );

  const nestedEntityFilterControl = primaryField && refEntity ? (
    <ReportNestedEntityFilterControl
      compact={selectCompact}
      field={primaryField}
      referenceEntity={refEntity}
      tableFieldsMetadata={tableFieldsMetadata}
      tableFieldsMetadataLoading={tableFieldsMetadataLoading}
      referenceEntityMetadataByName={referenceEntityMetadataByName}
      referenceEntityMetadataLoadingByName={referenceEntityMetadataLoadingByName}
      vehicleLabelMaps={vehicleLabelMaps}
      state={
        row.nestedEntityFilterByField[primaryField.fieldName] ?? {
          path: [],
          values: [],
        }
      }
      onChange={(patch) => onNestedFilterChange(primaryField.fieldName, patch)}
      filterOperationCode={filterOperationCode}
      operationSlot={showOperatorField ? filterOperationBlock : null}
    />
  ) : null;

  const scalarValueFilterControl =
    primaryField && !refEntity && primaryField.filterable ? (
      rootCompositeKind ? (
        <ReportCompositeEntityValueControl
          kind={rootCompositeKind}
          fieldKey={primaryField.fieldName}
          values={row.filterSelections[primaryField.fieldName] ?? []}
          filterOperationCode={filterOperationCode}
          compact={selectCompact}
          vehicleLabelMaps={vehicleLabelMaps}
          onChange={(values) => onFilterChange(primaryField.fieldName, values)}
        />
      ) : (
        <ReportFieldFilterControl
          compact={selectCompact}
          field={primaryField}
          metadata={metadata}
          value={row.filterSelections[primaryField.fieldName] ?? []}
          filterOperationCode={filterOperationCode}
          onChange={(values) => onFilterChange(primaryField.fieldName, values)}
          vehicleLabelMaps={vehicleLabelMaps}
        />
      )
    ) : null;

  const valueFilterBlock = primaryField ? (
    <>
      {nestedEntityFilterControl}
      {!refEntity ? (
        <>
          {filterOperationBlock}
          {scalarValueFilterControl}
        </>
      ) : null}
    </>
  ) : null;

  const modalFilterControlsBlock = primaryField ? (
    refEntity ? (
      nestedEntityFilterControl
    ) : (
      <>
        {filterOperationBlock}
        {scalarValueFilterControl}
      </>
    )
  ) : null;

  const rowClassName = [
    pageStyles.reportFilterOutputRowInner,
    isModalVariant ? composeStyles.modalFilterRow : '',
  ]
    .filter(Boolean)
    .join(' ');

  const outputFieldControl = (
    <ReportSearchMultipleSelect
      multiple={false}
      compact={selectCompact}
      name={`selectedField_${row.id}`}
      label={t('reports.outputFieldsLabel')}
      values={outputFieldOptions}
      value={selectedOutputSingle}
      serverFilter={false}
      sx={selectSx}
      slotProps={reportFilterAutocompleteSlotProps}
      setValueStore={(_, value) => onOutputFieldChange(toValuesFromSingleSelect(value))}
    />
  );

  return (
    <div className={rowClassName}>
      {isModalVariant ? (
        <Box className={composeStyles.modalFilterOutputField}>{outputFieldControl}</Box>
      ) : (
        outputFieldControl
      )}

      {isModalVariant ? (
        modalFilterControlsBlock
      ) : (
        <>
          {valueFilterBlock}
          {filterFunctionBlock}
        </>
      )}

      {isPrimaryRow &&
      primaryField &&
      (isModalVariant ? true : outputControlsReady) &&
      groupControls.length > 0
        ? groupControls.map((control) => {
            const staticOptions = getStaticOptionsForControl(control.id, metadata);
            return (
              <ReportSearchMultipleSelect
                key={control.id}
                multiple
                compact={selectCompact}
                name={control.id}
                label={control.label}
                values={staticOptions}
                value={row.filterSelections[control.id] ?? []}
                serverFilter={false}
                sx={selectSx}
                slotProps={reportFilterAutocompleteSlotProps}
                setValueStore={(_, value) => onFilterChange(control.id, value as Values)}
              />
            );
          })
        : null}

      {isModalVariant ? filterFunctionField : null}

      {canShowAddButton || (!isModalVariant && onRemoveRow != null) ? (
        <div className={pageStyles.reportFilterRowActions}>
          {canShowAddButton ? (
            <Tooltip title={t('reports.addOutputRow')}>
              <IconButton
                type="button"
                aria-label={t('reports.addOutputRow')}
                onClick={onRequestAddRow}
                className={pageStyles.reportFilterCircleBtn}
                sx={addCircleSx}>
                <AddIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          ) : null}
          {onRemoveRow ? (
            <Tooltip title={t('reports.removeOutputRow')}>
              <IconButton
                type="button"
                aria-label={t('reports.removeOutputRow')}
                onClick={onRemoveRow}
                className={pageStyles.reportFilterCircleBtn}
                sx={addCircleSx}>
                <CloseIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
