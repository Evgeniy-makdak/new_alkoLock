import { MapLink } from '@shared/ui/map_link';

import type { ReportCoordinatePair } from '@pages/reports/lib/reportCoordinateMapLink';

type ReportCoordinateMapCellProps = {
  pair: ReportCoordinatePair;
  vehicle?: string | null;
};

export function ReportCoordinateMapCell({ pair, vehicle }: ReportCoordinateMapCellProps) {
  return (
    <MapLink
      latitude={pair.latitude}
      longitude={pair.longitude}
      vehicle={vehicle ?? undefined}
      returnState={{ mapReturnContext: { sourceTab: 'reports' } }}
      compact
    />
  );
}
