import { useTranslation } from 'react-i18next';

import {
  buildSyntheticCompositeDomainListField,
  getReportCompositeEntityLabelKey,
  type ReportEntityCompositeKind,
} from '@pages/reports/lib/reportEntityCompositeFields';
import type { ReportVehicleLabelMaps } from '@pages/reports/lib/fetchVehicleFrontDataMaps';
import {
  reportFilterControlSx,
  reportFilterModalControlSx,
} from '@pages/reports/lib/reportFilterControlSx';
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
  const field = buildSyntheticCompositeDomainListField(kind);

  return (
    <NestedFilterValueControl
      fieldKey={fieldKey}
      segment={{
        kind: 'value',
        leafEntityName: kind,
        field,
        label: t(getReportCompositeEntityLabelKey(kind)),
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
