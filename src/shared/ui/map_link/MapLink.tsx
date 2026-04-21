import { useLocation, useNavigate } from 'react-router-dom';

import { RoutePaths } from '@shared/config/routePathsEnum';

import style from './MapLink.module.scss';

interface MapLinkProps {
  latitude: string | number;
  longitude: string | number;
  vehicle?: string;
  testid?: string;
  returnState?: Record<string, unknown>;
}

export const MapLink = ({ latitude, longitude, vehicle, testid, returnState }: MapLinkProps) => {
  const navigate = useNavigate();
  const location = useLocation();

  const handleClick = () => {
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
    navigate({
      pathname: RoutePaths.map,
      search: `?lat=${lat}&lng=${lng}${vehicleParam}`,
    }, {
      state: { returnNavigation },
    });
  };

  return (
    <button type="button" data-testid={testid} className={style.mapLink} onClick={handleClick}>
      {latitude} {longitude}
    </button>
  );
};
