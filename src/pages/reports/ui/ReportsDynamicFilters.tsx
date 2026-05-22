import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Alert, Autocomplete, CircularProgress, TextField } from '@mui/material';

import { FilterPanel } from '@entities/filter_panel';
import { fieldDefinitionsToValues } from '@pages/reports/lib/extractMetadataFilterOptions';
import { isReportOutputRowComplete } from '@pages/reports/lib/reportOutputRow';
import { isReportReferenceEntityServerSearch } from '@pages/reports/lib/reportReferenceEntityServerSearch';
import { reportsStore } from '@pages/reports/model/reportsStore';
import { appStore } from '@shared/model/app_store/AppStore';
import type { ReportFieldDefinition, ReportLogicOperator } from '@pages/reports/types/reportApiTypes';
import type { Values } from '@shared/ui/search_multiple_select';
import {
  reportFilterAutocompleteSlotProps,
  reportFilterControlSx,
} from '@pages/reports/lib/reportFilterControlSx';

import pageStyles from './Reports.module.scss';

import { ReportAddVariantDialog } from './ReportAddVariantDialog';
import { ReportOutputFilterRow } from './ReportOutputFilterRow';

type ReportsDynamicFiltersProps = {
  layout?: 'default' | 'stacked';
  className?: string;
};

export function ReportsDynamicFilters({ layout = 'default', className }: ReportsDynamicFiltersProps) {
  const { t } = useTranslation();
  const [addVariantDialogOpen, setAddVariantDialogOpen] = useState(false);

  const entities = reportsStore((s) => s.entities);
  const entitiesLoading = reportsStore((s) => s.entitiesLoading);
  const entitiesError = reportsStore((s) => s.entitiesError);
  const selectedEntityName = reportsStore((s) => s.selectedEntityName);
  const metadata = reportsStore((s) => s.metadata);
  const metadataLoading = reportsStore((s) => s.metadataLoading);
  const metadataError = reportsStore((s) => s.metadataError);
  const filterControls = reportsStore((s) => s.filterControls);
  const outputRows = reportsStore((s) => s.outputRows);
  const referenceRecordsCache = reportsStore((s) => s.referenceRecordsCache);
  const referenceRecordsLoading = reportsStore((s) => s.referenceRecordsLoading);
  const vehicleLabelMaps = reportsStore((s) => s.vehicleLabelMaps);
  const selectedBranchId = appStore((s) => s.selectedBranchState?.id);

  const setSelectedEntityName = reportsStore((s) => s.setSelectedEntityName);
  const loadMetadataForEntity = reportsStore((s) => s.loadMetadataForEntity);
  const addOutputRow = reportsStore((s) => s.addOutputRow);
  const removeOutputRow = reportsStore((s) => s.removeOutputRow);
  const setOutputRowSelectedFields = reportsStore((s) => s.setOutputRowSelectedFields);
  const setOutputRowFilterSelection = reportsStore((s) => s.setOutputRowFilterSelection);
  const setOutputRowNestedEntityFilter = reportsStore((s) => s.setOutputRowNestedEntityFilter);
  const loadReferenceEntityRecords = reportsStore((s) => s.loadReferenceEntityRecords);
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

  const groupControls = useMemo(
    () => filterControls.filter((c) => c.id.startsWith('__group_')),
    [filterControls],
  );

  const referenceEntitiesInUse = useMemo(() => {
    const entitiesSet = new Set<string>();
    for (const row of outputRows) {
      const key = row.selectedOutputFields[0] ? String(row.selectedOutputFields[0].value) : '';
      if (!key) continue;
      const ref = fieldMap.get(key)?.referenceEntity?.trim();
      if (ref) entitiesSet.add(ref);
    }
    return Array.from(entitiesSet).sort();
  }, [outputRows, fieldMap]);

  const referenceEntitiesKey = referenceEntitiesInUse.join('|');

  useEffect(() => {
    if (!referenceEntitiesKey) return;
    for (const entity of referenceEntitiesInUse) {
      if (!isReportReferenceEntityServerSearch(entity)) {
        void loadReferenceEntityRecords(entity);
      }
    }
    if (referenceEntitiesInUse.includes('Vehicle')) {
      void loadVehicleLabelMaps();
    }
  }, [
    referenceEntitiesKey,
    referenceEntitiesInUse,
    selectedBranchId,
    loadReferenceEntityRecords,
    loadVehicleLabelMaps,
  ]);

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

  const handleConfirmAddVariant = useCallback(
    (logicOperator: ReportLogicOperator) => {
      addOutputRow(logicOperator);
    },
    [addOutputRow],
  );

  const showOutputControls = Boolean(metadata && !metadataLoading);
  const showOutputRow = Boolean(selectedEntityName && showOutputControls);

  const renderEntityAutocomplete = () => (
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
  );

  const renderOutputRow = (
    row: (typeof outputRows)[number],
    options: { isPrimaryRow: boolean; showAddButton: boolean; showRemoveButton: boolean },
  ) => (
    <ReportOutputFilterRow
      key={row.id}
      row={row}
      isPrimaryRow={options.isPrimaryRow}
      metadata={metadata!}
      outputFieldOptions={outputFieldOptions}
      fieldMap={fieldMap}
      groupControls={groupControls}
      referenceRecordsCache={referenceRecordsCache}
      referenceRecordsLoading={referenceRecordsLoading}
      vehicleLabelMaps={vehicleLabelMaps}
      showAddButton={options.showAddButton}
      onRequestAddRow={() => setAddVariantDialogOpen(true)}
      onRemoveRow={options.showRemoveButton ? () => removeOutputRow(row.id) : undefined}
      onOutputFieldChange={(values) => setOutputRowSelectedFields(row.id, values)}
      onFilterChange={(controlId, values) => setOutputRowFilterSelection(row.id, controlId, values)}
      onNestedFilterChange={(fieldName, patch) =>
        setOutputRowNestedEntityFilter(row.id, fieldName, patch)
      }
      onReferenceOptionsLoaded={handleReferenceOptionsLoaded}
    />
  );

  const useStackedLayout = layout === 'stacked';

  const rootClassName = [
    className,
    useStackedLayout ? pageStyles.filtersBarInnerStacked : pageStyles.filtersBarInner,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={rootClassName || undefined}>
      {entitiesError ? (
        <Alert severity="error" sx={{ mb: 1, width: '100%' }}>
          {entitiesError}
        </Alert>
      ) : null}

      <FilterPanel>
        {metadataError ? (
          <Alert severity="error" sx={{ width: '100%' }}>
            {metadataError}
          </Alert>
        ) : null}

        {outputRows.map((row, index) => {
          const isLastRow = index === outputRows.length - 1;
          const rowTableMetadata = reportsStore.getState().reportTableFieldsMetadataByRowId[row.id] ?? null;
          const rowComplete = isReportOutputRowComplete(row, fieldMap, rowTableMetadata, metadata);

          if (isLastRow) {
            return (
              <div key={row.id} className={pageStyles.reportFilterRowPrimary}>
                {renderEntityAutocomplete()}
                {showOutputRow
                  ? renderOutputRow(row, {
                      isPrimaryRow: true,
                      showAddButton: true,
                      showRemoveButton: rowComplete,
                    })
                  : null}
              </div>
            );
          }

          if (!showOutputRow) {
            return null;
          }

          return (
            <div key={row.id} className={pageStyles.reportFilterOutputRow}>
              <div className={pageStyles.reportFilterRowEntitySpacer} aria-hidden />
              {renderOutputRow(row, {
                isPrimaryRow: false,
                showAddButton: false,
                showRemoveButton: rowComplete,
              })}
            </div>
          );
        })}
      </FilterPanel>

      <ReportAddVariantDialog
        open={addVariantDialogOpen}
        onClose={() => setAddVariantDialogOpen(false)}
        onConfirm={handleConfirmAddVariant}
      />
    </div>
  );
}
