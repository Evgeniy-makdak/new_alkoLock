import { useEffect, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';

import L from 'leaflet';

import { VehicleEventsGroup } from './types';

type MapRoutesProps = {
  map: L.Map | null;
  events: VehicleEventsGroup[];
  selectedVehicleId: string | null;
};

export const MapRoutes = ({ map, events, selectedVehicleId }: MapRoutesProps): null => {
  const { t, i18n } = useTranslation();
  const dateLocale = useMemo(() => {
    const mapLocales: Record<string, string> = {
      ru: 'ru-RU',
      en: 'en-US',
      kk: 'kk-KZ',
      ky: 'ky-KG',
      be: 'be-BY',
      uz: 'uz-UZ',
    };
    return mapLocales[i18n.language] || i18n.language;
  }, [i18n.language]);

  const polylineRef = useRef<L.Polyline | null>(null);
  const eventMarkersRef = useRef<L.Marker[]>([]);

  useEffect(() => {
    if (!map) return;

    // Очищаем предыдущие маркеры и линии
    if (polylineRef.current) {
      map.removeLayer(polylineRef.current);
      polylineRef.current = null;
    }

    eventMarkersRef.current.forEach((marker) => {
      map.removeLayer(marker);
    });
    eventMarkersRef.current = [];

    if (!selectedVehicleId) return;

    const vehicleEvents = events.find((ev) => ev.vehicle?.registrationNumber === selectedVehicleId);

    if (!vehicleEvents || vehicleEvents.events.length < 2) return;

    // Сортируем события по времени (новые сверху)
    const sortedEvents = [...vehicleEvents.events].sort(
      (a, b) => new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime(),
    );

    // Создаем массив координат для полилинии
    const coordinates = sortedEvents
      .filter((event) => event.latitude && event.longitude)
      .map((event) => L.latLng(event.latitude!, event.longitude!));

    if (coordinates.length < 2) return;

    // Создаем линию
    polylineRef.current = L.polyline(coordinates, {
      color: '#1976d2',
      weight: 3,
      opacity: 0.7,
      dashArray: '5, 5',
    }).addTo(map);

    // Создаем маркеры для каждого события
    sortedEvents.forEach((event) => {
      if (!event.latitude || !event.longitude) return;

      const marker = L.marker([event.latitude, event.longitude], {
        icon: L.divIcon({
          html: '<div style="background-color: #1976d2; width: 12px; height: 12px; border-radius: 50%; border: 2px solid white;"></div>',
          iconSize: [16, 16],
          iconAnchor: [8, 8],
          className: 'event-marker',
        }),
      }).addTo(map);

      // Добавляем тултип с информацией о событии
      const tooltipContent = document.createElement('div');
      const typeLine = document.createElement('div');
      typeLine.textContent = event.eventType || t('map.popup.unknownEvent');
      const timeLine = document.createElement('div');
      timeLine.textContent = new Date(event.timestamp || '').toLocaleString(dateLocale);
      tooltipContent.appendChild(typeLine);
      tooltipContent.appendChild(timeLine);

      marker.bindTooltip(tooltipContent, {
        permanent: false,
        direction: 'top',
        opacity: 0.9,
      });

      eventMarkersRef.current.push(marker);
    });

    return () => {
      if (polylineRef.current) {
        map.removeLayer(polylineRef.current);
      }
      eventMarkersRef.current.forEach((marker) => {
        map.removeLayer(marker);
      });
    };
  }, [map, events, selectedVehicleId, t, dateLocale]);

  return null;
};
