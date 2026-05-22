import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import {
  buildNestedEntityAttributeOptions,
  enrichNestedEntityFilterValues,
} from '@pages/reports/lib/buildNestedEntityAttributeOptions';
import { fetchReportNestedEntitySearchOptions } from '@pages/reports/lib/fetchReportNestedEntitySearchOptions';
import type { ReportVehicleLabelMaps } from '@pages/reports/lib/fetchVehicleFrontDataMaps';
import { getReferenceEntityProperties } from '@pages/reports/lib/reportReferenceEntityProperties';
import { isReportReferenceEntityServerSearch } from '@pages/reports/lib/reportReferenceEntityServerSearch';
import {
  reportFilterAutocompleteSlotProps,
  reportFilterControlSx,
} from '@pages/reports/lib/reportFilterControlSx';
import { toValuesFromSingleSelect } from '@pages/reports/lib/reportFilterSingleSelectValue';
import type { ReportFieldDefinition, ReportNestedEntityFilterState } from '@pages/reports/types/reportApiTypes';
import type { Value, Values } from '@shared/ui/search_multiple_select';

import { ReportSearchMultipleSelect } from './ReportSearchMultipleSelect';

type ReportNestedEntityFilterControlProps = {
  field: ReportFieldDefinition;
  referenceEntity: string;
  records: unknown[];
  recordsLoading: boolean;
  labelMaps: ReportVehicleLabelMaps;
  state: ReportNestedEntityFilterState;
  onChange: (patch: Partial<ReportNestedEntityFilterState>) => void;
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
  records,
  recordsLoading,
  labelMaps,
  state,
  onChange,
}: ReportNestedEntityFilterControlProps) {
  const { t } = useTranslation();
  const serverSearch = isReportReferenceEntityServerSearch(referenceEntity);
  const [searchQuery, setSearchQuery] = useState('');
  const [serverOptions, setServerOptions] = useState<Values>([]);
  const [serverOptionsLoading, setServerOptionsLoading] = useState(false);

  const propertyOptions: Values = useMemo(
    () =>
      getReferenceEntityProperties(referenceEntity).map((prop) => ({
        value: prop.key,
        label: t(prop.labelKey),
      })),
    [referenceEntity, t],
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

  const clientValueOptions = useMemo(() => {
    if (!state.attribute || serverSearch) return [];
    return buildNestedEntityAttributeOptions(records, referenceEntity, state.attribute, labelMaps);
  }, [records, referenceEntity, state.attribute, labelMaps, serverSearch]);

  useEffect(() => {
    if (!serverSearch || !state.attribute) {
      setServerOptions([]);
      return;
    }

    let cancelled = false;
    setServerOptionsLoading(true);
    void fetchReportNestedEntitySearchOptions(referenceEntity, state.attribute, searchQuery, labelMaps)
      .then((opts) => {
        if (!cancelled) setServerOptions(opts);
      })
      .catch(() => {
        if (!cancelled) setServerOptions([]);
      })
      .finally(() => {
        if (!cancelled) setServerOptionsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [serverSearch, referenceEntity, state.attribute, searchQuery, labelMaps]);

  const valueOptions = serverSearch ? serverOptions : clientValueOptions;
  const valueOptionsLoading = serverSearch ? serverOptionsLoading : recordsLoading;

  const displayValueOptions = useMemo(
    () => mergeOptionsWithSelected(valueOptions, state.values),
    [valueOptions, state.values],
  );

  const selectedValues = useMemo(() => {
    if (!state.attribute || !state.values.length) return state.values;
    if (serverSearch) return state.values;
    return enrichNestedEntityFilterValues(
      referenceEntity,
      state.attribute,
      state.values,
      records,
      labelMaps,
    );
  }, [referenceEntity, state.attribute, state.values, records, labelMaps, serverSearch]);

  return (
    <>
      <ReportSearchMultipleSelect
        multiple={false}
        name={`${field.fieldName}__property`}
        label={t('reports.entityPropertyLabel')}
        placeholder={t('reports.entityPropertyPlaceholder')}
        values={propertyOptions}
        value={selectedProperty}
        serverFilter={false}
        sx={reportFilterControlSx}
        slotProps={reportFilterAutocompleteSlotProps}
        setValueStore={(_, next) => {
          const picked = toValuesFromSingleSelect(next)[0];
          onChange({ attribute: picked ? String(picked.value) : null, values: [] });
        }}
      />

      {state.attribute ? (
        <ReportSearchMultipleSelect
          multiple
          name={`${field.fieldName}__terminalValues`}
          label={t('reports.terminalValuesLabel', { parameter: propertyLabel })}
          values={displayValueOptions}
          value={selectedValues}
          serverFilter={serverSearch}
          isLoading={valueOptionsLoading}
          sx={reportFilterControlSx}
          slotProps={reportFilterAutocompleteSlotProps}
          onInputChange={serverSearch ? setSearchQuery : undefined}
          setValueStore={(_, next) => onChange({ values: next as Values })}
        />
      ) : null}
    </>
  );
}
