import { useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
import { IconButton, Tooltip } from '@mui/material';
import { useTheme } from '@mui/material/styles';

import { getStaticOptionsForControl } from '@pages/reports/lib/extractMetadataFilterOptions';
import { operationsToValues } from '@pages/reports/lib/buildReportQueryRequest';
import { isReportOutputRowComplete } from '@pages/reports/lib/reportOutputRow';
import {
  reportFilterAutocompleteSlotProps,
  reportFilterControlSx,
} from '@pages/reports/lib/reportFilterControlSx';
import { toValuesFromSingleSelect } from '@pages/reports/lib/reportFilterSingleSelectValue';
import {
  reportOutputFunctionKey,
  reportOutputOperationKey,
} from '@pages/reports/lib/reportOutputFilterKeys';
import type { ReportVehicleLabelMaps } from '@pages/reports/lib/fetchVehicleFrontDataMaps';
import { reportsStore } from '@pages/reports/model/reportsStore';
import { appStore } from '@shared/model/app_store/AppStore';
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

import pageStyles from './Reports.module.scss';

type ReportOutputFilterRowProps = {
  row: ReportOutputRow;
  isPrimaryRow: boolean;
  metadata: ReportEntityMetadata;
  outputFieldOptions: Values;
  fieldMap: Map<string, ReportFieldDefinition>;
  groupControls: ReportFilterControlDef[];
  referenceRecordsCache: Record<string, unknown[]>;
  referenceRecordsLoading: boolean;
  vehicleLabelMaps: ReportVehicleLabelMaps;
  showAddButton: boolean;
  onRequestAddRow: () => void;
  onRemoveRow?: () => void;
  onOutputFieldChange: (values: Values) => void;
  onFilterChange: (controlId: string, values: Values) => void;
  onNestedFilterChange: (fieldName: string, patch: Partial<ReportNestedEntityFilterState>) => void;
  onReferenceOptionsLoaded: (cacheKey: string, options: Values) => void;
};

export function ReportOutputFilterRow({
  row,
  isPrimaryRow,
  metadata,
  outputFieldOptions,
  fieldMap,
  groupControls,
  referenceRecordsCache,
  referenceRecordsLoading,
  vehicleLabelMaps,
  showAddButton,
  onRequestAddRow,
  onRemoveRow,
  onOutputFieldChange,
  onFilterChange,
  onNestedFilterChange,
  onReferenceOptionsLoaded,
}: ReportOutputFilterRowProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const addCircleSx = getToolbarCircleIconButtonSx(theme);

  const primaryKey = row.selectedOutputFields[0] ? String(row.selectedOutputFields[0].value) : '';
  const primaryField = primaryKey ? (fieldMap.get(primaryKey) ?? null) : null;
  const refEntity = primaryField?.referenceEntity?.trim();
  const refRecords = refEntity ? (referenceRecordsCache[refEntity] ?? []) : [];
  const selectedBranchId = appStore((s) => s.selectedBranchState?.id);
  const loadReportTableFieldsMetadata = reportsStore((s) => s.loadReportTableFieldsMetadata);

  useEffect(() => {
    if (!refEntity) return;
    void reportsStore.getState().loadReferenceEntityRecords(refEntity);
    if (refEntity === 'Vehicle') {
      void reportsStore.getState().loadVehicleLabelMaps();
    }
  }, [refEntity, selectedBranchId]);

  const operationKey = reportOutputOperationKey(row.id);
  const functionKey = reportOutputFunctionKey(row.id);

  const operationOptions = useMemo(
    () => operationsToValues(primaryField?.availableOperations),
    [primaryField],
  );
  const functionOptions = useMemo(
    () => operationsToValues(primaryField?.availableFunctions),
    [primaryField],
  );

  const nestedState = primaryField ? row.nestedEntityFilterByField[primaryField.fieldName] : undefined;

  const nestedTerminalReady = Boolean(
    refEntity && nestedState?.attribute && (nestedState.values?.length ?? 0) > 0,
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

  useEffect(() => {
    if (!outputControlsReady || !refEntity) return;
    void loadReportTableFieldsMetadata(row.id, refEntity);
  }, [outputControlsReady, refEntity, row.id, loadReportTableFieldsMetadata]);

  const rowComplete = isReportOutputRowComplete(row, fieldMap, undefined, metadata);
  const canShowAddButton = showAddButton && rowComplete;

  return (
    <>
      <ReportSearchMultipleSelect
        multiple={false}
        name={`selectedField_${row.id}`}
        label={t('reports.outputFieldsLabel')}
        values={outputFieldOptions}
        value={selectedOutputSingle}
        serverFilter={false}
        sx={reportFilterControlSx}
        slotProps={reportFilterAutocompleteSlotProps}
        setValueStore={(_, value) => onOutputFieldChange(toValuesFromSingleSelect(value))}
      />

      {primaryField ? (
        <>
          {refEntity ? (
            <ReportNestedEntityFilterControl
              field={primaryField}
              referenceEntity={refEntity}
              records={refRecords}
              recordsLoading={referenceRecordsLoading}
              labelMaps={vehicleLabelMaps}
              state={
                row.nestedEntityFilterByField[primaryField.fieldName] ?? {
                  attribute: null,
                  values: [],
                }
              }
              onChange={(patch) => onNestedFilterChange(primaryField.fieldName, patch)}
            />
          ) : primaryField.filterable ? (
            <ReportFieldFilterControl
              field={primaryField}
              metadata={metadata}
              value={row.filterSelections[primaryField.fieldName] ?? []}
              referenceOptionsCache={{}}
              onChange={(values) => onFilterChange(primaryField.fieldName, values)}
              onReferenceOptionsLoaded={onReferenceOptionsLoaded}
            />
          ) : null}

          {outputControlsReady ? (
            <>
              <ReportSearchMultipleSelect
                multiple={false}
                name={operationKey}
                label={t('reports.filterOperationLabel')}
                values={operationOptions}
                value={row.filterSelections[operationKey] ?? []}
                serverFilter={false}
                sx={reportFilterControlSx}
                slotProps={reportFilterAutocompleteSlotProps}
                setValueStore={(_, value) =>
                  onFilterChange(operationKey, toValuesFromSingleSelect(value))
                }
              />
              <ReportSearchMultipleSelect
                multiple={false}
                name={functionKey}
                label={t('reports.filterFunctionLabel')}
                values={functionOptions}
                value={row.filterSelections[functionKey] ?? []}
                serverFilter={false}
                sx={reportFilterControlSx}
                slotProps={reportFilterAutocompleteSlotProps}
                setValueStore={(_, value) =>
                  onFilterChange(functionKey, toValuesFromSingleSelect(value))
                }
              />
            </>
          ) : null}
        </>
      ) : null}

      {isPrimaryRow && primaryField && outputControlsReady && groupControls.length > 0
        ? groupControls.map((control) => {
            const staticOptions = getStaticOptionsForControl(control.id, metadata);
            return (
              <ReportSearchMultipleSelect
                key={control.id}
                multiple
                name={control.id}
                label={control.label}
                values={staticOptions}
                value={row.filterSelections[control.id] ?? []}
                serverFilter={false}
                sx={reportFilterControlSx}
                slotProps={reportFilterAutocompleteSlotProps}
                setValueStore={(_, value) => onFilterChange(control.id, value as Values)}
              />
            );
          })
        : null}

      {canShowAddButton || onRemoveRow ? (
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
    </>
  );
}
