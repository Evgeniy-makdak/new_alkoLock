import { useLocation, useNavigate } from 'react-router-dom';

import { useTheme } from '@mui/material/styles';

import { InfoClickableChipValue } from '@entities/info/ui/InfoClickableChipValue';
import { EventsApi } from '@shared/api/baseQuerys';
import { RoutePaths } from '@shared/config/routePathsEnum';
import { copyContent } from '@shared/lib/copyText';
import type { ID } from '@shared/types/BaseQueryTypes';

interface MapLinkProps {
  latitude: string | number;
  longitude: string | number;
  vehicle?: string;
  /** Подгрузка госномера по событию, если в строке отчёта его нет. */
  eventId?: ID;
  testid?: string;
  returnState?: Record<string, unknown>;
  /** Компактный чип для таблицы отчётов. */
  compact?: boolean;
}

function formatMapCoordinateLabel(latitude: string | number, longitude: string | number): string {
  const lat = Number(latitude);
  const lng = Number(longitude);
  if (Number.isFinite(lat) && Number.isFinite(lng)) {
    return `${lat.toFixed(6)} ${lng.toFixed(6)}`;
  }
  return `${latitude} ${longitude}`;
}

async function resolveVehicleRegistration(
  vehicle: string | undefined,
  eventId: ID | undefined,
): Promise<string | undefined> {
  const trimmed = vehicle?.trim();
  if (trimmed && trimmed !== '—' && trimmed !== '-') {
    return trimmed;
  }
  if (eventId == null || eventId === '') return undefined;

  try {
    const response = await EventsApi.getEventItem(eventId);
    const event = response?.data;
    const registration =
      event?.vehicleRecord?.registrationNumber ||
      event?.action?.vehicleRecord?.registrationNumber;
    const normalized = registration?.trim();
    if (normalized && normalized !== '—' && normalized !== '-') {
      return normalized;
    }
  } catch {
    // Переход на карту по координатам возможен и без госномера.
  }

  return undefined;
}

export const MapLink = ({
  latitude,
  longitude,
  vehicle,
  eventId,
  testid,
  returnState,
  compact = false,
}: MapLinkProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const label = formatMapCoordinateLabel(latitude, longitude);

  const handleNavigate = async () => {
    const lat = Number(latitude);
    const lng = Number(longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

    const resolvedVehicle = await resolveVehicleRegistration(vehicle, eventId);
    const vehicleParam = resolvedVehicle
      ? `&vehicle=${encodeURIComponent(resolvedVehicle)}`
      : '';
    const returnNavigation = {
      pathname: location.pathname,
      search: location.search,
      hash: location.hash,
      state: {
        ...(typeof location.state === 'object' && location.state ? (location.state as object) : {}),
        ...(returnState || {}),
      },
    };
    navigate(
      {
        pathname: RoutePaths.map,
        search: `?lat=${lat}&lng=${lng}${vehicleParam}`,
      },
      {
        state: { returnNavigation },
      },
    );
  };

  return (
    <div data-testid={testid}>
      <InfoClickableChipValue
        label={label}
        onNavigate={handleNavigate}
        onCopy={() => copyContent(label, () => {})}
        theme={theme}
        compact={compact}
      />
    </div>
  );
};
