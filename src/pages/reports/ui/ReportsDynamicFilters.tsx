import { useCallback, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { Alert, Autocomplete, CircularProgress, TextField } from '@mui/material';

import { FilterPanel } from '@entities/filter_panel';
import {
  fieldDefinitionsToValues,
  getStaticOptionsForControl,
} from '@pages/reports/lib/extractMetadataFilterOptions';
import {
  REPORT_OUTPUT_FUNCTION_KEY,
  REPORT_OUTPUT_OPERATION_KEY,
} from '@pages/reports/lib/reportOutputFilterKeys';
import {
  reportFilterAutocompleteSlotProps,
  reportFilterControlSx,
} from '@pages/reports/lib/reportFilterControlSx';
import { operationsToValues } from '@pages/reports/lib/buildReportQueryRequest';
import { toValuesFromSingleSelect } from '@pages/reports/lib/reportFilterSingleSelectValue';
import { reportsStore } from '@pages/reports/model/reportsStore';
import { appStore } from '@shared/model/app_store/AppStore';
import type { ReportFieldDefinition } from '@pages/reports/types/reportApiTypes';
import type { Values } from '@shared/ui/search_multiple_select';

import { ReportSearchMultipleSelect } from './ReportSearchMultipleSelect';

import pageStyles from './Reports.module.scss';

import { ReportFieldFilterControl } from './ReportFieldFilterControl';
import { ReportNestedEntityFilterControl } from './ReportNestedEntityFilterControl';

type ReportsDynamicFiltersProps = {
  layout?: 'default' | 'stacked';
  className?: string;
};

export function ReportsDynamicFilters({ layout = 'default', className }: ReportsDynamicFiltersProps) {
  const { t } = useTranslation();

  const entities = reportsStore((s) => s.entities);
  const entitiesLoading = reportsStore((s) => s.entitiesLoading);
  const entitiesError = reportsStore((s) => s.entitiesError);
  const selectedEntityName = reportsStore((s) => s.selectedEntityName);
  const metadata = reportsStore((s) => s.metadata);
  const metadataLoading = reportsStore((s) => s.metadataLoading);
  const metadataError = reportsStore((s) => s.metadataError);
  const filterControls = reportsStore((s) => s.filterControls);
  const selectedOutputFields = reportsStore((s) => s.selectedOutputFields);
  const filterSelections = reportsStore((s) => s.filterSelections);
  const referenceRecordsCache = reportsStore((s) => s.referenceRecordsCache);
  const referenceRecordsLoading = reportsStore((s) => s.referenceRecordsLoading);
  const nestedEntityFilterByField = reportsStore((s) => s.nestedEntityFilterByField);
  const vehicleLabelMaps = reportsStore((s) => s.vehicleLabelMaps);
  const selectedBranchId = appStore((s) => s.selectedBranchState?.id);

  const setSelectedEntityName = reportsStore((s) => s.setSelectedEntityName);
  const loadMetadataForEntity = reportsStore((s) => s.loadMetadataForEntity);
  const setSelectedOutputFields = reportsStore((s) => s.setSelectedOutputFields);
  const setFilterSelection = reportsStore((s) => s.setFilterSelection);
  const loadReferenceEntityRecords = reportsStore((s) => s.loadReferenceEntityRecords);
  const setNestedEntityFilter = reportsStore((s) => s.setNestedEntityFilter);
  const loadVehicleLabelMaps = reportsStore((s) => s.loadVehicleLabelMaps);

  const selectedEntity = useMemo(
    () => entities.find((e) => e.entityName === selectedEntityName) ?? null,
    [entities, selectedEntityName],
  );

  const outputFieldOptions = useMemo(
    () => (metadata ? fieldDefinitionsToValues(metadata.fields ?? []) : []),
    [metadata],
  );

  const fieldMap = useMemo(() => {
    const map = new Map<string, ReportFieldDefinition>();
    for (const field of metadata?.fields ?? []) {
      map.set(field.fieldName, field);
    }
    return map;
  }, [metadata]);

  const primaryField = useMemo((): ReportFieldDefinition | null => {
    const key = selectedOutputFields[0] ? String(selectedOutputFields[0].value) : '';
    if (!key) return null;
    return fieldMap.get(key) ?? null;
  }, [selectedOutputFields, fieldMap]);

  const groupControls = useMemo(
    () => filterControls.filter((c) => c.id.startsWith('__group_')),
    [filterControls],
  );

  const refEntity = primaryField?.referenceEntity?.trim();

  useEffect(() => {
    if (!refEntity) return;
    void loadReferenceEntityRecords(refEntity);
    if (refEntity === 'Vehicle') {
      void loadVehicleLabelMaps();
    }
  }, [refEntity, selectedBranchId, loadReferenceEntityRecords, loadVehicleLabelMaps]);

  const handleEntityOpen = () => {
    if (!selectedEntityName) return;
    void loadMetadataForEntity(selectedEntityName);
  };

  const handleReferenceOptionsLoaded = useCallback(
    (cacheKey: string, options: Values) => {
      void cacheKey;
      void options;
    },
    [],
  );

  const useStackedLayout = layout === 'stacked';

  const rootClassName = [
    className,
    useStackedLayout ? pageStyles.filtersBarInnerStacked : pageStyles.filtersBarInner,
  ]
    .filter(Boolean)
    .join(' ');

  const operationOptions = useMemo(
    () => operationsToValues(primaryField?.availableOperations),
    [primaryField],
  );
  const functionOptions = useMemo(
    () => operationsToValues(primaryField?.availableFunctions),
    [primaryField],
  );

  const selectedOutputSingle = selectedOutputFields.slice(0, 1);
  const refRecords = refEntity ? (referenceRecordsCache[refEntity] ?? []) : [];

  const nestedState = primaryField ? nestedEntityFilterByField[primaryField.fieldName] : undefined;

  const nestedTerminalReady = Boolean(
    refEntity && nestedState?.attribute && (nestedState.values?.length ?? 0) > 0,
  );

  const scalarTerminalReady = Boolean(
    primaryField &&
      !refEntity &&
      primaryField.filterable &&
      (filterSelections[primaryField.fieldName]?.length ?? 0) > 0,
  );

  const outputControlsReady = Boolean(
    primaryField && (nestedTerminalReady || scalarTerminalReady || (!refEntity && !primaryField.filterable)),
  );

  return (
    <div className={rootClassName || undefined}>
      {entitiesError ? (
        <Alert severity="error" sx={{ mb: 1, width: '100%' }}>
          {entitiesError}
        </Alert>
      ) : null}

      <FilterPanel>
        <Autocomplete
          sx={reportFilterControlSx}
          slotProps={reportFilterAutocompleteSlotProps}
          options={entities}
          loading={entitiesLoading}
          value={selectedEntity}
          getOptionLabel={(o) => o.label || o.entityName}
          isOptionEqualToValue={(a, b) => a.entityName === b.entityName}
          onChange={(_, value) => {
            setSelectedEntityName(value?.entityName ?? null);
            if (value?.entityName) {
              void loadMetadataForEntity(value.entityName);
            }
          }}
          onOpen={handleEntityOpen}
          renderInput={(params) => (
            <TextField
              {...params}
              label={t('reports.entityLabel')}
              placeholder={t('reports.entityPlaceholder')}
              InputProps={{
                ...params.InputProps,
                endAdornment: (
                  <>
                    {entitiesLoading || metadataLoading ? (
                      <CircularProgress color="inherit" size={18} />
                    ) : null}
                    {params.InputProps.endAdornment}
                  </>
                ),
              }}
            />
          )}
        />

        {metadataError ? (
          <Alert severity="error" sx={{ width: '100%' }}>
            {metadataError}
          </Alert>
        ) : null}

        {metadata && !metadataLoading ? (
          <>
            <ReportSearchMultipleSelect
              multiple={false}
              name="selectedField"
              label={t('reports.outputFieldsLabel')}
              values={outputFieldOptions}
              value={selectedOutputSingle}
              serverFilter={false}
              sx={reportFilterControlSx}
              slotProps={reportFilterAutocompleteSlotProps}
              setValueStore={(_, value) => setSelectedOutputFields(toValuesFromSingleSelect(value))}
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
                      nestedEntityFilterByField[primaryField.fieldName] ?? {
                        attribute: null,
                        values: [],
                      }
                    }
                    onChange={(patch) => setNestedEntityFilter(primaryField.fieldName, patch)}
                  />
                ) : primaryField.filterable ? (
                  <ReportFieldFilterControl
                    field={primaryField}
                    metadata={metadata}
                    value={filterSelections[primaryField.fieldName] ?? []}
                    referenceOptionsCache={{}}
                    onChange={(values) => setFilterSelection(primaryField.fieldName, values)}
                    onReferenceOptionsLoaded={handleReferenceOptionsLoaded}
                  />
                ) : null}

                {outputControlsReady ? (
                  <>
                    <ReportSearchMultipleSelect
                      multiple={false}
                      name={REPORT_OUTPUT_OPERATION_KEY}
                      label={t('reports.filterOperationLabel')}
                      values={operationOptions}
                      value={filterSelections[REPORT_OUTPUT_OPERATION_KEY] ?? []}
                      serverFilter={false}
                      sx={reportFilterControlSx}
                      slotProps={reportFilterAutocompleteSlotProps}
                      setValueStore={(_, value) =>
                        setFilterSelection(REPORT_OUTPUT_OPERATION_KEY, toValuesFromSingleSelect(value))
                      }
                    />
                    <ReportSearchMultipleSelect
                      multiple={false}
                      name={REPORT_OUTPUT_FUNCTION_KEY}
                      label={t('reports.filterFunctionLabel')}
                      values={functionOptions}
                      value={filterSelections[REPORT_OUTPUT_FUNCTION_KEY] ?? []}
                      serverFilter={false}
                      sx={reportFilterControlSx}
                      slotProps={reportFilterAutocompleteSlotProps}
                      setValueStore={(_, value) =>
                        setFilterSelection(REPORT_OUTPUT_FUNCTION_KEY, toValuesFromSingleSelect(value))
                      }
                    />
                  </>
                ) : null}
              </>
            ) : null}

            {primaryField && groupControls.length > 0
              ? groupControls.map((control) => {
                  const staticOptions = getStaticOptionsForControl(control.id, metadata);
                  return (
                    <ReportSearchMultipleSelect
                      key={control.id}
                      multiple
                      name={control.id}
                      label={control.label}
                      values={staticOptions}
                      value={filterSelections[control.id] ?? []}
                      serverFilter={false}
                      sx={reportFilterControlSx}
                      slotProps={reportFilterAutocompleteSlotProps}
                      setValueStore={(_, value) => setFilterSelection(control.id, value as Values)}
                    />
                  );
                })
              : null}
          </>
        ) : null}
      </FilterPanel>
    </div>
  );
}
