import { useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
import { Box, IconButton, Tooltip } from '@mui/material';
import { useTheme } from '@mui/material/styles';

import { operationsToValues } from '@pages/reports/lib/buildReportQueryRequest';
import { getStaticOptionsForControl } from '@pages/reports/lib/extractMetadataFilterOptions';
import {
  isNestedFilterPathReadyForValueInput,
  normalizeNestedFilterPath,
  resolveNestedFilterLeafEntityName,
  resolveNestedFilterLeafField,
} from '@pages/reports/lib/reportNestedFilterPath';
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
  const primaryField = primaryKey ? (fieldMap.get(primaryKey) ?? null) : null;
  const refEntity = primaryField?.referenceEntity?.trim();
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

  useEffect(() => {
    if (!refEntity || !nestedPath.length) return;
    const leafEntity = resolveNestedFilterLeafEntityName(
      refEntity,
      tableFieldsMetadata,
      nestedPath,
      referenceEntityMetadataByName,
    );
    if (leafEntity === 'Vehicle') {
      void reportsStore.getState().loadVehicleLabelMaps();
    }
  }, [refEntity, nestedPath, tableFieldsMetadata, referenceEntityMetadataByName]);

  const operationKey = reportOutputOperationKey(row.id);
  const functionKey = reportOutputFunctionKey(row.id);
  const filterOperationCode = useMemo(() => {
    const picked = row.filterSelections[operationKey]?.[0];
    return picked?.value != null && picked.value !== '' ? String(picked.value) : null;
  }, [row.filterSelections, operationKey]);

  const operationFunctionSource = useMemo(() => {
    if (!primaryField) return null;
    if (refEntity && nestedPath.length) {
      const attributeField = resolveNestedFilterLeafField(
        tableFieldsMetadata,
        nestedPath,
        referenceEntityMetadataByName,
      );
      if (attributeField) return attributeField;
      if (tableFieldsMetadataLoading || !tableFieldsMetadata) return null;
      return primaryField;
    }
    return primaryField;
  }, [
    primaryField,
    refEntity,
    nestedPath,
    tableFieldsMetadata,
    tableFieldsMetadataLoading,
    referenceEntityMetadataByName,
  ]);

  const operationOptions = useMemo(
    () => operationsToValues(operationFunctionSource?.availableOperations),
    [operationFunctionSource],
  );
  const functionOptions = useMemo(
    () => operationsToValues(operationFunctionSource?.availableFunctions),
    [operationFunctionSource],
  );

  const nestedTerminalReady = Boolean(
    refEntity &&
      isNestedFilterPathReadyForValueInput(
        tableFieldsMetadata,
        nestedPath,
        referenceEntityMetadataByName,
      ) &&
      (nestedState?.values?.length ?? 0) > 0,
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
  );
  const canShowAddButton = showAddButton && rowComplete && !isModalVariant;
  const showOperationAndFunction = isModalVariant
    ? Boolean(primaryField)
    : outputControlsReady;

  const selectSx = isModalVariant ? reportFilterModalControlSx : reportFilterControlSx;
  const selectCompact = isModalVariant;

  const filterOperationBlock =
    primaryField && showOperationAndFunction ? (
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
        setValueStore={(_, value) =>
          onFilterChange(operationKey, toValuesFromSingleSelect(value))
        }
      />
    ) : null;

  const filterFunctionBlock =
    primaryField && showOperationAndFunction ? (
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
      operationSlot={showOperationAndFunction ? filterOperationBlock : null}
    />
  ) : null;

  const scalarValueFilterControl =
    primaryField && !refEntity && primaryField.filterable ? (
      <ReportFieldFilterControl
        compact={selectCompact}
        field={primaryField}
        metadata={metadata}
        value={row.filterSelections[primaryField.fieldName] ?? []}
        filterOperationCode={filterOperationCode}
        onChange={(values) => onFilterChange(primaryField.fieldName, values)}
        vehicleLabelMaps={vehicleLabelMaps}
      />
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

  return (
    <div className={rowClassName}>
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
