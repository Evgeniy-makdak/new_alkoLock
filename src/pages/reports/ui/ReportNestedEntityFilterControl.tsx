import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import { Box } from '@mui/material';

import { fetchReportNestedEntityValueOptions } from '@pages/reports/lib/fetchReportNestedEntityValueOptions';
import { resolveNestedFilterValueFetchTarget } from '@pages/reports/lib/eventsForFrontReportOptions';
import type { ReportVehicleLabelMaps } from '@pages/reports/lib/fetchVehicleFrontDataMaps';
import {
  buildReferenceEntityPropertyOptions,
  buildReportAttributeValueOptions,
} from '@pages/reports/lib/reportMetadataFilterOptions';
import { resolveNestedEntityValueLoadKind } from '@pages/reports/lib/reportNestedEntityValueOptions';
import {
  buildNestedFilterUiSegments,
  collectNestedFilterMetadataEntities,
  normalizeNestedFilterPath,
} from '@pages/reports/lib/reportNestedFilterPath';
import { buildNestedEntityStaticValueOptions } from '@pages/reports/lib/reportNestedEntityValueOptions';
import { isReportBooleanField } from '@pages/reports/lib/reportFieldFilterKind';
import {
  reportFilterAutocompleteSlotProps,
  reportFilterControlSx,
  reportFilterModalControlSx,
} from '@pages/reports/lib/reportFilterControlSx';
import { toValuesFromSingleSelect } from '@pages/reports/lib/reportFilterSingleSelectValue';
import { reportsStore } from '@pages/reports/model/reportsStore';
import type {
  ReportEntityMetadata,
  ReportFieldDefinition,
  ReportNestedEntityFilterState,
} from '@pages/reports/types/reportApiTypes';
import type { Value, Values } from '@shared/ui/search_multiple_select';

import { ReportCoordinateFilterField } from './ReportCoordinateFilterField';
import { ReportDateTimeFilterField } from './ReportDateTimeFilterField';
import { ReportYearFilterField } from './ReportYearFilterField';
import { ReportSearchMultipleSelect } from './ReportSearchMultipleSelect';

import pageStyles from './Reports.module.scss';

import type { TFunction } from 'i18next';

import type { NestedFilterValueSegment } from '@pages/reports/lib/reportNestedFilterPath';

type NestedFilterValueControlProps = {
  fieldKey: string;
  segment: NestedFilterValueSegment;
  values: Values;
  filterOperationCode?: string | null;
  compact: boolean;
  controlSx: typeof reportFilterControlSx;
  vehicleLabelMaps?: ReportVehicleLabelMaps;
  metadataByEntity: Record<string, import('@pages/reports/types/reportApiTypes').ReportEntityMetadata | null>;
  t: TFunction;
  onChange: (values: Values) => void;
};

export function NestedFilterValueControl({
  fieldKey,
  segment,
  values,
  filterOperationCode,
  compact,
  controlSx,
  vehicleLabelMaps,
  metadataByEntity,
  t,
  onChange,
}: NestedFilterValueControlProps) {
  const fetchTarget = useMemo(
    () => resolveNestedFilterValueFetchTarget(segment.leafEntityName, segment.field, metadataByEntity),
    [segment.leafEntityName, segment.field, metadataByEntity],
  );

  const valueLoadKind = resolveNestedEntityValueLoadKind(
    fetchTarget.field,
    fetchTarget.referenceEntity,
  );
  const isBooleanValueField = isReportBooleanField(segment.field);
  const [searchQuery, setSearchQuery] = useState('');
  const [remoteOptions, setRemoteOptions] = useState<Values>([]);
  const [remoteLoading, setRemoteLoading] = useState(false);

  useEffect(() => {
    setSearchQuery('');
  }, [fetchTarget.referenceEntity, fetchTarget.field.fieldName]);

  const staticValueOptions = useMemo(() => {
    if (valueLoadKind === 'static') {
      return buildNestedEntityStaticValueOptions(segment.field, t);
    }
    if (valueLoadKind === 'enum') {
      return buildReportAttributeValueOptions(segment.field, t);
    }
    return [];
  }, [segment.field, valueLoadKind, t]);

  useEffect(() => {
    if (valueLoadKind !== 'domainList' && valueLoadKind !== 'coordinatePair') {
      setRemoteOptions([]);
      return;
    }

    let cancelled = false;
    setRemoteLoading(true);

    void fetchReportNestedEntityValueOptions(
      fetchTarget.referenceEntity,
      fetchTarget.field,
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
  }, [valueLoadKind, fetchTarget, searchQuery, vehicleLabelMaps]);

  const valueOptions =
    valueLoadKind === 'domainList' || valueLoadKind === 'coordinatePair'
      ? remoteOptions
      : staticValueOptions;

  const displayValueOptions = useMemo(
    () => mergeOptionsWithSelected(valueOptions, values),
    [valueOptions, values],
  );

  const useServerFilter = valueLoadKind === 'domainList' || valueLoadKind === 'coordinatePair';

  if (valueLoadKind === 'year') {
    return (
      <ReportYearFilterField
        label={t('reports.terminalValuesLabel', { parameter: segment.label })}
        value={values}
        onChange={onChange}
      />
    );
  }

  if (valueLoadKind === 'dateTime') {
    return (
      <ReportDateTimeFilterField
        value={values}
        operationCode={filterOperationCode}
        onChange={onChange}
      />
    );
  }

  if (valueLoadKind === 'coordinate') {
    return (
      <ReportCoordinateFilterField
        label={t('reports.terminalValuesLabel', { parameter: segment.label })}
        value={values}
        onChange={onChange}
        sx={controlSx}
      />
    );
  }

  return (
    <ReportSearchMultipleSelect
      multiple={!isBooleanValueField}
      compact={compact}
      name={`${fieldKey}__terminalValues`}
      label={t('reports.terminalValuesLabel', { parameter: segment.label })}
      values={displayValueOptions}
      value={isBooleanValueField ? values.slice(0, 1) : values}
      serverFilter={useServerFilter}
      isLoading={useServerFilter && remoteLoading}
      sx={controlSx}
      slotProps={reportFilterAutocompleteSlotProps}
      onInputChange={useServerFilter ? setSearchQuery : undefined}
      setValueStore={(_, next) =>
        onChange(isBooleanValueField ? toValuesFromSingleSelect(next) : (next as Values))
      }
    />
  );
}

type ReportNestedEntityFilterControlProps = {
  field: ReportFieldDefinition;
  referenceEntity: string;
  tableFieldsMetadata: ReportEntityMetadata | null;
  tableFieldsMetadataLoading?: boolean;
  referenceEntityMetadataByName: Record<string, ReportEntityMetadata | null>;
  referenceEntityMetadataLoadingByName: Record<string, boolean>;
  vehicleLabelMaps?: ReportVehicleLabelMaps;
  state: ReportNestedEntityFilterState;
  onChange: (patch: Partial<ReportNestedEntityFilterState>) => void;
  filterOperationCode?: string | null;
  compact?: boolean;
  /** Между «Параметр сущности» и «Значение» (обычно «Операция фильтра»). */
  operationSlot?: ReactNode;
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

export function ReportNestedEntityFilterControl({
  field,
  referenceEntity,
  tableFieldsMetadata,
  tableFieldsMetadataLoading = false,
  referenceEntityMetadataByName,
  referenceEntityMetadataLoadingByName,
  vehicleLabelMaps,
  state,
  onChange,
  filterOperationCode,
  compact = false,
  operationSlot = null,
}: ReportNestedEntityFilterControlProps) {
  const { t } = useTranslation();
  const controlSx = compact ? reportFilterModalControlSx : reportFilterControlSx;
  const path = normalizeNestedFilterPath(state);

  const loadingByEntity = useMemo(() => {
    const map: Record<string, boolean> = {
      [referenceEntity]: tableFieldsMetadataLoading,
    };
    for (const [key, loading] of Object.entries(referenceEntityMetadataLoadingByName)) {
      map[key] = loading;
    }
    return map;
  }, [referenceEntity, tableFieldsMetadataLoading, referenceEntityMetadataLoadingByName]);

  const metadataByEntity = useMemo(
    () => ({
      [referenceEntity]: tableFieldsMetadata,
      ...referenceEntityMetadataByName,
    }),
    [referenceEntity, tableFieldsMetadata, referenceEntityMetadataByName],
  );

  useEffect(() => {
    const refs = collectNestedFilterMetadataEntities(tableFieldsMetadata, path);
    for (const ref of refs) {
      void reportsStore.getState().loadReferenceEntityMetadata(ref);
    }
  }, [tableFieldsMetadata, path.join('\0')]);

  const segments = useMemo(
    () =>
      buildNestedFilterUiSegments(
        referenceEntity,
        tableFieldsMetadata,
        path,
        metadataByEntity,
        loadingByEntity,
      ),
    [referenceEntity, tableFieldsMetadata, path, metadataByEntity, loadingByEntity],
  );

  const handlePropertyChange = (depth: number, nextFieldName: string | null) => {
    const nextPath = path.slice(0, depth);
    if (nextFieldName) {
      nextPath.push(nextFieldName);
    }
    onChange({ path: nextPath, values: [] });
  };

  const propertySegments = segments.filter((s) => s.kind === 'property');
  const valueSegments = segments.filter((s) => s.kind === 'value');

  return (
    <Box className={pageStyles.reportFilterNestedEntity}>
      {propertySegments.map((segment) => {
        if (segment.kind !== 'property') return null;
          const propertyOptions = buildReferenceEntityPropertyOptions(segment.metadata, t);
          const selectedProperty = segment.selectedFieldName
            ? (() => {
                const hit = propertyOptions.find(
                  (o) => String(o.value) === segment.selectedFieldName,
                );
                return hit
                  ? [hit]
                  : [{ value: segment.selectedFieldName, label: segment.selectedFieldName }];
              })()
            : [];

          const propertyLabel =
            segment.depth === 0
              ? t('reports.entityPropertyLabel')
              : t('reports.nestedEntityPropertyLabel', {
                  entity: segment.entityName,
                });

          return (
            <ReportSearchMultipleSelect
              key={`${field.fieldName}__property_${segment.depth}`}
              multiple={false}
              compact={compact}
              name={`${field.fieldName}__property_${segment.depth}`}
              label={propertyLabel}
              placeholder={t('reports.entityPropertyPlaceholder')}
              values={propertyOptions}
              value={selectedProperty}
              serverFilter={false}
              isLoading={segment.loading}
              sx={controlSx}
              slotProps={reportFilterAutocompleteSlotProps}
              setValueStore={(_, next) => {
                const picked = toValuesFromSingleSelect(next)[0];
                handlePropertyChange(
                  segment.depth,
                  picked ? String(picked.value) : null,
                );
              }}
            />
          );
      })}

      {operationSlot}

      {valueSegments.map((segment, index) => {
        if (segment.kind !== 'value') return null;
        return (
          <NestedFilterValueControl
            key={`${field.fieldName}__value_${index}`}
            fieldKey={field.fieldName}
            segment={segment}
            values={state.values}
            filterOperationCode={filterOperationCode}
            compact={compact}
            controlSx={controlSx}
            vehicleLabelMaps={vehicleLabelMaps}
            metadataByEntity={metadataByEntity}
            t={t}
            onChange={(values) => onChange({ values })}
          />
        );
      })}
    </Box>
  );
}
