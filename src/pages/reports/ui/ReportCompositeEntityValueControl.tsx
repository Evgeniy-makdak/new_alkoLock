import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import {
  buildSyntheticCompositeDomainListField,
  resolveReportCompositeEntityDisplayLabel,
  type ReportEntityCompositeKind,
} from '@pages/reports/lib/reportEntityCompositeFields';
import type { ReportVehicleLabelMaps } from '@pages/reports/lib/fetchVehicleFrontDataMaps';
import {
  reportFilterControlSx,
  reportFilterModalControlSx,
} from '@pages/reports/lib/reportFilterControlSx';
import { reportsStore } from '@pages/reports/model/reportsStore';
import type { ReportEntityMetadata } from '@pages/reports/types/reportApiTypes';
import type { Values } from '@shared/ui/search_multiple_select';

import { NestedFilterValueControl } from './ReportNestedEntityFilterControl';

/** Стабильная ссылка: пустая карта metadata не должна пересоздаваться на каждом рендере. */
const EMPTY_METADATA_BY_ENTITY: Record<string, ReportEntityMetadata | null> = {};

type ReportCompositeEntityValueControlProps = {
  kind: ReportEntityCompositeKind;
  fieldKey: string;
  values: Values;
  filterOperationCode?: string | null;
  filterOperationNumberParameter?: number | null;
  compact?: boolean;
  vehicleLabelMaps?: ReportVehicleLabelMaps;
  onChange: (values: Values) => void;
};

export function ReportCompositeEntityValueControl({
  kind,
  fieldKey,
  values,
  filterOperationCode,
  filterOperationNumberParameter = null,
  compact = false,
  vehicleLabelMaps,
  onChange,
}: ReportCompositeEntityValueControlProps) {
  const { t } = useTranslation();
  const controlSx = compact ? reportFilterModalControlSx : reportFilterControlSx;
  const rootMetadata = reportsStore((s) => s.metadata);
  const nestedMetadata = reportsStore((s) => s.referenceEntityMetadataByName[kind] ?? null);
  const entityMetadata =
    nestedMetadata ?? (rootMetadata?.entityName === kind ? rootMetadata : null);
  // Мемоизация: новый объект field/segment на каждом рендере перезапускал
  // загрузку опций (fetchTarget в deps) и держал список в постоянном loading.
  const field = useMemo(
    () => buildSyntheticCompositeDomainListField(kind, entityMetadata),
    [kind, entityMetadata],
  );
  const entityLabel = resolveReportCompositeEntityDisplayLabel(kind, t, entityMetadata);
  const segment = useMemo(
    () => ({
      kind: 'value' as const,
      leafEntityName: kind,
      field,
      label: entityLabel,
    }),
    [kind, field, entityLabel],
  );

  return (
    <NestedFilterValueControl
      fieldKey={fieldKey}
      segment={segment}
      values={values}
      filterOperationCode={filterOperationCode}
      filterOperationNumberParameter={filterOperationNumberParameter}
      compact={compact}
      controlSx={controlSx}
      vehicleLabelMaps={vehicleLabelMaps}
      metadataByEntity={EMPTY_METADATA_BY_ENTITY}
      t={t}
      onChange={onChange}
    />
  );
}
