import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { TextField } from '@mui/material';

import { fetchReportEntityMetadata } from '@pages/reports/api/reportsApi';
import {
  buildFilterControls,
  fieldDefinitionsToValues,
  getStaticOptionsForControl,
} from '@pages/reports/lib/extractMetadataFilterOptions';
import {
  formatReportTimeInput,
  isCompleteReportTime,
} from '@pages/reports/lib/formatReportTimeInput';
import { getReportFieldFilterValueOptions } from '@pages/reports/lib/extractMetadataFilterOptions';
import { fetchReportNestedEntityValueOptions } from '@pages/reports/lib/fetchReportNestedEntityValueOptions';
import { buildNestedEntityAttributeOptions } from '@pages/reports/lib/buildNestedEntityAttributeOptions';
import type { ReportVehicleLabelMaps } from '@pages/reports/lib/fetchVehicleFrontDataMaps';
import {
  isReportBooleanField,
  isReportCoordinateField,
  isReportDateTimeField,
  isReportTimeOnlyField,
} from '@pages/reports/lib/reportFieldFilterKind';
import { resolveNestedEntityValueLoadKind } from '@pages/reports/lib/reportNestedEntityValueOptions';
import {
  resolveReportRootFieldValueSearchEntity,
  shouldUseReportRootFieldServerSearch,
} from '@pages/reports/lib/reportRootEntityServerSearch';
import { toValuesFromSingleSelect } from '@pages/reports/lib/reportFilterSingleSelectValue';
import {
  reportFilterAutocompleteSlotProps,
  reportFilterControlSx,
  reportFilterModalControlSx,
} from '@pages/reports/lib/reportFilterControlSx';
import type { ReportEntityMetadata, ReportFieldDefinition } from '@pages/reports/types/reportApiTypes';
import type { Value, Values } from '@shared/ui/search_multiple_select';

import { ReportSearchMultipleSelect } from './ReportSearchMultipleSelect';

import { ReportCoordinateFilterField } from './ReportCoordinateFilterField';
import { ReportDateTimeFilterField } from './ReportDateTimeFilterField';
import { ReportTimeTextField } from './ReportTimeTextField';

type ReportFieldFilterControlProps = {
  field: ReportFieldDefinition;
  metadata: ReportEntityMetadata;
  value: Values;
  referenceOptionsCache: Record<string, Values>;
  vehicleLabelMaps?: ReportVehicleLabelMaps;
  onChange: (values: Values) => void;
  onReferenceOptionsLoaded: (cacheKey: string, options: Values) => void;
  filterOperationCode?: string | null;
  compact?: boolean;
};

function mergeOptionsWithSelected(options: Values, selected: Values): Values {
  const byVal = new Map<string, Value>();
  for (const opt of options) {
    byVal.set(String(opt.value), opt);
  }
  for (const sel of selected) {
    const key = String(sel.value);
    if (!byVal.has(key)) {
      byVal.set(key, sel);
    }
  }
  return Array.from(byVal.values());
}

export function ReportFieldFilterControl({
  field,
  metadata,
  value,
  referenceOptionsCache,
  vehicleLabelMaps,
  onChange,
  onReferenceOptionsLoaded,
  filterOperationCode,
  compact = false,
}: ReportFieldFilterControlProps) {
  const controlSx = compact ? reportFilterModalControlSx : reportFilterControlSx;
  const { t } = useTranslation();
  const controlId = field.fieldName;
  const label = field.label || field.fieldName;

  const valueSearchEntity = useMemo(
    () => resolveReportRootFieldValueSearchEntity(metadata.entityName, field),
    [metadata.entityName, field],
  );
  const useRootServerSearch = shouldUseReportRootFieldServerSearch(metadata.entityName, field);
  const valueLoadKind = useMemo(
    () =>
      valueSearchEntity
        ? resolveNestedEntityValueLoadKind(field, valueSearchEntity, field.fieldName)
        : null,
    [valueSearchEntity, field],
  );

  const [searchQuery, setSearchQuery] = useState('');
  const [remoteOptions, setRemoteOptions] = useState<Values>([]);
  const [remoteLoading, setRemoteLoading] = useState(false);

  useEffect(() => {
    setSearchQuery('');
  }, [field.fieldName, metadata.entityName]);

  useEffect(() => {
    if (!useRootServerSearch || !valueSearchEntity || valueLoadKind !== 'serverSearch') {
      setRemoteOptions([]);
      return;
    }

    let cancelled = false;
    setRemoteLoading(true);

    void fetchReportNestedEntityValueOptions(
      valueSearchEntity,
      field,
      searchQuery,
      vehicleLabelMaps,
    )
      .then((opts) => {
        if (!cancelled) setRemoteOptions(opts);
      })
      .catch(() => {
        if (!cancelled) setRemoteOptions([]);
      })
      .finally(() => {
        if (!cancelled) setRemoteLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [useRootServerSearch, valueSearchEntity, valueLoadKind, field, searchQuery, vehicleLabelMaps]);

  const frontDataOptions = useMemo(() => {
    if (!valueSearchEntity || valueLoadKind !== 'frontDataEnum') return [];
    return buildNestedEntityAttributeOptions([], valueSearchEntity, field.fieldName, vehicleLabelMaps);
  }, [valueSearchEntity, valueLoadKind, field.fieldName, vehicleLabelMaps]);

  if (isReportDateTimeField(field)) {
    return (
      <ReportDateTimeFilterField
        value={value}
        operationCode={filterOperationCode}
        onChange={onChange}
      />
    );
  }

  if (isReportBooleanField(field)) {
    const boolOptions = getReportFieldFilterValueOptions(field, t);
    const selectedSingle = value.slice(0, 1);

    return (
      <ReportSearchMultipleSelect
        multiple={false}
        compact={compact}
        name={controlId}
        label={label}
        values={boolOptions}
        value={selectedSingle}
        serverFilter={false}
        sx={controlSx}
        slotProps={reportFilterAutocompleteSlotProps}
        setValueStore={(_, next) => onChange(toValuesFromSingleSelect(next))}
      />
    );
  }

  if (isReportCoordinateField(field)) {
    return (
      <ReportCoordinateFilterField
        label={label}
        value={value}
        onChange={onChange}
        sx={controlSx}
      />
    );
  }

  if (isReportTimeOnlyField(field)) {
    const timeValue = value[0]?.value != null ? String(value[0].value) : '';
    const invalid = timeValue.length > 0 && !isCompleteReportTime(timeValue);

    return (
      <ReportTimeTextField
        label={label}
        value={timeValue}
        placeholder={t('reports.timePlaceholder')}
        invalid={invalid}
        errorMessage={t('reports.timeFormatError')}
        sx={controlSx}
        onChange={(raw) => {
          const formatted = formatReportTimeInput(raw);
          onChange(formatted ? [{ value: formatted, label: formatted }] : []);
        }}
      />
    );
  }

  if (useRootServerSearch && valueLoadKind === 'frontDataEnum') {
    const displayOptions = mergeOptionsWithSelected(frontDataOptions, value);
    return (
      <ReportSearchMultipleSelect
        multiple
        compact={compact}
        name={controlId}
        label={label}
        values={displayOptions}
        value={value}
        serverFilter={false}
        sx={controlSx}
        slotProps={reportFilterAutocompleteSlotProps}
        setValueStore={(_, next) => onChange(next as Values)}
      />
    );
  }

  if (useRootServerSearch && valueLoadKind === 'serverSearch') {
    const displayOptions = mergeOptionsWithSelected(remoteOptions, value);
    return (
      <ReportSearchMultipleSelect
        multiple
        compact={compact}
        name={controlId}
        label={label}
        values={displayOptions}
        value={value}
        serverFilter
        isLoading={remoteLoading}
        sx={controlSx}
        slotProps={reportFilterAutocompleteSlotProps}
        onInputChange={setSearchQuery}
        setValueStore={(_, next) => onChange(next as Values)}
      />
    );
  }

  const staticOptions = getStaticOptionsForControl(controlId, metadata, t);
  const cacheKey = field.referenceEntity ? `ref:${field.referenceEntity}` : controlId;
  const options =
    staticOptions.length > 0 ? staticOptions : (referenceOptionsCache[cacheKey] ?? []);

  const loadReferenceOptions = async () => {
    if (!field.referenceEntity || staticOptions.length > 0) return;
    if (referenceOptionsCache[cacheKey]?.length) return;
    try {
      const refMeta = await fetchReportEntityMetadata(field.referenceEntity);
      const refControls = buildFilterControls(refMeta);
      const loaded: Values = [];
      for (const c of refControls) {
        loaded.push(...getStaticOptionsForControl(c.id, refMeta, t));
      }
      if (!loaded.length && refMeta.fields?.length) {
        loaded.push(...fieldDefinitionsToValues(refMeta.fields));
      }
      onReferenceOptionsLoaded(cacheKey, loaded);
    } catch {
      onReferenceOptionsLoaded(cacheKey, []);
    }
  };

  return (
    <ReportSearchMultipleSelect
      multiple
      compact={compact}
      name={controlId}
      label={label}
      values={options}
      value={value}
      serverFilter={false}
      sx={controlSx}
      slotProps={reportFilterAutocompleteSlotProps}
      isLoading={Boolean(field.referenceEntity) && !staticOptions.length && !referenceOptionsCache[cacheKey]}
      onOpen={() => {
        void loadReferenceOptions();
      }}
      setValueStore={(_, next) => onChange(next as Values)}
    />
  );
}
