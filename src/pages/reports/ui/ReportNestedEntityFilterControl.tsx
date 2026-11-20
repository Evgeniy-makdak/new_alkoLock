import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import { Box, Typography } from '@mui/material';

import { fetchReportNestedEntityValueOptions } from '@pages/reports/lib/fetchReportNestedEntityValueOptions';
import {
  SERVICE_HISTORY_RESULT_REFERENCE_ENTITY,
  resolveNestedFilterValueFetchTarget,
} from '@pages/reports/lib/eventsForFrontReportOptions';
import type { ReportVehicleLabelMaps } from '@pages/reports/lib/fetchVehicleFrontDataMaps';
import { buildVehicleAttributeOptions } from '@pages/reports/lib/buildVehicleAttributeOptions';
import { resolveReportVehicleDictionaryAttribute } from '@pages/reports/lib/reportVehicleDictionaryAttribute';
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
import {
  isReportBooleanField,
  isReportFreeTextField,
} from '@pages/reports/lib/reportFieldFilterKind';
import {
  commitReportBetweenFilterSlot,
  reportBetweenSlotValues,
} from '@pages/reports/lib/reportBetweenFilterSlots';
import {
  isReportBetweenFilterOperation,
  resolveReportFilterValueControlMode,
  resolveReportFilterValueMaxValues,
} from '@pages/reports/lib/mapReportQueryOperator';
import { toValuesFromSingleSelect } from '@pages/reports/lib/reportFilterSingleSelectValue';
import {
  reportFilterAutocompleteSlotProps,
  reportFilterControlSx,
  reportFilterModalControlSx,
} from '@pages/reports/lib/reportFilterControlSx';
import { normalizeReportFilterSelectValues } from '@pages/reports/lib/reportFilterSelectValues';
import { reportsStore } from '@pages/reports/model/reportsStore';
import type {
  ReportEntityMetadata,
  ReportFieldDefinition,
  ReportNestedEntityFilterState,
} from '@pages/reports/types/reportApiTypes';
import type { Value, Values } from '@shared/ui/search_multiple_select';

import { ReportCoordinateFilterField } from './ReportCoordinateFilterField';
import { ReportCoordinatePairFilterField } from './ReportCoordinatePairFilterField';
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
  filterOperationNumberParameter?: number | null;
  compact: boolean;
  controlSx: typeof reportFilterControlSx;
  vehicleLabelMaps?: ReportVehicleLabelMaps;
  /** Корневая сущность отчёта (Vehicle, DeviceEvent, …) — для справочников ТС. */
  rootReportEntityName?: string;
  /** Подпись выбранного «Поля результата» (родительского поля пути). */
  primaryFieldLabel?: string;
  metadataByEntity: Record<string, import('@pages/reports/types/reportApiTypes').ReportEntityMetadata | null>;
  t: TFunction;
  onChange: (values: Values) => void;
};

export function NestedFilterValueControl({
  fieldKey,
  segment,
  values,
  filterOperationCode,
  filterOperationNumberParameter = null,
  compact,
  controlSx,
  vehicleLabelMaps,
  rootReportEntityName,
  primaryFieldLabel,
  metadataByEntity,
  t,
  onChange,
}: NestedFilterValueControlProps) {
  /**
   * «Отчёт по истории автосервиса» -> «Результат» (service_history_events_for_front.label):
   * значения из front-data/service-history-event-types (исходы заявок), не event-types.
   */
  const normalizeLabel = (value: string | undefined) =>
    (value ?? '').replace(/\s+/g, ' ').trim().toLowerCase();
  const primaryFieldKey = fieldKey.toLowerCase();
  const primaryLabel = normalizeLabel(primaryFieldLabel);
  const leafLabel = normalizeLabel(segment.field.label);
  const leafFieldName = (segment.field.fieldName ?? '').trim().toLowerCase();
  const isAutoServiceHistoryResultField =
    rootReportEntityName === 'AutoServiceHistory' &&
    (primaryFieldKey.includes('service_history') ||
      primaryFieldKey.includes('servicehistory') ||
      primaryFieldKey.includes('events_for_front') ||
      primaryFieldKey.includes('eventsforfront') ||
      primaryLabel.includes('тип результата') ||
      primaryLabel === 'результат') &&
    (leafFieldName === 'label' ||
      segment.fieldPath === 'label' ||
      (segment.fieldPath ?? '').endsWith('.label') ||
      leafLabel === 'результат' ||
      leafLabel.includes('результат'));

  const fetchTarget = useMemo(
    () =>
      isAutoServiceHistoryResultField
        ? {
            referenceEntity: SERVICE_HISTORY_RESULT_REFERENCE_ENTITY,
            field: { ...segment.field, fieldName: 'label' },
          }
        : resolveNestedFilterValueFetchTarget(
            segment.leafEntityName,
            segment.field,
            metadataByEntity,
          ),
    [
      isAutoServiceHistoryResultField,
      segment.leafEntityName,
      segment.field,
      metadataByEntity,
    ],
  );

  const isBooleanValueField = isReportBooleanField(segment.field);
  const [searchQuery, setSearchQuery] = useState('');
  const [remoteOptions, setRemoteOptions] = useState<Values>([]);
  const [remoteLoading, setRemoteLoading] = useState(false);
  const loadVehicleLabelMaps = reportsStore((s) => s.loadVehicleLabelMaps);

  /**
   * Полный путь поля: «Поле результата» + шаги path. Для ТС тип/цвет может быть
   * вложенной сущностью (vehicle.type.label / typeReference.label), поэтому лист
   * `label` сам по себе не говорит, что это справочник front-data.
   */
  const fullVehicleFieldPath = [fieldKey, segment.fieldPath].filter(Boolean).join('.');
  const vehicleDictionaryAttribute =
    resolveReportVehicleDictionaryAttribute(fullVehicleFieldPath) ??
    resolveReportVehicleDictionaryAttribute(segment.field.fieldName);
  const vehicleDictionaryHints = [
    rootReportEntityName,
    segment.rootEntityName,
    segment.leafEntityName,
    fetchTarget.referenceEntity,
    fieldKey,
    segment.fieldPath,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  const isVehicleDictionaryField =
    Boolean(vehicleDictionaryAttribute) && vehicleDictionaryHints.includes('vehicle');
  const hasVehicleLabelMaps =
    Object.keys(vehicleLabelMaps?.types ?? {}).length > 0 ||
    Object.keys(vehicleLabelMaps?.colors ?? {}).length > 0;

  // «Тип»/«Цвет» ТС всегда из front-data/vehicle-types и vehicle-color.
  useEffect(() => {
    if (isVehicleDictionaryField && !hasVehicleLabelMaps) {
      void loadVehicleLabelMaps();
    }
  }, [isVehicleDictionaryField, hasVehicleLabelMaps, loadVehicleLabelMaps]);

  const resolvedValueLoadKind = resolveNestedEntityValueLoadKind(
    fetchTarget.field,
    fetchTarget.referenceEntity,
  );
  // Справочник ТС показываем как ENUM-список даже для вложенного label/ENTITY.
  const valueLoadKind = isVehicleDictionaryField ? 'enum' : resolvedValueLoadKind;

  useEffect(() => {
    setSearchQuery('');
  }, [fetchTarget.referenceEntity, fetchTarget.field.fieldName]);

  const staticValueOptions = useMemo(() => {
    if (valueLoadKind === 'static') {
      return buildNestedEntityStaticValueOptions(segment.field, t);
    }
    if (valueLoadKind === 'enum') {
      // Цвет/тип ТС — русские подписи из front-data, не ENUM-коды metadata.
      if (isVehicleDictionaryField && vehicleDictionaryAttribute) {
        const fromMaps = buildVehicleAttributeOptions(
          [],
          vehicleDictionaryAttribute,
          vehicleLabelMaps,
        );
        if (fromMaps.length) return fromMaps;
      }
      return buildReportAttributeValueOptions(segment.field, t);
    }
    return [];
  }, [
    segment.field,
    valueLoadKind,
    t,
    vehicleLabelMaps,
    isVehicleDictionaryField,
    vehicleDictionaryAttribute,
  ]);

  useEffect(() => {
    if (valueLoadKind !== 'domainList') {
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

  const valueOptions = valueLoadKind === 'domainList' ? remoteOptions : staticValueOptions;

  const displayValueOptions = useMemo(
    () => mergeOptionsWithSelected(valueOptions, values),
    [valueOptions, values],
  );

  if (valueLoadKind === 'coordinatePairInput') {
    return (
      <ReportCoordinatePairFilterField
        label={t('reports.terminalValuesLabel', { parameter: segment.label })}
        value={values}
        onChange={onChange}
        sx={controlSx}
        overflowTooltip={compact}
      />
    );
  }

  if (valueLoadKind === 'year') {
    return (
      <ReportYearFilterField
        label={t('reports.terminalValuesLabel', { parameter: segment.label })}
        value={values}
        operationCode={filterOperationCode}
        operationNumberParameter={filterOperationNumberParameter}
        onChange={onChange}
        sx={controlSx}
        overflowTooltip={compact}
      />
    );
  }

  if (valueLoadKind === 'dateTime') {
    return (
      <ReportDateTimeFilterField
        value={values}
        operationCode={filterOperationCode}
        operationNumberParameter={filterOperationNumberParameter}
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
        overflowTooltip={compact}
      />
    );
  }

  // domainList для координат — общий select ниже (пары / lat / lon из device-events).

  const valueMode = resolveReportFilterValueControlMode({
    operationCode: filterOperationCode,
    numberParameter: filterOperationNumberParameter,
    defaultMultiple: valueLoadKind !== 'enum' || staticValueOptions.length === 0,
    isBooleanValueField,
  });
  const maxValues = resolveReportFilterValueMaxValues(
    filterOperationCode,
    valueLoadKind !== 'enum' || staticValueOptions.length === 0,
    isBooleanValueField,
    filterOperationNumberParameter,
  );

  if (
    !isBooleanValueField &&
    isReportBetweenFilterOperation(filterOperationCode, filterOperationNumberParameter)
  ) {
    return (
      <Box className={pageStyles.reportFilterDateTimeRootRange}>
        <ReportSearchMultipleSelect
          key={`${fieldKey}__between_start__${filterOperationCode}`}
          multiple
          maxValues={1}
          compact={compact}
          name={`${fieldKey}__between_start`}
          label={t('reports.dateRangeStart')}
          values={displayValueOptions}
          value={reportBetweenSlotValues(values, 0)}
          serverFilter={valueLoadKind === 'domainList'}
          isLoading={valueLoadKind === 'domainList' ? remoteLoading : false}
          sx={controlSx}
          slotProps={reportFilterAutocompleteSlotProps}
          commitFreeText
          onInputChange={
            valueLoadKind === 'domainList' ? (next) => setSearchQuery(next) : undefined
          }
          setValueStore={(_, next) =>
            onChange(
              commitReportBetweenFilterSlot(
                values,
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
          key={`${fieldKey}__between_end__${filterOperationCode}`}
          multiple
          maxValues={1}
          compact={compact}
          name={`${fieldKey}__between_end`}
          label={t('reports.dateRangeEnd')}
          values={displayValueOptions}
          value={reportBetweenSlotValues(values, 1)}
          serverFilter={valueLoadKind === 'domainList'}
          isLoading={valueLoadKind === 'domainList' ? remoteLoading : false}
          sx={controlSx}
          slotProps={reportFilterAutocompleteSlotProps}
          commitFreeText
          onInputChange={
            valueLoadKind === 'domainList' ? (next) => setSearchQuery(next) : undefined
          }
          setValueStore={(_, next) =>
            onChange(
              commitReportBetweenFilterSlot(
                values,
                1,
                normalizeReportFilterSelectValues(next),
              ),
            )
          }
        />
      </Box>
    );
  }

  const forceSingle = isBooleanValueField || valueMode.isSingle;

  return (
    <ReportSearchMultipleSelect
      key={`${fieldKey}__terminalValues__${filterOperationCode ?? 'none'}`}
      multiple={!forceSingle}
      maxValues={maxValues}
      compact={compact}
      name={`${fieldKey}__terminalValues`}
      label={t('reports.terminalValuesLabel', { parameter: segment.label })}
      values={displayValueOptions}
      value={forceSingle ? values.slice(0, 1) : values}
      serverFilter={valueLoadKind === 'domainList'}
      isLoading={valueLoadKind === 'domainList' ? remoteLoading : false}
      sx={controlSx}
      slotProps={reportFilterAutocompleteSlotProps}
      commitFreeText={
        !forceSingle || (!isBooleanValueField && isReportFreeTextField(fetchTarget.field))
      }
      onInputChange={
        valueLoadKind === 'domainList' ? (next) => setSearchQuery(next) : undefined
      }
      setValueStore={(_, next) =>
        onChange(
          forceSingle
            ? toValuesFromSingleSelect(next)
            : normalizeReportFilterSelectValues(next),
        )
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
  /** Корневая сущность отчёта (Vehicle, DeviceEvent, …) — для справочников ТС. */
  rootReportEntityName?: string;
  state: ReportNestedEntityFilterState;
  onChange: (patch: Partial<ReportNestedEntityFilterState>) => void;
  filterOperationCode?: string | null;
  filterOperationNumberParameter?: number | null;
  /** numberParameter === 0 — не рендерим контрол значения. */
  hideValueControl?: boolean;
  compact?: boolean;
  /** Между «Параметр сущности» и «Значение» (обычно «Операция фильтра»). */
  operationSlot?: ReactNode;
  /**
   * Path уже задан до терминального листа (выбор из «Текущего состава») —
   * не показываем цепочку «Атрибут», только оператор и значение.
   */
  hidePropertySegments?: boolean;
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
  rootReportEntityName,
  state,
  onChange,
  filterOperationCode,
  filterOperationNumberParameter = null,
  hideValueControl = false,
  compact = false,
  operationSlot = null,
  hidePropertySegments = false,
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
    const refs = collectNestedFilterMetadataEntities(
      tableFieldsMetadata,
      path,
      metadataByEntity,
    );
    for (const ref of refs) {
      void reportsStore.getState().loadReferenceEntityMetadata(ref);
    }
  }, [tableFieldsMetadata, path.join('\0'), metadataByEntity]);

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
  const pathKey = path.join('\0');

  return (
    <Box className={pageStyles.reportFilterNestedEntity}>
      {!hidePropertySegments &&
        propertySegments.map((segment) => {
        if (segment.kind !== 'property') return null;
          const propertyOptions = buildReferenceEntityPropertyOptions(segment.metadata, t);
          const selectedProperty = segment.selectedFieldName
            ? (() => {
                const hit = propertyOptions.find(
                  (o) => String(o.value) === segment.selectedFieldName,
                );
                if (hit) return [hit];
                // AI/restore может восстановить path с id и др., которых нет в options
                // (идентификатор скрыт) — подпись берём из metadata, не fieldName.
                const fromMeta = segment.metadata?.fields?.find(
                  (f) => f.fieldName === segment.selectedFieldName,
                );
                const label =
                  (fromMeta?.label ?? '').trim() || segment.selectedFieldName;
                return [{ value: segment.selectedFieldName, label }];
              })()
            : [];

          const propertyLabel =
            segment.depth === 0
              ? t('reports.entityPropertyLabel')
              : t('reports.nestedEntityPropertyLabel', {
                  entity:
                    (segment.metadata?.label ?? '').trim() || segment.entityName,
                });

          // Ключ зависит только от родительского path — при очистке родителя дочерний селект размонтируется.
          const parentPathKey = path.slice(0, segment.depth).join('.') || 'root';

          return (
            <ReportSearchMultipleSelect
              key={`${field.fieldName}__property_${segment.depth}__${parentPathKey}`}
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

      {!hideValueControl &&
        valueSegments.map((segment, index) => {
        if (segment.kind !== 'value') return null;
        return (
          <NestedFilterValueControl
            key={`${field.fieldName}__value_${index}__${pathKey}`}
            fieldKey={field.fieldName}
            segment={segment}
            values={state.values}
            filterOperationCode={filterOperationCode}
            filterOperationNumberParameter={filterOperationNumberParameter}
            compact={compact}
            controlSx={controlSx}
            vehicleLabelMaps={vehicleLabelMaps}
            rootReportEntityName={rootReportEntityName}
            primaryFieldLabel={field.label || field.fieldName}
            metadataByEntity={metadataByEntity}
            t={t}
            onChange={(values) => onChange({ values })}
          />
        );
      })}
    </Box>
  );
}
