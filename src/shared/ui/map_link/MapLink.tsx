import style from './MapLink.module.scss';

interface MapLinkProps {
  latitude: string | number;
  longitude: string | number;
  testid?: string;
}

export const MapLink = ({ latitude, longitude, testid }: MapLinkProps) => {
  const url = `https://yandex.ru/maps/?ll=${longitude},${latitude}&z=10&pt=${longitude},${latitude}`;

  return (
    <a
      data-testid={testid}
      className={style.mapLink}
      target={'_blank'}
      href={url}
      rel="noopener noreferrer">
      {latitude} {longitude}
    </a>
  );
};
