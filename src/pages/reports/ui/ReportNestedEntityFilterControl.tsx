import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Box } from '@mui/material';

import {
  buildNestedEntityAttributeOptions,
  enrichNestedEntityFilterValues,
} from '@pages/reports/lib/buildNestedEntityAttributeOptions';
import { fetchReportNestedEntityValueOptions } from '@pages/reports/lib/fetchReportNestedEntityValueOptions';
import type { ReportVehicleLabelMaps } from '@pages/reports/lib/fetchVehicleFrontDataMaps';
import { findReferenceEntityFieldByAttribute } from '@pages/reports/lib/findReferenceEntityFieldByAttribute';
import {
  buildNestedEntityStaticValueOptions,
  resolveNestedEntityValueLoadKind,
} from '@pages/reports/lib/reportNestedEntityValueOptions';
import { buildReferenceEntityPropertyOptions } from '@pages/reports/lib/reportReferenceEntityProperties';
import {
  reportFilterAutocompleteSlotProps,
  reportFilterControlSx,
} from '@pages/reports/lib/reportFilterControlSx';
import { toValuesFromSingleSelect } from '@pages/reports/lib/reportFilterSingleSelectValue';
import type {
  ReportEntityMetadata,
  ReportFieldDefinition,
  ReportNestedEntityFilterState,
} from '@pages/reports/types/reportApiTypes';
import type { Value, Values } from '@shared/ui/search_multiple_select';

import { ReportDateTimeFilterField } from './ReportDateTimeFilterField';
import { ReportYearFilterField } from './ReportYearFilterField';
import { ReportSearchMultipleSelect } from './ReportSearchMultipleSelect';

import pageStyles from './Reports.module.scss';

type ReportNestedEntityFilterControlProps = {
  field: ReportFieldDefinition;
  referenceEntity: string;
  tableFieldsMetadata: ReportEntityMetadata | null;
  tableFieldsMetadataLoading?: boolean;
  records: unknown[];
  recordsLoading: boolean;
  labelMaps: ReportVehicleLabelMaps;
  state: ReportNestedEntityFilterState;
  onChange: (patch: Partial<ReportNestedEntityFilterState>) => void;
  filterOperationCode?: string | null;
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
  records,
  recordsLoading,
  labelMaps,
  state,
  onChange,
  filterOperationCode,
}: ReportNestedEntityFilterControlProps) {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');

  const attributeField = useMemo(
    () =>
      state.attribute
        ? findReferenceEntityFieldByAttribute(tableFieldsMetadata, state.attribute)
        : undefined,
    [tableFieldsMetadata, state.attribute],
  );

  const valueLoadKind = useMemo(
    () => resolveNestedEntityValueLoadKind(attributeField, referenceEntity, state.attribute ?? ''),
    [attributeField, referenceEntity, state.attribute],
  );

  const fieldForRemoteSearch = useMemo((): ReportFieldDefinition | undefined => {
    if (attributeField) return attributeField;
    if (!state.attribute) return undefined;
    return {
      fieldName: state.attribute,
      label: state.attribute,
      alias: null,
      type: 'TEXT',
      filterable: true,
      sortable: true,
      groupable: true,
      aggregation: null,
      availableOperations: [],
      availableFunctions: [],
    };
  }, [attributeField, state.attribute]);

  const propertyOptions: Values = useMemo(
    () => buildReferenceEntityPropertyOptions(referenceEntity, tableFieldsMetadata, t),
    [referenceEntity, tableFieldsMetadata, t],
  );

  const selectedProperty = useMemo(() => {
    if (!state.attribute) return [];
    const hit = propertyOptions.find((o) => String(o.value) === state.attribute);
    return hit ? [hit] : [{ value: state.attribute, label: state.attribute }];
  }, [state.attribute, propertyOptions]);

  const propertyLabel = useMemo(() => {
    if (!state.attribute) return '';
    return propertyOptions.find((o) => String(o.value) === state.attribute)?.label ?? state.attribute;
  }, [state.attribute, propertyOptions]);

  useEffect(() => {
    setSearchQuery('');
  }, [state.attribute, referenceEntity]);

  const staticValueOptions = useMemo(() => {
    if (!attributeField || valueLoadKind !== 'static') return [];
    return buildNestedEntityStaticValueOptions(attributeField, t);
  }, [attributeField, valueLoadKind, t]);

  const frontDataOptions = useMemo(() => {
    if (!state.attribute || valueLoadKind !== 'frontDataEnum') return [];
    return buildNestedEntityAttributeOptions([], referenceEntity, state.attribute, labelMaps);
  }, [valueLoadKind, referenceEntity, state.attribute, labelMaps]);

  const [remoteOptions, setRemoteOptions] = useState<Values>([]);
  const [remoteLoading, setRemoteLoading] = useState(false);

  useEffect(() => {
    const needsRemote = valueLoadKind === 'serverSearch' && state.attribute && fieldForRemoteSearch;

    if (!needsRemote) {
      setRemoteOptions([]);
      return;
    }

    let cancelled = false;
    setRemoteLoading(true);

    const load = fetchReportNestedEntityValueOptions(
      referenceEntity,
      fieldForRemoteSearch,
      searchQuery,
      labelMaps,
    );

    void load
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
  }, [valueLoadKind, referenceEntity, fieldForRemoteSearch, state.attribute, searchQuery, labelMaps]);

  const legacyClientOptions = useMemo(() => {
    if (!state.attribute || valueLoadKind === 'serverSearch' || valueLoadKind === 'dateTime') {
      return [];
    }
    if (valueLoadKind === 'static' || valueLoadKind === 'frontDataEnum') {
      return [];
    }
    return buildNestedEntityAttributeOptions(records, referenceEntity, state.attribute, labelMaps);
  }, [
    records,
    referenceEntity,
    state.attribute,
    labelMaps,
    valueLoadKind,
  ]);

  const valueOptions = useMemo(() => {
    if (valueLoadKind === 'static') return staticValueOptions;
    if (valueLoadKind === 'frontDataEnum') return frontDataOptions;
    if (valueLoadKind === 'serverSearch') return remoteOptions;
    return legacyClientOptions;
  }, [valueLoadKind, staticValueOptions, frontDataOptions, remoteOptions, legacyClientOptions]);

  const valueOptionsLoading =
    valueLoadKind === 'serverSearch'
      ? remoteLoading
      : valueLoadKind === 'static' || valueLoadKind === 'frontDataEnum'
        ? false
        : recordsLoading;

  const useServerFilter = valueLoadKind === 'serverSearch';

  const displayValueOptions = useMemo(
    () => mergeOptionsWithSelected(valueOptions, state.values),
    [valueOptions, state.values],
  );

  const selectedValues = useMemo(() => {
    if (!state.attribute || !state.values.length) return state.values;
    if (useServerFilter || valueLoadKind === 'static') return state.values;
    return enrichNestedEntityFilterValues(
      referenceEntity,
      state.attribute,
      state.values,
      records,
      labelMaps,
    );
  }, [referenceEntity, state.attribute, state.values, records, labelMaps, useServerFilter, valueLoadKind]);

  return (
    <Box className={pageStyles.reportFilterNestedEntity}>
      <ReportSearchMultipleSelect
        multiple={false}
        name={`${field.fieldName}__property`}
        label={t('reports.entityPropertyLabel')}
        placeholder={t('reports.entityPropertyPlaceholder')}
        values={propertyOptions}
        value={selectedProperty}
        serverFilter={false}
        isLoading={tableFieldsMetadataLoading}
        sx={reportFilterControlSx}
        slotProps={reportFilterAutocompleteSlotProps}
        setValueStore={(_, next) => {
          const picked = toValuesFromSingleSelect(next)[0];
          onChange({ attribute: picked ? String(picked.value) : null, values: [] });
        }}
      />

      {state.attribute && valueLoadKind === 'year' ? (
        <ReportYearFilterField
          label={t('reports.terminalValuesLabel', { parameter: propertyLabel })}
          value={state.values}
          onChange={(values) => onChange({ values })}
        />
      ) : state.attribute && valueLoadKind === 'dateTime' && attributeField ? (
        <ReportDateTimeFilterField
          value={state.values}
          operationCode={filterOperationCode}
          onChange={(values) => onChange({ values })}
        />
      ) : state.attribute ? (
        <ReportSearchMultipleSelect
          multiple
          name={`${field.fieldName}__terminalValues`}
          label={t('reports.terminalValuesLabel', { parameter: propertyLabel })}
          values={displayValueOptions}
          value={selectedValues}
          serverFilter={useServerFilter}
          isLoading={
            valueOptionsLoading || (useServerFilter && !attributeField && tableFieldsMetadataLoading)
          }
          sx={reportFilterControlSx}
          slotProps={reportFilterAutocompleteSlotProps}
          onInputChange={useServerFilter ? setSearchQuery : undefined}
          setValueStore={(_, next) => onChange({ values: next as Values })}
        />
      ) : null}
    </Box>
  );
}
