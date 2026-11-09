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
import type { Values } from '@shared/ui/search_multiple_select';

import { NestedFilterValueControl } from './ReportNestedEntityFilterControl';

type ReportCompositeEntityValueControlProps = {
  kind: ReportEntityCompositeKind;
  fieldKey: string;
  values: Values;
  filterOperationCode?: string | null;
  compact?: boolean;
  vehicleLabelMaps?: ReportVehicleLabelMaps;
  onChange: (values: Values) => void;
};

export function ReportCompositeEntityValueControl({
  kind,
  fieldKey,
  values,
  filterOperationCode,
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
  const field = buildSyntheticCompositeDomainListField(kind, entityMetadata);
  const entityLabel = resolveReportCompositeEntityDisplayLabel(kind, t, entityMetadata);

  return (
    <NestedFilterValueControl
      fieldKey={fieldKey}
      segment={{
        kind: 'value',
        leafEntityName: kind,
        field,
        label: entityLabel,
      }}
      values={values}
      filterOperationCode={filterOperationCode}
      compact={compact}
      controlSx={controlSx}
      vehicleLabelMaps={vehicleLabelMaps}
      metadataByEntity={{}}
      t={t}
      onChange={onChange}
    />
  );
}
