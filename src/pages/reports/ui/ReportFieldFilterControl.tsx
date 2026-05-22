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
import {
  isReportDateTimeField,
  isReportTimeOnlyField,
} from '@pages/reports/lib/reportFieldFilterKind';
import {
  reportFilterAutocompleteSlotProps,
  reportFilterControlSx,
} from '@pages/reports/lib/reportFilterControlSx';
import type { ReportEntityMetadata, ReportFieldDefinition } from '@pages/reports/types/reportApiTypes';
import type { Values } from '@shared/ui/search_multiple_select';

import { ReportSearchMultipleSelect } from './ReportSearchMultipleSelect';

import { ReportDateTimeFilterField } from './ReportDateTimeFilterField';

type ReportFieldFilterControlProps = {
  field: ReportFieldDefinition;
  metadata: ReportEntityMetadata;
  value: Values;
  referenceOptionsCache: Record<string, Values>;
  onChange: (values: Values) => void;
  onReferenceOptionsLoaded: (cacheKey: string, options: Values) => void;
  filterOperationCode?: string | null;
};

export function ReportFieldFilterControl({
  field,
  metadata,
  value,
  referenceOptionsCache,
  onChange,
  onReferenceOptionsLoaded,
  filterOperationCode,
}: ReportFieldFilterControlProps) {
  const { t } = useTranslation();
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

  if (isReportTimeOnlyField(field)) {
    const timeValue = value[0]?.value != null ? String(value[0].value) : '';
    const invalid = timeValue.length > 0 && !isCompleteReportTime(timeValue);

    return (
      <TextField
        label={label}
        value={timeValue}
        placeholder={t('reports.timePlaceholder')}
        error={invalid}
        helperText={invalid ? t('reports.timeFormatError') : undefined}
        inputProps={{ maxLength: 5, inputMode: 'numeric' }}
        onChange={(e) => {
          const formatted = formatReportTimeInput(e.target.value);
          onChange(formatted ? [{ value: formatted, label: formatted }] : []);
        }}
        size="small"
        sx={reportFilterControlSx}
      />
    );
  }

  const controlId = field.fieldName;
  const staticOptions = getStaticOptionsForControl(controlId, metadata);
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
        loaded.push(...getStaticOptionsForControl(c.id, refMeta));
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
      name={controlId}
      label={label}
      values={options}
      value={value}
      serverFilter={false}
      sx={reportFilterControlSx}
      slotProps={reportFilterAutocompleteSlotProps}
      isLoading={Boolean(field.referenceEntity) && !staticOptions.length && !referenceOptionsCache[cacheKey]}
      onOpen={() => {
        void loadReferenceOptions();
      }}
      setValueStore={(_, next) => onChange(next as Values)}
    />
  );
}
