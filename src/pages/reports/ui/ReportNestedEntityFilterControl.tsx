import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import {
  buildNestedEntityAttributeOptions,
  enrichNestedEntityFilterValues,
} from '@pages/reports/lib/buildNestedEntityAttributeOptions';
import type { ReportVehicleLabelMaps } from '@pages/reports/lib/fetchVehicleFrontDataMaps';
import { getReferenceEntityProperties } from '@pages/reports/lib/reportReferenceEntityProperties';
import {
  reportFilterAutocompleteSlotProps,
  reportFilterControlSx,
} from '@pages/reports/lib/reportFilterControlSx';
import { toValuesFromSingleSelect } from '@pages/reports/lib/reportFilterSingleSelectValue';
import type { ReportFieldDefinition, ReportNestedEntityFilterState } from '@pages/reports/types/reportApiTypes';
import type { Values } from '@shared/ui/search_multiple_select';

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

  const valueOptions = useMemo(() => {
    if (!state.attribute) return [];
    return buildNestedEntityAttributeOptions(records, referenceEntity, state.attribute, labelMaps);
  }, [records, referenceEntity, state.attribute, labelMaps]);

  const selectedValues = useMemo(() => {
    if (!state.attribute) return state.values;
    return enrichNestedEntityFilterValues(
      referenceEntity,
      state.attribute,
      state.values,
      records,
      labelMaps,
    );
  }, [referenceEntity, state.attribute, state.values, records, labelMaps]);

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
          values={valueOptions}
          value={selectedValues}
          serverFilter={false}
          isLoading={recordsLoading}
          sx={reportFilterControlSx}
          slotProps={reportFilterAutocompleteSlotProps}
          setValueStore={(_, next) => onChange({ values: next as Values })}
        />
      ) : null}
    </>
  );
}
