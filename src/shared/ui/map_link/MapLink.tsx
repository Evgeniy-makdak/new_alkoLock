import { useLocation, useNavigate } from 'react-router-dom';

import { useTheme } from '@mui/material/styles';

import { InfoClickableChipValue } from '@entities/info/ui/InfoClickableChipValue';
import { RoutePaths } from '@shared/config/routePathsEnum';
import { copyContent } from '@shared/lib/copyText';

interface MapLinkProps {
  latitude: string | number;
  longitude: string | number;
  vehicle?: string;
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

export const MapLink = ({
  latitude,
  longitude,
  vehicle,
  testid,
  returnState,
  compact = false,
}: MapLinkProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const label = formatMapCoordinateLabel(latitude, longitude);

  const handleNavigate = () => {
    const lat = Number(latitude);
    const lng = Number(longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

    const vehicleParam = vehicle ? `&vehicle=${encodeURIComponent(vehicle)}` : '';
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
