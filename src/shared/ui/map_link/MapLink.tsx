import { useNavigate } from 'react-router-dom';

import { RoutePaths } from '@shared/config/routePathsEnum';

import style from './MapLink.module.scss';

interface MapLinkProps {
  latitude: string | number;
  longitude: string | number;
  vehicle?: string;
  testid?: string;
}

export const MapLink = ({ latitude, longitude, vehicle, testid }: MapLinkProps) => {
  const navigate = useNavigate();

  const handleClick = () => {
    const lat = Number(latitude);
    const lng = Number(longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

    const vehicleParam = vehicle ? `&vehicle=${encodeURIComponent(vehicle)}` : '';
    navigate({
      pathname: RoutePaths.map,
      search: `?lat=${lat}&lng=${lng}${vehicleParam}`,
    });
  };

  return (
    <button type="button" data-testid={testid} className={style.mapLink} onClick={handleClick}>
      {latitude} {longitude}
    </button>
  );
};
