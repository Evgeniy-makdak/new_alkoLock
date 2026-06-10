import { MapLink } from '@shared/ui/map_link';

import type { ReportCoordinatePair } from '@pages/reports/lib/reportCoordinateMapLink';
import { reportGenerationStore } from '@pages/reports/model/reportGenerationStore';

type ReportCoordinateMapCellProps = {
  pair: ReportCoordinatePair;
  vehicle?: string | null;
  eventId?: string | number | null;
};

export function ReportCoordinateMapCell({ pair, vehicle, eventId }: ReportCoordinateMapCellProps) {
  const { pagination, sort } = reportGenerationStore.getState();

  return (
    <MapLink
      latitude={pair.latitude}
      longitude={pair.longitude}
      vehicle={vehicle ?? undefined}
      eventId={eventId ?? undefined}
      returnState={{
        mapReturnContext: { sourceTab: 'reports' },
        reportsRestore: {
          page: pagination.page,
          pageSize: pagination.pageSize,
          sort,
        },
      }}
      compact
    />
  );
}
