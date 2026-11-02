import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Box, Typography } from '@mui/material';

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
import {
  isReportCoordinatesCompositePath,
  isReportCoordinatesCompositePropertyFieldName,
} from '@pages/reports/lib/reportCoordinateComposite';
import { resolveNestedEntityValueLoadKind } from '@pages/reports/lib/reportNestedEntityValueOptions';
import { resolveReportDomainListEntityName } from '@pages/reports/lib/reportLeafEntityListApi';
import {
  isReportBooleanField,
  isReportCoordinateField,
  isReportDateTimeField,
  isReportTimeOnlyField,
  isReportYearOnlyField,
} from '@pages/reports/lib/reportFieldFilterKind';
import { fetchReportNestedEntityValueOptions } from '@pages/reports/lib/fetchReportNestedEntityValueOptions';
import {
  commitReportBetweenFilterSlot,
  reportBetweenSlotValues,
} from '@pages/reports/lib/reportBetweenFilterSlots';
import {
  isReportBetweenFilterOperation,
  resolveReportFilterValueMaxValues,
} from '@pages/reports/lib/mapReportQueryOperator';
import { normalizeReportFilterSelectValues } from '@pages/reports/lib/reportFilterSelectValues';
import { toValuesFromSingleSelect } from '@pages/reports/lib/reportFilterSingleSelectValue';
import {
  reportFilterAutocompleteSlotProps,
  reportFilterControlSx,
  reportFilterModalControlSx,
} from '@pages/reports/lib/reportFilterControlSx';
import type { ReportEntityMetadata, ReportFieldDefinition } from '@pages/reports/types/reportApiTypes';
import type { Value, Values } from '@shared/ui/search_multiple_select';
import { buildVehicleAttributeOptions } from '@pages/reports/lib/buildVehicleAttributeOptions';
import type { ReportVehicleLabelMaps } from '@pages/reports/lib/fetchVehicleFrontDataMaps';

import { ReportSearchMultipleSelect } from './ReportSearchMultipleSelect';

import { ReportCoordinateFilterField } from './ReportCoordinateFilterField';
import { ReportCoordinatePairFilterField } from './ReportCoordinatePairFilterField';
import { ReportDateTimeFilterField } from './ReportDateTimeFilterField';
import { ReportTimeTextField } from './ReportTimeTextField';
import { ReportYearFilterField } from './ReportYearFilterField';

import pageStyles from './Reports.module.scss';

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
  const domainListEntityName = useMemo(
    () => resolveReportDomainListEntityName(metadata.entityName) ?? metadata.entityName,
    [metadata.entityName],
  );
  const nestedValueLoadKind = useMemo(
    () => resolveNestedEntityValueLoadKind(field, domainListEntityName),
    [field, domainListEntityName],
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
      domainListEntityName,
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
  }, [nestedValueLoadKind, domainListEntityName, field, searchQuery, vehicleLabelMaps]);

  const metadataValueOptions = useMemo(
    () => buildReportAttributeValueOptions(field, t),
    [field, t],
  );

  const vehicleDictionaryOptions = useMemo(() => {
    const attr = field.fieldName;
    if (
      (attr === 'color' || attr === 'type') &&
      (metadata.entityName === 'Vehicle' || domainListEntityName === 'Vehicle')
    ) {
      return buildVehicleAttributeOptions([], attr, vehicleLabelMaps);
    }
    return [];
  }, [field.fieldName, metadata.entityName, domainListEntityName, vehicleLabelMaps]);

  const groupStaticOptions = getStaticOptionsForControl(controlId, metadata, t);
  const isCoordinatesComposite =
    isReportCoordinatesCompositePropertyFieldName(field.fieldName) ||
    isReportCoordinatesCompositePath(field.fieldName);

  const displayOptions = useMemo(() => {
    const base =
      vehicleDictionaryOptions.length > 0
        ? vehicleDictionaryOptions
        : groupStaticOptions.length > 0
          ? groupStaticOptions
          : metadataValueOptions;
    return mergeOptionsWithSelected(base, value);
  }, [vehicleDictionaryOptions, groupStaticOptions, metadataValueOptions, value]);

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
      <ReportYearFilterField
        label={label}
        value={value}
        operationCode={filterOperationCode}
        onChange={onChange}
        sx={controlSx}
        overflowTooltip={compact}
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

  // Координаты с доменным API (DeviceEvent и т.п.) — dropdown ниже; иначе ручной ввод.
  if (isCoordinatesComposite && nestedValueLoadKind !== 'domainList') {
    return (
      <ReportCoordinatePairFilterField
        label={label}
        value={value}
        onChange={onChange}
        sx={controlSx}
        overflowTooltip={compact}
      />
    );
  }

  if (isReportCoordinateField(field) && nestedValueLoadKind !== 'domainList') {
    return (
      <ReportCoordinateFilterField
        label={label}
        value={value}
        onChange={onChange}
        sx={controlSx}
        overflowTooltip={compact}
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
        overflowTooltip={compact}
        onChange={(raw) => {
          const formatted = formatReportTimeInput(raw);
          onChange(formatted ? [{ value: formatted, label: formatted }] : []);
        }}
      />
    );
  }

  if (nestedValueLoadKind === 'domainList') {
    const displayOptions = mergeOptionsWithSelected(remoteOptions, value);
    const maxValues = resolveReportFilterValueMaxValues(filterOperationCode, true);
    if (isReportBetweenFilterOperation(filterOperationCode)) {
      return (
        <Box className={pageStyles.reportFilterDateTimeRootRange}>
          <ReportSearchMultipleSelect
            key={`${controlId}__between_start__${filterOperationCode}`}
            multiple
            maxValues={1}
            compact={compact}
            name={`${controlId}__between_start`}
            label={t('reports.dateRangeStart')}
            values={displayOptions}
            value={reportBetweenSlotValues(value, 0)}
            serverFilter
            isLoading={remoteLoading}
            sx={controlSx}
            slotProps={reportFilterAutocompleteSlotProps}
            commitFreeText
            onInputChange={(next) => setSearchQuery(next)}
            setValueStore={(_, next) =>
              onChange(
                commitReportBetweenFilterSlot(
                  value,
                  0,
                  normalizeReportFilterSelectValues(next),
                ),
              )
            }
          />
          <Typography
            component="span"
            className={pageStyles.reportFilterDateTimeRangeSep}
            color="text.secondary">
            —
          </Typography>
          <ReportSearchMultipleSelect
            key={`${controlId}__between_end__${filterOperationCode}`}
            multiple
            maxValues={1}
            compact={compact}
            name={`${controlId}__between_end`}
            label={t('reports.dateRangeEnd')}
            values={displayOptions}
            value={reportBetweenSlotValues(value, 1)}
            serverFilter
            isLoading={remoteLoading}
            sx={controlSx}
            slotProps={reportFilterAutocompleteSlotProps}
            commitFreeText
            onInputChange={(next) => setSearchQuery(next)}
            setValueStore={(_, next) =>
              onChange(
                commitReportBetweenFilterSlot(
                  value,
                  1,
                  normalizeReportFilterSelectValues(next),
                ),
              )
            }
          />
        </Box>
      );
    }
    return (
      <ReportSearchMultipleSelect
        key={`${controlId}__${filterOperationCode ?? 'none'}`}
        multiple
        maxValues={maxValues}
        compact={compact}
        name={controlId}
        label={label}
        values={displayOptions}
        value={value}
        serverFilter
        isLoading={remoteLoading}
        sx={controlSx}
        slotProps={reportFilterAutocompleteSlotProps}
        commitFreeText
        onInputChange={(next) => setSearchQuery(next)}
        setValueStore={(_, next) => onChange(normalizeReportFilterSelectValues(next))}
      />
    );
  }

  const defaultMultiple = valueLoadKind !== 'enum' || metadataValueOptions.length === 0;
  const maxValues = resolveReportFilterValueMaxValues(filterOperationCode, defaultMultiple);

  if (isReportBetweenFilterOperation(filterOperationCode)) {
    return (
      <Box className={pageStyles.reportFilterDateTimeRootRange}>
        <ReportSearchMultipleSelect
          key={`${controlId}__between_start__${filterOperationCode}`}
          multiple
          maxValues={1}
          compact={compact}
          name={`${controlId}__between_start`}
          label={t('reports.dateRangeStart')}
          values={displayOptions}
          value={reportBetweenSlotValues(value, 0)}
          serverFilter={false}
          sx={controlSx}
          slotProps={reportFilterAutocompleteSlotProps}
          commitFreeText
          setValueStore={(_, next) =>
            onChange(
              commitReportBetweenFilterSlot(value, 0, normalizeReportFilterSelectValues(next)),
            )
          }
        />
        <Typography
          component="span"
          className={pageStyles.reportFilterDateTimeRangeSep}
          color="text.secondary">
          —
        </Typography>
        <ReportSearchMultipleSelect
          key={`${controlId}__between_end__${filterOperationCode}`}
          multiple
          maxValues={1}
          compact={compact}
          name={`${controlId}__between_end`}
          label={t('reports.dateRangeEnd')}
          values={displayOptions}
          value={reportBetweenSlotValues(value, 1)}
          serverFilter={false}
          sx={controlSx}
          slotProps={reportFilterAutocompleteSlotProps}
          commitFreeText
          setValueStore={(_, next) =>
            onChange(
              commitReportBetweenFilterSlot(value, 1, normalizeReportFilterSelectValues(next)),
            )
          }
        />
      </Box>
    );
  }

  return (
    <ReportSearchMultipleSelect
      key={`${controlId}__${filterOperationCode ?? 'none'}`}
      multiple
      maxValues={maxValues}
      compact={compact}
      name={controlId}
      label={label}
      values={displayOptions}
      value={value}
      serverFilter={false}
      sx={controlSx}
      slotProps={reportFilterAutocompleteSlotProps}
      commitFreeText
      setValueStore={(_, next) => onChange(normalizeReportFilterSelectValues(next))}
    />
  );
}
