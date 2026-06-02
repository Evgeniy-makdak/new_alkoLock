import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import {
  formatReportTimeInput,
  isCompleteReportTime,
} from '@pages/reports/lib/formatReportTimeInput';
import { getReportFieldFilterValueOptions } from '@pages/reports/lib/extractMetadataFilterOptions';
import { getStaticOptionsForControl } from '@pages/reports/lib/extractMetadataFilterOptions';
import {
  buildReportAttributeValueOptions,
  resolveReportMetadataValueLoadKind,
} from '@pages/reports/lib/reportMetadataFilterOptions';
import { resolveNestedEntityValueLoadKind } from '@pages/reports/lib/reportNestedEntityValueOptions';
import {
  isReportBooleanField,
  isReportCoordinateField,
  isReportDateTimeField,
  isReportTimeOnlyField,
  isReportYearOnlyField,
} from '@pages/reports/lib/reportFieldFilterKind';
import { fetchReportNestedEntityValueOptions } from '@pages/reports/lib/fetchReportNestedEntityValueOptions';
import { toValuesFromSingleSelect } from '@pages/reports/lib/reportFilterSingleSelectValue';
import {
  reportFilterAutocompleteSlotProps,
  reportFilterControlSx,
  reportFilterModalControlSx,
} from '@pages/reports/lib/reportFilterControlSx';
import type { ReportEntityMetadata, ReportFieldDefinition } from '@pages/reports/types/reportApiTypes';
import type { Value, Values } from '@shared/ui/search_multiple_select';
import type { ReportVehicleLabelMaps } from '@pages/reports/lib/fetchVehicleFrontDataMaps';

import { ReportSearchMultipleSelect } from './ReportSearchMultipleSelect';

import { ReportCoordinateFilterField } from './ReportCoordinateFilterField';
import { ReportDateTimeFilterField } from './ReportDateTimeFilterField';
import { ReportTimeTextField } from './ReportTimeTextField';
import { ReportYearFilterField } from './ReportYearFilterField';

type ReportFieldFilterControlProps = {
  field: ReportFieldDefinition;
  metadata: ReportEntityMetadata;
  value: Values;
  onChange: (values: Values) => void;
  filterOperationCode?: string | null;
  compact?: boolean;
  vehicleLabelMaps?: ReportVehicleLabelMaps;
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
  onChange,
  filterOperationCode,
  compact = false,
  vehicleLabelMaps,
}: ReportFieldFilterControlProps) {
  const controlSx = compact ? reportFilterModalControlSx : reportFilterControlSx;
  const { t } = useTranslation();
  const controlId = field.fieldName;
  const label = field.label || field.fieldName;

  const valueLoadKind = useMemo(() => resolveReportMetadataValueLoadKind(field), [field]);
  const nestedValueLoadKind = useMemo(
    () => resolveNestedEntityValueLoadKind(field, metadata.entityName),
    [field, metadata.entityName],
  );

  const [searchQuery, setSearchQuery] = useState('');
  const [remoteOptions, setRemoteOptions] = useState<Values>([]);
  const [remoteLoading, setRemoteLoading] = useState(false);

  useEffect(() => {
    setSearchQuery('');
  }, [field.fieldName, metadata.entityName]);

  useEffect(() => {
    if (nestedValueLoadKind !== 'domainList') {
      setRemoteOptions([]);
      return;
    }

    let cancelled = false;
    setRemoteLoading(true);

    void fetchReportNestedEntityValueOptions(
      metadata.entityName,
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
  }, [nestedValueLoadKind, metadata.entityName, field, searchQuery, vehicleLabelMaps]);

  const metadataValueOptions = useMemo(
    () => buildReportAttributeValueOptions(field, t),
    [field, t],
  );

  const groupStaticOptions = getStaticOptionsForControl(controlId, metadata, t);
  const displayOptions = useMemo(
    () =>
      mergeOptionsWithSelected(
        groupStaticOptions.length > 0 ? groupStaticOptions : metadataValueOptions,
        value,
      ),
    [groupStaticOptions, metadataValueOptions, value],
  );

  if (isReportDateTimeField(field)) {
    return (
      <ReportDateTimeFilterField
        value={value}
        operationCode={filterOperationCode}
        onChange={onChange}
      />
    );
  }

  if (isReportYearOnlyField(field)) {
    return (
      <ReportYearFilterField label={label} value={value} onChange={onChange} />
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

  if (nestedValueLoadKind === 'domainList') {
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

  const multiple = valueLoadKind !== 'enum' || metadataValueOptions.length === 0;

  return (
    <ReportSearchMultipleSelect
      multiple={multiple}
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
