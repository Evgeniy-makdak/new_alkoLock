import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import CloseIcon from '@mui/icons-material/Close';
import FilterAltOutlinedIcon from '@mui/icons-material/FilterAltOutlined';
import {
  Alert,
  Autocomplete,
  Checkbox,
  CircularProgress,
  FormControl,
  FormControlLabel,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';

import { fieldDefinitionsToValues } from '@pages/reports/lib/extractMetadataFilterOptions';
import {
  reportFilterAutocompleteSlotProps,
  reportFilterControlSx,
} from '@pages/reports/lib/reportFilterControlSx';
import { isReportReferenceEntityServerSearch } from '@pages/reports/lib/reportReferenceEntityServerSearch';
import { reportsStore } from '@pages/reports/model/reportsStore';
import type {
  ReportFieldDefinition,
  ReportLogicOperator,
} from '@pages/reports/types/reportApiTypes';
import { getToolbarCircleIconButtonSx } from '@shared/lib/toolbarCircleAddButtonSx';
import { appStore } from '@shared/model/app_store/AppStore';
import { OverflowTooltip } from '@shared/ui/overflow_tooltip/OverflowTooltip';
import type { Values } from '@shared/ui/search_multiple_select';

import { ReportAddVariantDialog } from './ReportAddVariantDialog';
import composeStyles from './ReportComposeModal.module.scss';
import { ReportComposeSection } from './ReportComposeSection';
import { ReportOutputFilterRow } from './ReportOutputFilterRow';
import pageStyles from './Reports.module.scss';

export type ReportExportFormat = 'CSV' | 'XLS' | 'PDF';

export type ReportComposeFormProps = {
  reportName: string;
  onReportNameChange: (name: string) => void;
  exportEnabled?: boolean;
  exportFormat?: ReportExportFormat;
  onExportEnabledChange?: (enabled: boolean) => void;
  onExportFormatChange?: (format: ReportExportFormat) => void;
};

export function ReportComposeForm({
  reportName,
  onReportNameChange,
  exportEnabled = false,
  exportFormat = 'CSV',
  onExportEnabledChange,
  onExportFormatChange,
}: ReportComposeFormProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const circleIconSx = getToolbarCircleIconButtonSx(theme);
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
  const logicOperator = reportsStore((s) => s.logicOperator);
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

  const handleReferenceOptionsLoaded = useCallback((cacheKey: string, options: Values) => {
    void cacheKey;
    void options;
  }, []);

  const handleConfirmAddVariant = useCallback(
    (nextLogicOperator: ReportLogicOperator) => {
      addOutputRow(nextLogicOperator);
    },
    [addOutputRow],
  );

  const showOutputControls = Boolean(metadata && !metadataLoading);
  const showOutputRow = Boolean(selectedEntityName && showOutputControls);

  const logicHintKey =
    logicOperator === 'and' ? 'reports.composeLogicAndHint' : 'reports.composeLogicOrHint';

  const renderEntityAutocomplete = () => {
    const entityTitle = selectedEntity?.label || selectedEntity?.entityName || '';

    return (
      <OverflowTooltip title={entityTitle}>
        <Autocomplete
          sx={{ ...reportFilterControlSx, width: '100%', maxWidth: '100%' }}
          slotProps={reportFilterAutocompleteSlotProps}
          options={entities}
          loading={entitiesLoading}
          size="small"
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
              size="small"
              label={t('reports.entityLabel')}
              placeholder={t('reports.entityPlaceholder')}
              inputProps={{
                ...params.inputProps,
                style: {
                  ...(params.inputProps?.style as React.CSSProperties | undefined),
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                },
              }}
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
      </OverflowTooltip>
    );
  };

  const renderOutputRow = (
    row: (typeof outputRows)[number],
    options: { isPrimaryRow: boolean },
  ) => (
    <ReportOutputFilterRow
      key={row.id}
      row={row}
      variant="modal"
      isPrimaryRow={options.isPrimaryRow}
      metadata={metadata!}
      outputFieldOptions={outputFieldOptions}
      fieldMap={fieldMap}
      groupControls={groupControls}
      referenceRecordsCache={referenceRecordsCache}
      referenceRecordsLoading={referenceRecordsLoading}
      vehicleLabelMaps={vehicleLabelMaps}
      showAddButton={false}
      onRequestAddRow={() => setAddVariantDialogOpen(true)}
      onOutputFieldChange={(values) => setOutputRowSelectedFields(row.id, values)}
      onFilterChange={(controlId, values) => setOutputRowFilterSelection(row.id, controlId, values)}
      onNestedFilterChange={(fieldName, patch) =>
        setOutputRowNestedEntityFilter(row.id, fieldName, patch)
      }
      onReferenceOptionsLoaded={handleReferenceOptionsLoaded}
    />
  );

  return (
    <>
      {entitiesError ? (
        <Alert severity="error" sx={{ width: '100%', gridColumn: '1 / -1' }}>
          {entitiesError}
        </Alert>
      ) : null}

      <div className={composeStyles.composeTopSlot}>
        <div className={composeStyles.composeTopRow}>
          <TextField
            className={composeStyles.composeNameField}
            size="small"
            label={t('reports.composeReportNameLabel')}
            placeholder={t('reports.composeReportNamePlaceholder')}
            value={reportName}
            onChange={(e) => onReportNameChange(e.target.value)}
          />
          {reportName.trim() && onExportEnabledChange ? (
            <div className={composeStyles.composeExportControls}>
              <FormControlLabel
                control={
                  <Checkbox
                    size="small"
                    checked={exportEnabled}
                    onChange={(_, checked) => onExportEnabledChange(checked)}
                  />
                }
                label={
                  <Typography variant="body2" sx={{ fontSize: 13 }}>
                    {t('reports.saveAsFile')}
                  </Typography>
                }
                sx={{ mr: 0 }}
              />
              {exportEnabled && onExportFormatChange ? (
                <FormControl size="small" sx={{ minWidth: 100 }}>
                  <InputLabel id="report-export-format-label">{t('reports.format')}</InputLabel>
                  <Select
                    labelId="report-export-format-label"
                    value={exportFormat}
                    label={t('reports.format')}
                    onChange={(e) => onExportFormatChange(e.target.value as ReportExportFormat)}>
                    <MenuItem value="CSV">CSV</MenuItem>
                    <MenuItem value="XLS">XLS</MenuItem>
                    <MenuItem value="PDF">PDF</MenuItem>
                  </Select>
                </FormControl>
              ) : null}
            </div>
          ) : null}
          <div className={composeStyles.composeEntityField}>{renderEntityAutocomplete()}</div>
        </div>
      </div>

      <div className={composeStyles.composeFiltersSlot}>
        {metadataError ? (
          <Alert severity="error" sx={{ width: '100%', mb: 1 }}>
            {metadataError}
          </Alert>
        ) : null}

        {showOutputRow ? (
          <ReportComposeSection
            icon={FilterAltOutlinedIcon}
            iconTone="rose"
            title={t('reports.composeSectionFilters')}
            action={
              <button
                type="button"
                className={composeStyles.addGroupLink}
                onClick={() => setAddVariantDialogOpen(true)}>
                {t('reports.composeAddFilterGroup')}
              </button>
            }>
            {outputRows.length > 1 ? (
              <p className={composeStyles.logicHint}>{t(logicHintKey)}</p>
            ) : null}

            <div className={composeStyles.filterGroups}>
              {outputRows.map((row, index) => {
                const isFirstRow = index === 0;
                const canRemoveGroup = !isFirstRow;

                return (
                  <div key={row.id} className={composeStyles.filterGroup}>
                    <div className={composeStyles.filterGroupMain}>
                      <div className={composeStyles.filterGroupHead}>
                        <span className={composeStyles.filterGroupLabel}>
                          {t('reports.composeFilterGroup', { number: index + 1 })}
                        </span>
                      </div>
                      <div className={composeStyles.filterGroupFields}>
                        {renderOutputRow(row, { isPrimaryRow: isFirstRow })}
                      </div>
                    </div>
                    {canRemoveGroup ? (
                      <Tooltip title={t('reports.composeRemoveFilter')}>
                        <IconButton
                          type="button"
                          aria-label={t('reports.composeRemoveFilter')}
                          className={`${composeStyles.filterGroupRemoveBtn} ${pageStyles.reportFilterCircleBtn}`}
                          onClick={() => removeOutputRow(row.id)}
                          sx={circleIconSx}>
                          <CloseIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </ReportComposeSection>
        ) : selectedEntityName && metadataLoading ? (
          <Typography variant="body2" color="text.secondary">
            {t('reports.composeLoadingMetadata')}
          </Typography>
        ) : null}
      </div>

      <ReportAddVariantDialog
        open={addVariantDialogOpen}
        onClose={() => setAddVariantDialogOpen(false)}
        onConfirm={handleConfirmAddVariant}
      />
    </>
  );
}
