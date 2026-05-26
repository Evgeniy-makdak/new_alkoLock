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
import {
  isReportBooleanField,
  isReportCoordinateField,
  isReportDateTimeField,
  isReportTimeOnlyField,
} from '@pages/reports/lib/reportFieldFilterKind';
import { toValuesFromSingleSelect } from '@pages/reports/lib/reportFilterSingleSelectValue';
import {
  reportFilterAutocompleteSlotProps,
  reportFilterControlSx,
  reportFilterModalControlSx,
} from '@pages/reports/lib/reportFilterControlSx';
import type { ReportEntityMetadata, ReportFieldDefinition } from '@pages/reports/types/reportApiTypes';
import type { Values } from '@shared/ui/search_multiple_select';

import { ReportSearchMultipleSelect } from './ReportSearchMultipleSelect';

import { ReportCoordinateFilterField } from './ReportCoordinateFilterField';
import { ReportDateTimeFilterField } from './ReportDateTimeFilterField';
import { ReportTimeTextField } from './ReportTimeTextField';

type ReportFieldFilterControlProps = {
  field: ReportFieldDefinition;
  metadata: ReportEntityMetadata;
  value: Values;
  referenceOptionsCache: Record<string, Values>;
  onChange: (values: Values) => void;
  onReferenceOptionsLoaded: (cacheKey: string, options: Values) => void;
  filterOperationCode?: string | null;
  compact?: boolean;
};

export function ReportFieldFilterControl({
  field,
  metadata,
  value,
  referenceOptionsCache,
  onChange,
  onReferenceOptionsLoaded,
  filterOperationCode,
  compact = false,
}: ReportFieldFilterControlProps) {
  const controlSx = compact ? reportFilterModalControlSx : reportFilterControlSx;
  const { t } = useTranslation();
  const controlId = field.fieldName;
  const label = field.label || field.fieldName;

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
