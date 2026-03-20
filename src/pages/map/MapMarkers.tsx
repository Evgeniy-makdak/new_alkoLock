/* eslint-disable no-console */

/* eslint-disable react-hooks/exhaustive-deps */

/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import L from 'leaflet';

import { MonitoringDevicesApi } from '@shared/api/baseQuerys';

import { useMapContext } from './MapContext';
import { VehiclePopup, type VehiclePopupLabels } from './VehiclePopup';
import { VehicleEventsGroup } from './types';

type MapMarkersProps = {
  map: L.Map | null;
  events: VehicleEventsGroup[];
  numberedMode?: boolean;
  listItemClickedVehicleId?: string | null;
  onListItemClickedProcessed?: () => void;
  openedPopupVehicleId: string | null;
  setOpenedPopupVehicleId: (id: string | null) => void;
  setSelectedVehicleId: (id: string | null) => void;
  onMarkerClick: (vehicleId: string, lat?: number, lng?: number) => void;
  onViewAllEventsWithCoords?: (
    vehicleId: string,
    markerCoords: { lat: number; lng: number },
  ) => void;
  clickedVehicleEvents: VehicleEventsGroup[];
  onCloseAllPanels?: () => void;
  popupRef: React.MutableRefObject<L.Popup | null>;
  freezeMarkers?: boolean;
};

export const MapMarkers = ({
  map,
  events,
  numberedMode = false,
  listItemClickedVehicleId = null,
  onListItemClickedProcessed,
  openedPopupVehicleId,
  setOpenedPopupVehicleId,
  setSelectedVehicleId,
  onMarkerClick,
  onViewAllEventsWithCoords,
  clickedVehicleEvents,
  onCloseAllPanels,
  popupRef: externalPopupRef,
  freezeMarkers = false,
}: MapMarkersProps): JSX.Element => {
  const { t, i18n } = useTranslation();
  const dateLocale = useMemo(() => {
    const map: Record<string, string> = {
      ru: 'ru-RU',
      en: 'en-US',
      kk: 'kk-KZ',
      ky: 'ky-KG',
      be: 'be-BY',
      uz: 'uz-UZ',
    };
    return map[i18n.language] || i18n.language;
  }, [i18n.language]);

  const vehiclePopupLabels = useMemo(
    () => ({
      closeTitle: t('map.popup.closeTitle'),
      noData: t('map.popup.noData'),
      mode: t('map.popup.mode'),
      status: t('map.popup.status'),
      online: t('map.popup.online'),
      offline: t('map.popup.offline'),
      alcolockPrefix: t('map.popup.alcolockPrefix'),
      driverPrefix: t('map.popup.driverPrefix'),
      unknownDriver: t('map.popup.unknownDriver'),
      addressUnknown: t('map.popup.addressUnknown'),
      addressLoading: t('map.popup.addressLoading'),
      noCoordinates: t('map.popup.noCoordinates'),
      unknownEvent: t('map.popup.unknownEvent'),
      viewAllEvents: t('map.popup.viewAllEvents'),
    }),
    [t],
  );

  const markersRef = useRef<L.Marker[]>([]);
  const prevEventsRef = useRef<VehicleEventsGroup[]>([]);
  const [, setForceUpdate] = useState(0);
  const popupRef = useRef<L.Popup | null>(null);
  const pendingPopupRef = useRef<VehicleEventsGroup | null>(null);
  const { vehicleModes, setVehicleMode } = useMapContext();
  const popupDataRef = useRef<VehicleEventsGroup | null>(null);
  const deviceStatusCacheRef = useRef<Record<string, boolean>>({});
  const lastKnownDeviceStatusByVehicleRef = useRef<Record<string, boolean>>({});
  const lastResolvedDeviceIdByVehicleRef = useRef<Record<string, string>>({});
  const popupRequestIdRef = useRef<number>(0);
  const suppressNextAutoPopupForRef = useRef<string | null>(null);
  const deviceStatusIntervalRef = useRef<number | null>(null);
  const DEVICE_STATUS_REFRESH_MS = 10000;

  const getVehicleIconPath = (vehicleType?: string, vehicleColor?: string): string => {
    const type = (vehicleType || 'PERSONAL').toUpperCase();
    const color = (vehicleColor || 'GRAY').toLowerCase();

    const validTypes = [
      'PASSENGER',
      'PERSONAL',
      'FREIGHT',
      'SHARED',
      'OTHER',
      'AGRICULTURAL',
      'TAXI',
    ];
    const normalizedType = validTypes.includes(type) ? type.toLowerCase() : 'personal';

    const validColors = [
      'beige',
      'white',
      'yellow',
      'green',
      'brown',
      'red',
      'orange',
      'grey',
      'gray',
      'blue',
      'violet',
      'black',
    ];
    const normalizedColor = validColors.includes(color) ? color : 'grey';
    const colorForPath = normalizedColor === 'gray' ? 'grey' : normalizedColor;

    if (normalizedType === 'shared' || normalizedType === 'other') {
      return require(`./images/taxi/taxi_${colorForPath}.svg`);
    }

    return require(`./images/${normalizedType}/${normalizedType}_${colorForPath}.svg`);
  };

  const getIconDimensions = () => {
    const PIN_TIP_HEIGHT = 10;
    const circleW = 64;
    const circleH = 56;
    const h = circleH + PIN_TIP_HEIGHT;
    return { size: [circleW, h] as [number, number], anchor: [circleW / 2, h] as [number, number] };
  };

  const createCarIconElement = (
    mode?: string,
    vehicleType?: string,
    vehicleColor?: string,
  ): HTMLDivElement => {
    const typeLower = vehicleType?.toLowerCase() || '';
    const hasLabel = typeLower === 'taxi' || typeLower === 'shared' || typeLower === 'other';
    const circleWidth = 64;

    const iconElement = document.createElement('div');
    iconElement.style.display = 'flex';
    iconElement.style.flexDirection = 'column';
    iconElement.style.alignItems = 'center';
    iconElement.style.width = `${circleWidth}px`;

    const iconContainer = document.createElement('div');
    iconContainer.style.display = 'flex';
    iconContainer.style.justifyContent = 'center';
    iconContainer.style.alignItems = 'center';
    iconContainer.style.background = 'none';
    iconContainer.style.borderRadius = '50%';

    const normalizedMode =
      mode === 'Рабочий' || mode === 'Аварийный' || mode === 'Сервисный' ? mode : undefined;
    let borderColor = '#1976d2';
    if (normalizedMode === 'Рабочий') borderColor = '#2e7d32';
    else if (normalizedMode === 'Аварийный') borderColor = '#d32f2f';
    else if (normalizedMode === 'Сервисный') borderColor = '#ed6c02';

    iconContainer.style.border = `2.5px solid ${borderColor}`;
    iconContainer.style.width = `${circleWidth}px`;
    iconContainer.style.height = '56px';
    iconContainer.style.boxShadow = '0 2px 8px rgba(0,0,0,0.2)';
    iconContainer.style.background = 'rgba(255,255,255,0.95)';

    const iconPath = getVehicleIconPath(vehicleType, vehicleColor);
    const iconSize = hasLabel ? 28 : 20;

    const img = document.createElement('img');
    img.src = iconPath;
    img.width = iconSize;
    img.height = iconSize;
    img.style.display = 'block';
    img.alt = '';
    img.onerror = () => {
      console.error('Failed to load vehicle icon:', iconPath);
      img.style.display = 'none';
    };

    iconContainer.appendChild(img);

    if (hasLabel) {
      iconContainer.style.flexDirection = 'column';
      iconContainer.style.gap = '0';
      iconContainer.style.padding = '2px';
      const labelText =
        typeLower === 'taxi' ? 'ТАКСИ' : typeLower === 'shared' ? 'КАРШЕРИНГ' : 'ПРОЧЕЕ';
      const pathId = `arc-${Math.random().toString(36).slice(2)}`;
      const labelSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      labelSvg.setAttribute('viewBox', '0 0 64 20');
      labelSvg.setAttribute('width', '64');
      labelSvg.setAttribute('height', '20');
      labelSvg.style.display = 'block';
      labelSvg.style.overflow = 'visible';
      labelSvg.innerHTML = `
        <defs>
          <path id="${pathId}" d="M 2,5 Q 32,22 62,5" />
        </defs>
        <text fill="#333" font-size="10" font-weight="600" text-anchor="middle">
          <textPath href="#${pathId}" startOffset="50%" text-anchor="middle">${labelText}</textPath>
        </text>
      `;
      iconContainer.appendChild(labelSvg);
    }

    iconElement.appendChild(iconContainer);

    const pinTip = document.createElement('div');
    pinTip.style.width = '0';
    pinTip.style.height = '0';
    pinTip.style.borderLeft = '7px solid transparent';
    pinTip.style.borderRight = '7px solid transparent';
    pinTip.style.borderTop = `10px solid ${borderColor}`;
    pinTip.style.marginTop = '-2px';
    iconElement.appendChild(pinTip);

    return iconElement;
  };

  // Форматирование номера: A 123 BC 77 -> firstLetter, digits, lastLetters, region
  const formatPlateParts = (
    reg: string,
  ): {
    firstLetter: string;
    digits: string;
    lastLetters: string;
    region: string;
  } => {
    const s = (reg || '').trim().replace(/\s/g, '').toUpperCase();
    if (s.length >= 6) {
      return {
        firstLetter: s[0] || '?',
        digits: s.slice(1, 4),
        lastLetters: s.slice(4, 6),
        region: s.slice(6) || '77',
      };
    }
    return { firstLetter: s[0] || '?', digits: '', lastLetters: s.slice(1) || '', region: '77' };
  };

  // Стилизация под российский номерной знак: белая обводка, чёрная рамка отступом внутрь
  const createRegistrationNumberIconElement = (
    registrationNumber: string,
    isSelected: boolean,
  ): HTMLDivElement => {
    const { firstLetter, digits, lastLetters, region } = formatPlateParts(registrationNumber);
    const innerHeight = 32;
    const rightWidth = 38 + Math.max(0, (region.length - 2) * 8);
    const leftWidth = Math.max(
      85,
      firstLetter.length * 8 + digits.length * 10 + lastLetters.length * 8 + 24,
    );
    const innerWidth = leftWidth + 2 + rightWidth;
    const padding = 4;
    const borderWidth = 2;
    const totalWidth = innerWidth + padding * 2 + borderWidth * 2;
    const totalHeight = innerHeight + padding * 2 + borderWidth * 2;

    const outer = document.createElement('div');
    outer.style.display = 'flex';
    outer.style.width = `${totalWidth}px`;
    outer.style.height = `${totalHeight}px`;
    outer.style.padding = `${padding}px`;
    outer.style.backgroundColor = '#ffffff';
    outer.style.borderRadius = '3px';
    outer.style.boxShadow = '0 2px 6px rgba(0,0,0,0.25)';

    const inner = document.createElement('div');
    inner.style.display = 'flex';
    inner.style.flex = '1';
    inner.style.border = `2px solid ${isSelected ? '#d32f2f' : '#000000'}`;
    inner.style.borderRadius = '2px';
    inner.style.overflow = 'hidden';
    inner.style.backgroundColor = '#ffffff';

    const leftPart = document.createElement('div');
    leftPart.style.flex = '1';
    leftPart.style.display = 'flex';
    leftPart.style.alignItems = 'center';
    leftPart.style.justifyContent = 'center';
    leftPart.style.padding = '0 6px';
    leftPart.style.gap = '4px';
    leftPart.style.backgroundColor = '#ffffff';
    leftPart.style.color = '#000000';
    leftPart.style.fontWeight = '800';
    leftPart.style.letterSpacing = '1px';
    leftPart.style.fontFamily = 'Arial, sans-serif';
    leftPart.style.whiteSpace = 'nowrap';
    const digitSize = '15px';
    const letterSize = '12px';
    const addSpan = (text: string, size: string) => {
      const span = document.createElement('span');
      span.style.fontSize = size;
      span.style.fontWeight = '800';
      span.style.letterSpacing = '1px';
      span.style.fontFamily = 'Arial, sans-serif';
      span.textContent = text;
      leftPart.appendChild(span);
    };
    addSpan(firstLetter, letterSize);
    addSpan(digits, digitSize);
    addSpan(lastLetters, letterSize);

    const separator = document.createElement('div');
    separator.style.width = '2px';
    separator.style.backgroundColor = '#000000';
    separator.style.flexShrink = '0';

    const rightPart = document.createElement('div');
    rightPart.style.width = `${rightWidth}px`;
    rightPart.style.display = 'flex';
    rightPart.style.flexDirection = 'column';
    rightPart.style.alignItems = 'center';
    rightPart.style.justifyContent = 'center';
    rightPart.style.padding = '2px 2px';
    rightPart.style.backgroundColor = '#ffffff';
    rightPart.style.color = '#000000';
    rightPart.style.flexShrink = '0';
    rightPart.style.gap = '0';
    rightPart.style.borderLeft = 'none';

    const regionEl = document.createElement('div');
    regionEl.style.fontSize = '15px';
    regionEl.style.fontWeight = '800';
    regionEl.style.letterSpacing = '1px';
    regionEl.style.fontFamily = 'Arial, sans-serif';
    regionEl.style.lineHeight = '1';
    regionEl.textContent = region;

    const rusRow = document.createElement('div');
    rusRow.style.display = 'flex';
    rusRow.style.alignItems = 'center';
    rusRow.style.gap = '2px';
    rusRow.style.marginTop = '1px';

    const rusText = document.createElement('span');
    rusText.style.fontSize = '8px';
    rusText.style.fontWeight = '700';
    rusText.textContent = 'RUS';

    const flag = document.createElement('div');
    flag.style.width = '10px';
    flag.style.height = '8px';
    flag.style.display = 'flex';
    flag.style.flexDirection = 'column';
    flag.style.overflow = 'hidden';
    flag.style.borderRadius = '1px';
    flag.style.flexShrink = '0';
    ['#fff', '#0039a6', '#d52b1e'].forEach((bg) => {
      const stripe = document.createElement('div');
      stripe.style.height = '2.67px';
      stripe.style.minHeight = '2px';
      stripe.style.backgroundColor = bg;
      flag.appendChild(stripe);
    });

    rusRow.appendChild(rusText);
    rusRow.appendChild(flag);
    rightPart.appendChild(regionEl);
    rightPart.appendChild(rusRow);
    inner.appendChild(leftPart);
    inner.appendChild(separator);
    inner.appendChild(rightPart);
    outer.appendChild(inner);
    return outer;
  };

  const getNumberedIconDimensions = (registrationNumber?: string) => {
    const { firstLetter, digits, lastLetters, region } = formatPlateParts(registrationNumber || '');
    const innerHeight = 32;
    const rightWidth = 38 + Math.max(0, (region.length - 2) * 8);
    const leftWidth = Math.max(
      85,
      firstLetter.length * 8 + digits.length * 10 + lastLetters.length * 8 + 24,
    );
    const innerWidth = leftWidth + 2 + rightWidth;
    const padding = 4;
    const borderWidth = 2;
    const width = innerWidth + padding * 2 + borderWidth * 2;
    const height = innerHeight + padding * 2 + borderWidth * 2;
    return {
      size: [width, height] as [number, number],
      anchor: [width / 2, height] as [number, number],
    };
  };

  const getEventColor = useCallback((eventType: string): string => {
    if (eventType.includes('Тестирование пройдено')) return '#2e7d32';
    if (eventType.includes('Тестирование не пройдено')) return '#d32f2f';
    if (eventType.includes('Тестирование прервано')) return '#ed6c02';
    return '#000000';
  }, []);

  const formatDate = useCallback(
    (dateString: string): string => {
      if (!dateString) return t('map.popup.noData');
      try {
        const date = new Date(dateString);
        return date.toLocaleString(dateLocale, {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        });
      } catch {
        return dateString;
      }
    },
    [dateLocale, t],
  );

  /** Актуально для колбэка setInterval опроса статуса (замыкание иначе держит локаль с момента открытия попапа). */
  const popupI18nRef = useRef<{
    labels: VehiclePopupLabels;
    acceptLanguage: string;
    formatDate: (dateString: string) => string;
    getEventColor: (eventType: string) => string;
    vehicleModes: Record<string, string | undefined>;
  }>({
    labels: vehiclePopupLabels,
    acceptLanguage: i18n.language,
    formatDate,
    getEventColor,
    vehicleModes,
  });
  popupI18nRef.current.labels = vehiclePopupLabels;
  popupI18nRef.current.acceptLanguage = i18n.language;
  popupI18nRef.current.formatDate = formatDate;
  popupI18nRef.current.getEventColor = getEventColor;
  popupI18nRef.current.vehicleModes = vehicleModes;

  const getDeviceStatus = async (
    deviceId: string,
    options?: { force?: boolean },
  ): Promise<boolean> => {
    const force = options?.force === true;
    const validId = deviceId != null && String(deviceId).trim() !== '';
    if (!validId) return false;
    if (!force && deviceStatusCacheRef.current[deviceId] !== undefined) {
      return deviceStatusCacheRef.current[deviceId];
    }
    try {
      const response = await MonitoringDevicesApi.getDeviceStatus(deviceId);
      const status = response?.data;
      if (typeof status === 'boolean') {
        deviceStatusCacheRef.current[deviceId] = status;
        return status;
      }
      return false;
    } catch {
      if (deviceStatusCacheRef.current[deviceId] !== undefined) {
        return deviceStatusCacheRef.current[deviceId];
      }
      return false;
    }
  };

  const createDetachedPopup = useCallback(
    async (
      event: VehicleEventsGroup,
      options?: { forceStatusRefresh?: boolean },
    ): Promise<void> => {
      if (!map) return;

      // Не создавать попап с неполными данными (нет eventType) — VehiclePopup вернёт null
      // Ждём clickedVehicleEvents из loadVehicleEvents, useEffect создаст попап
      if (!event.events[0]?.eventType?.trim?.()) {
        return;
      }

      const currentRequestId = ++popupRequestIdRef.current;

      const vehicleId = event.vehicle?.registrationNumber;
      const modeFromEvent =
        event.vehicle?.monitoringDevice?.mode || event.events[0]?.action?.device?.mode;
      const currentMode = modeFromEvent ?? (vehicleId ? vehicleModes[vehicleId] : undefined);

      const updatedEvent: VehicleEventsGroup = {
        ...event,
        mode: currentMode,
        vehicle: {
          ...event.vehicle,
          monitoringDevice: {
            ...event.vehicle?.monitoringDevice,
            mode: currentMode,
          },
        },
      };

      popupDataRef.current = updatedEvent;

      if (popupRef.current) {
        popupRef.current.remove();
        popupRef.current = null;
      }
      if (deviceStatusIntervalRef.current !== null) {
        window.clearInterval(deviceStatusIntervalRef.current);
        deviceStatusIntervalRef.current = null;
      }

      const popup = L.popup({
        closeOnClick: false,
        autoClose: false,
        closeButton: false,
        minWidth: 250,
        maxWidth: 350,
        className: 'custom-popup',
        autoPan: false,
        offset: numberedMode ? [0, -20] : [0, -20],
      });
      externalPopupRef.current = popup;

      const resolvedDeviceId =
        (updatedEvent.vehicle?.monitoringDevice as any)?.id ||
        updatedEvent.events.find((ev) => ev?.action?.device?.id)?.action?.device?.id ||
        updatedEvent.events[0]?.action?.device?.id;

      const lastKnownVehicleStatus = vehicleId
        ? lastKnownDeviceStatusByVehicleRef.current[vehicleId]
        : undefined;
      let deviceStatus = lastKnownVehicleStatus ?? false;
      if (resolvedDeviceId && vehicleId) {
        lastResolvedDeviceIdByVehicleRef.current[vehicleId] = resolvedDeviceId;
      }

      if (resolvedDeviceId) {
        const freshStatus = await getDeviceStatus(resolvedDeviceId, {
          force: options?.forceStatusRefresh === true,
        });
        if (currentRequestId !== popupRequestIdRef.current) {
          return;
        }
        deviceStatus = freshStatus;
        if (vehicleId) {
          lastKnownDeviceStatusByVehicleRef.current[vehicleId] = freshStatus;
        }
      }

      const marker = markersRef.current.find(
        (m) => (m as any)._event?.vehicle?.registrationNumber === vehicleId,
      );
      const markerCoords = marker?.getLatLng();

      if (currentRequestId !== popupRequestIdRef.current) {
        return;
      }

      popup.setContent(
        VehiclePopup({
          event: {
            vehicle: updatedEvent.vehicle,
            events: updatedEvent.events,
            latitude: markerCoords?.lat ?? updatedEvent.latitude,
            longitude: markerCoords?.lng ?? updatedEvent.longitude,
            mode: currentMode,
          },
          labels: vehiclePopupLabels,
          acceptLanguage: i18n.language,
          getEventColor,
          formatDate,
          onClose: () => {
            popup.remove();
            setOpenedPopupVehicleId(null);
            setSelectedVehicleId(null);
            popupRef.current = null;
            pendingPopupRef.current = null;
            popupDataRef.current = null;
            if (deviceStatusIntervalRef.current !== null) {
              window.clearInterval(deviceStatusIntervalRef.current);
              deviceStatusIntervalRef.current = null;
            }
            onCloseAllPanels?.();
          },
          onViewAllEvents: (coords) => {
            if (coords) onViewAllEventsWithCoords?.(vehicleId, coords);
            setSelectedVehicleId(vehicleId || null);
          },
          deviceStatus,
          key: `popup-${vehicleId}-${Date.now()}`,
        }),
      );

      const popupPosition = markerCoords ?? map.getCenter();

      if (currentRequestId !== popupRequestIdRef.current) {
        return;
      }

      popup.setLatLng(popupPosition);
      popup.openOn(map);
      popupRef.current = popup;

      deviceStatusIntervalRef.current = window.setInterval(async () => {
        if (currentRequestId !== popupRequestIdRef.current) {
          if (deviceStatusIntervalRef.current !== null) {
            window.clearInterval(deviceStatusIntervalRef.current);
            deviceStatusIntervalRef.current = null;
          }
          return;
        }

        try {
          const currentPopupData = popupDataRef.current;
          const currentVehicleId = currentPopupData?.vehicle?.registrationNumber || vehicleId;
          const currentResolvedDeviceId =
            (currentPopupData?.vehicle?.monitoringDevice as any)?.id ||
            currentPopupData?.events.find((ev) => ev?.action?.device?.id)?.action?.device?.id ||
            currentPopupData?.events[0]?.action?.device?.id ||
            (currentVehicleId
              ? lastResolvedDeviceIdByVehicleRef.current[currentVehicleId]
              : undefined) ||
            resolvedDeviceId;

          if (!currentResolvedDeviceId) return;

          if (currentVehicleId) {
            lastResolvedDeviceIdByVehicleRef.current[currentVehicleId] = currentResolvedDeviceId;
          }

          const refreshed = await getDeviceStatus(currentResolvedDeviceId, { force: true });
          if (
            currentRequestId !== popupRequestIdRef.current ||
            !popupRef.current ||
            !popupDataRef.current ||
            (currentVehicleId &&
              currentVehicleId !== popupDataRef.current.vehicle?.registrationNumber)
          ) {
            return;
          }

          if (currentVehicleId) {
            lastKnownDeviceStatusByVehicleRef.current[currentVehicleId] = refreshed;
          }

          const currentMarker = markersRef.current.find(
            (m) => (m as any)._event?.vehicle?.registrationNumber === currentVehicleId,
          );
          const currentCoords = currentMarker?.getLatLng();

          const markerEvent = currentMarker ? (currentMarker as any)._event : null;
          const modeFromMarker =
            markerEvent?.vehicle?.monitoringDevice?.mode ||
            markerEvent?.events?.[0]?.action?.device?.mode;
          const i18nSnap = popupI18nRef.current;
          const updatedMode =
            modeFromMarker ??
            (currentVehicleId ? i18nSnap.vehicleModes[currentVehicleId] : undefined);

          const updatedEventForPopup = {
            ...popupDataRef.current,
            mode: updatedMode,
            vehicle: {
              ...popupDataRef.current.vehicle,
              monitoringDevice: {
                ...popupDataRef.current.vehicle?.monitoringDevice,
                mode: updatedMode,
              },
            },
          };

          popupRef.current.setContent(
            VehiclePopup({
              event: {
                vehicle: updatedEventForPopup.vehicle,
                events: updatedEventForPopup.events,
                latitude: currentCoords?.lat ?? updatedEventForPopup.latitude,
                longitude: currentCoords?.lng ?? updatedEventForPopup.longitude,
                mode: updatedMode,
              },
              labels: i18nSnap.labels,
              acceptLanguage: i18nSnap.acceptLanguage,
              getEventColor: i18nSnap.getEventColor,
              formatDate: i18nSnap.formatDate,
              onClose: () => {
                popupRef.current?.remove();
                setOpenedPopupVehicleId(null);
                setSelectedVehicleId(null);
                popupRef.current = null;
                pendingPopupRef.current = null;
                popupDataRef.current = null;
                if (deviceStatusIntervalRef.current !== null) {
                  window.clearInterval(deviceStatusIntervalRef.current);
                  deviceStatusIntervalRef.current = null;
                }
                onCloseAllPanels?.();
              },
              onViewAllEvents: (coords) => {
                if (coords) onViewAllEventsWithCoords?.(currentVehicleId, coords);
                setSelectedVehicleId(currentVehicleId || null);
              },
              deviceStatus: refreshed,
              key: `popup-${currentVehicleId}-${Date.now()}`,
            }),
          );
        } catch (e) {
          // Ошибки опрашивания молча пропускаем
        }
      }, DEVICE_STATUS_REFRESH_MS);
    },
    [
      map,
      vehicleModes,
      numberedMode,
      setOpenedPopupVehicleId,
      setSelectedVehicleId,
      onCloseAllPanels,
      vehiclePopupLabels,
      i18n.language,
      formatDate,
      getEventColor,
      onViewAllEventsWithCoords,
    ],
  );

  const refreshOpenPopup = useCallback(() => {
    if (!popupRef.current || !popupDataRef.current) return;

    const vehicleId = popupDataRef.current.vehicle?.registrationNumber;
    if (!vehicleId) return;

    const modeFromEvent =
      popupDataRef.current.vehicle?.monitoringDevice?.mode ||
      popupDataRef.current.events[0]?.action?.device?.mode;
    const currentMode = modeFromEvent ?? vehicleModes[vehicleId];
    const marker = markersRef.current.find(
      (m) => (m as any)._event?.vehicle?.registrationNumber === vehicleId,
    );
    const markerCoords = marker?.getLatLng();

    popupDataRef.current = {
      ...popupDataRef.current,
      mode: currentMode,
      vehicle: {
        ...popupDataRef.current.vehicle,
        monitoringDevice: {
          ...popupDataRef.current.vehicle?.monitoringDevice,
          mode: currentMode,
        },
      },
    };

    const resolvedDeviceId =
      (popupDataRef.current.vehicle?.monitoringDevice as any)?.id ||
      popupDataRef.current.events.find((ev) => ev?.action?.device?.id)?.action?.device?.id ||
      popupDataRef.current.events[0]?.action?.device?.id;

    const updatePopupContent = (deviceStatus: boolean) => {
      popupRef.current?.setContent(
        VehiclePopup({
          event: {
            vehicle: popupDataRef.current!.vehicle,
            events: popupDataRef.current!.events,
            latitude: markerCoords?.lat ?? popupDataRef.current!.latitude,
            longitude: markerCoords?.lng ?? popupDataRef.current!.longitude,
            mode: currentMode,
          },
          labels: vehiclePopupLabels,
          acceptLanguage: i18n.language,
          getEventColor,
          formatDate,
          onClose: () => {
            popupRef.current?.remove();
            setOpenedPopupVehicleId(null);
            setSelectedVehicleId(null);
            popupRef.current = null;
            pendingPopupRef.current = null;
            popupDataRef.current = null;
            if (deviceStatusIntervalRef.current !== null) {
              window.clearInterval(deviceStatusIntervalRef.current);
              deviceStatusIntervalRef.current = null;
            }
            onCloseAllPanels?.();
          },
          onViewAllEvents: (coords) => {
            if (coords) onViewAllEventsWithCoords?.(vehicleId, coords);
            setSelectedVehicleId(vehicleId || null);
          },
          deviceStatus,
          key: `popup-${vehicleId}-${Date.now()}`,
        }),
      );
    };

    if (resolvedDeviceId) {
      getDeviceStatus(String(resolvedDeviceId), { force: true }).then(updatePopupContent);
    } else {
      updatePopupContent(false);
    }
  }, [
    vehicleModes,
    setOpenedPopupVehicleId,
    setSelectedVehicleId,
    onCloseAllPanels,
    onViewAllEventsWithCoords,
    vehiclePopupLabels,
    i18n.language,
    formatDate,
    getEventColor,
  ]);

  /** Leaflet-попап — отдельный DOM; при смене языка пересобираем контент (подписи, Nominatim). */
  useEffect(() => {
    if (!popupRef.current || !popupDataRef.current) return;
    refreshOpenPopup();
    // только i18n.language: не привязываем refreshOpenPopup (иначе лишние обновления при vehicleModes и т.д.)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i18n.language]);

  useEffect(() => {
    if (!map) return;

    const handleMapMove = () => {
      if (popupRef.current && popupDataRef.current) {
        const marker = markersRef.current.find(
          (m) => (m as any)._event?.vehicle?.registrationNumber === openedPopupVehicleId,
        );
        if (marker) {
          popupRef.current.setLatLng(marker.getLatLng());
        }
      }
    };

    map.on('move', handleMapMove);
    map.on('zoom', handleMapMove);

    return () => {
      map.off('move', handleMapMove);
      map.off('zoom', handleMapMove);
    };
  }, [map, openedPopupVehicleId]);

  useEffect(() => {
    if (!map) return;

    // Приоритет: клик по списку — используем данные из clickedVehicleEvents (с eventType и т.д.)
    // Маркерные события из latestEvents не содержат eventType, поэтому попап был бы пустым
    if (pendingPopupRef.current && clickedVehicleEvents.length > 0) {
      const vehicleId = pendingPopupRef.current.vehicle?.registrationNumber;
      const fullEventData = clickedVehicleEvents.find(
        (ev) => ev.vehicle?.registrationNumber === vehicleId,
      );
      if (fullEventData) {
        createDetachedPopup(fullEventData);
        pendingPopupRef.current = null;
        onListItemClickedProcessed?.();
        return;
      }
    }

    // Не создавать попап из маркера, если ждём данные по клику списка (маркерные данные неполные)
    if (pendingPopupRef.current) return;

    // При открытом попапе НЕ вызываем createDetachedPopup при изменении events —
    // он удаляет попап и может не пересоздать (event без eventType). Позиция обновляется в handleMapMove.
    // Контент обновляется через refreshOpenPopup при изменении vehicleModes.
  }, [
    clickedVehicleEvents,
    createDetachedPopup,
    map,
    openedPopupVehicleId,
    onListItemClickedProcessed,
  ]);

  useEffect(() => {
    if (listItemClickedVehicleId && events.length > 0) {
      const event = events.find((e) => e.vehicle?.registrationNumber === listItemClickedVehicleId);
      if (event) {
        pendingPopupRef.current = event;
      }
    }
  }, [listItemClickedVehicleId, events]);

  useEffect(() => {
    events.forEach((event) => {
      const vehicleId = event.vehicle?.registrationNumber;
      if (!vehicleId) return;

      const deviceMode =
        event.vehicle?.monitoringDevice?.mode || event.events[0]?.action?.device?.mode;

      if (vehicleModes[vehicleId] !== deviceMode) {
        setVehicleMode(vehicleId, deviceMode);
      }
    });
  }, [events, vehicleModes, setVehicleMode]);

  useEffect(() => {
    if (!map || !openedPopupVehicleId) return;

    const currentVehicleId = openedPopupVehicleId;
    const currentMode = vehicleModes[currentVehicleId];

    const marker = markersRef.current.find(
      (m) => (m as any)._event?.vehicle?.registrationNumber === currentVehicleId,
    );

    if (marker) {
      const markerMode = (marker as any)._currentMode;

      if (markerMode !== currentMode) {
        (marker as any)._currentMode = currentMode;
        if (
          popupRef.current &&
          popupDataRef.current?.vehicle?.registrationNumber === currentVehicleId
        ) {
          refreshOpenPopup();
        }
      }
    }
  }, [vehicleModes, openedPopupVehicleId, map, refreshOpenPopup]);

  useEffect(() => {
    if (!map || freezeMarkers) return;
    map.options.closePopupOnClick = false;

    let currentOpenedVehicleId: string | null = null;
    const currentOpenedMarker = markersRef.current.find((marker) => marker.isPopupOpen());
    const markersWithOpenTooltips = markersRef.current.filter(
      (marker) => (marker as any)._tooltipOpen,
    );

    if (currentOpenedMarker) {
      const popupContent = currentOpenedMarker.getPopup()?.getContent();
      if (popupContent && typeof popupContent !== 'string') {
        const vehicleNameElement = (popupContent as HTMLElement).querySelector('b');
        currentOpenedVehicleId = vehicleNameElement?.textContent || null;
      }
    }

    const existingMarkersMap = new Map<string, L.Marker>();
    markersRef.current.forEach((marker) => {
      const event = (marker as any)._event as VehicleEventsGroup;
      if (event?.vehicle?.registrationNumber) {
        existingMarkersMap.set(event.vehicle.registrationNumber, marker);
      }
    });

    // При клике на элемент списка — показываем только выбранный номерной знак на карте
    let eventsToShow =
      numberedMode && openedPopupVehicleId
        ? events.filter((e) => e.vehicle?.registrationNumber === openedPopupVehicleId)
        : events;

    // При перемещении карты выбранное ТС может выйти за bounds — подставляем из clickedVehicleEvents
    if (openedPopupVehicleId && clickedVehicleEvents.length > 0) {
      const selectedInEvents = eventsToShow.some(
        (e) => e.vehicle?.registrationNumber === openedPopupVehicleId,
      );
      if (!selectedInEvents) {
        const fromClicked = clickedVehicleEvents.find(
          (e) => e.vehicle?.registrationNumber === openedPopupVehicleId,
        );
        if (fromClicked) {
          eventsToShow = numberedMode ? [fromClicked] : [...eventsToShow, fromClicked];
        }
      }
    }

    const newEventsMap = new Map<string, VehicleEventsGroup>();
    eventsToShow.forEach((event) => {
      if (event.vehicle?.registrationNumber) {
        newEventsMap.set(event.vehicle.registrationNumber, event);
      }
    });

    const getIconForEvent = (vehicleId: string, newEvent: VehicleEventsGroup, newMode?: string) => {
      if (numberedMode) {
        const isSelected = vehicleId === openedPopupVehicleId;
        const dims = getNumberedIconDimensions(vehicleId);
        return L.divIcon({
          html: createRegistrationNumberIconElement(vehicleId, isSelected).outerHTML,
          iconSize: dims.size,
          iconAnchor: dims.anchor,
          className: 'custom-car-icon',
        });
      }
      const dims = getIconDimensions();
      return L.divIcon({
        html: createCarIconElement(newMode, newEvent.vehicle?.type, newEvent.vehicle?.color)
          .outerHTML,
        iconSize: dims.size,
        iconAnchor: dims.anchor,
        className: 'custom-car-icon',
      });
    };

    const markersToKeep: L.Marker[] = [];
    existingMarkersMap.forEach((marker, vehicleId) => {
      if (newEventsMap.has(vehicleId)) {
        const newEvent = newEventsMap.get(vehicleId)!;
        const currentEvent = (marker as any)._event as VehicleEventsGroup;

        if (newEvent) {
          const wasTooltipOpen = (marker as any)._tooltipOpen;
          const currentMode = (marker as any)._currentMode;
          let newMode =
            newEvent?.events[0]?.action?.device?.mode || newEvent.vehicle?.monitoringDevice?.mode;

          // При перемещении карты с открытым тултипом выбранное ТС может выйти за bounds.
          // newEvent из clickedVehicleEvents может не содержать type, color, mode — сохраняем текущие.
          const mergedEvent: VehicleEventsGroup =
            currentEvent && vehicleId === openedPopupVehicleId
              ? {
                  ...newEvent,
                  vehicle: {
                    ...newEvent.vehicle,
                    type: newEvent.vehicle?.type ?? currentEvent.vehicle?.type,
                    color: newEvent.vehicle?.color ?? currentEvent.vehicle?.color,
                    monitoringDevice: {
                      ...newEvent.vehicle?.monitoringDevice,
                      mode:
                        newEvent.vehicle?.monitoringDevice?.mode ??
                        currentEvent.vehicle?.monitoringDevice?.mode,
                    },
                  },
                  mode: newEvent.mode ?? currentEvent.mode ?? newMode,
                }
              : newEvent;

          newMode =
            mergedEvent.vehicle?.monitoringDevice?.mode ??
            mergedEvent?.events[0]?.action?.device?.mode ??
            mergedEvent.mode ??
            newMode;

          if (
            mergedEvent.latitude !== currentEvent.latitude ||
            mergedEvent.longitude !== currentEvent.longitude
          ) {
            marker.setLatLng([mergedEvent.latitude, mergedEvent.longitude]);
          }

          const isSelected = vehicleId === openedPopupVehicleId;
          const iconChanged =
            (marker as any)._numberedMode !== numberedMode ||
            (!numberedMode && currentMode !== newMode) ||
            (numberedMode && (marker as any)._isSelected !== isSelected);
          if (iconChanged) {
            (marker as any)._isSelected = isSelected;
            (marker as any)._numberedMode = numberedMode;
            const newIcon = getIconForEvent(vehicleId, mergedEvent, newMode);
            marker.setIcon(newIcon);
            (marker as any)._currentMode = newMode;
          }

          (marker as any)._event = mergedEvent;

          const firstEvent = mergedEvent.events[0];
          const tooltipContent = document.createElement('div');
          const mfr = firstEvent?.action?.vehicleRecord?.manufacturer || '';
          const mdl = firstEvent?.action?.vehicleRecord?.model || '';
          const reg =
            firstEvent?.action?.vehicleRecord?.registrationNumber || t('map.popup.noData');
          const line1 = document.createElement('div');
          line1.textContent = `${mfr} ${mdl} (${reg})`.replace(/\s+/g, ' ').trim();
          const line2 = document.createElement('div');
          line2.textContent = `${t('map.markerTooltipMode')}: ${newMode || t('map.popup.noData')}`;
          tooltipContent.appendChild(line1);
          tooltipContent.appendChild(line2);

          marker.unbindTooltip();
          marker.bindTooltip(tooltipContent, {
            permanent: false,
            direction: 'top',
            offset: numberedMode ? [0, -35] : [0, -35],
            opacity: 0.95,
            className: 'custom-tooltip',
          });

          if (wasTooltipOpen) {
            setTimeout(() => {
              marker.openTooltip();
              (marker as any)._tooltipOpen = true;
            }, 0);
          }

          markersToKeep.push(marker);
          newEventsMap.delete(vehicleId);
        }
      } else {
        if (vehicleId === openedPopupVehicleId) {
          if (popupRef.current) {
            popupRef.current.remove();
            popupRef.current = null;
          }
          externalPopupRef.current = null;
          setOpenedPopupVehicleId(null);
          setSelectedVehicleId(null);
          pendingPopupRef.current = null;
          popupDataRef.current = null;
          if (deviceStatusIntervalRef.current !== null) {
            window.clearInterval(deviceStatusIntervalRef.current);
            deviceStatusIntervalRef.current = null;
          }
        }
        marker.closeTooltip();
        map.removeLayer(marker);
      }
    });

    const newEventsArray = Array.from(newEventsMap.entries());
    newEventsArray.forEach(([vehicleId, event]) => {
      if (!vehicleId) return;

      const deviceMode =
        event.vehicle?.monitoringDevice?.mode || event.events[0]?.action?.device?.mode;
      setVehicleMode(vehicleId, deviceMode);

      if (!event.latitude || !event.longitude) {
        if (openedPopupVehicleId === vehicleId) {
          setTimeout(() => {
            createDetachedPopup(event);
          }, 100);
        }
        return;
      }

      const marker = L.marker([event.latitude, event.longitude], {
        icon: getIconForEvent(vehicleId, event, deviceMode),
      }).addTo(map);

      (marker as any)._event = event;
      (marker as any)._currentMode = deviceMode;
      (marker as any)._numberedMode = numberedMode;
      (marker as any)._isSelected = vehicleId === openedPopupVehicleId;

      const firstEvent = event.events[0];
      const tooltipContent = document.createElement('div');
      const mfr = firstEvent?.action?.vehicleRecord?.manufacturer || '';
      const mdl = firstEvent?.action?.vehicleRecord?.model || '';
      const reg = firstEvent?.action?.vehicleRecord?.registrationNumber || t('map.popup.noData');
      const line1 = document.createElement('div');
      line1.textContent = `${mfr} ${mdl} (${reg})`.replace(/\s+/g, ' ').trim();
      const line2 = document.createElement('div');
      line2.textContent = `${t('map.markerTooltipMode')}: ${deviceMode || t('map.popup.noData')}`;
      tooltipContent.appendChild(line1);
      tooltipContent.appendChild(line2);

      marker.bindTooltip(tooltipContent, {
        permanent: false,
        direction: 'top',
        offset: numberedMode ? [0, -35] : [0, -25],
        opacity: 0.95,
        className: 'custom-tooltip',
      });

      marker.on('tooltipopen', () => {
        (marker as any)._tooltipOpen = true;
      });

      marker.on('tooltipclose', () => {
        (marker as any)._tooltipOpen = false;
      });

      marker.on('click', async (e) => {
        e.originalEvent.stopPropagation();
        onMarkerClick(vehicleId, event?.latitude, event?.longitude);
        pendingPopupRef.current = event;
        setOpenedPopupVehicleId(vehicleId);
        setSelectedVehicleId(null); // Свернуть боковую панель при клике на другой маркер
        onCloseAllPanels();

        suppressNextAutoPopupForRef.current = vehicleId;
        setTimeout(() => {
          if (suppressNextAutoPopupForRef.current === vehicleId) {
            suppressNextAutoPopupForRef.current = null;
          }
        }, 600);

        await createDetachedPopup(event, { forceStatusRefresh: true });
      });

      if (
        (openedPopupVehicleId === vehicleId || currentOpenedVehicleId === vehicleId) &&
        suppressNextAutoPopupForRef.current !== vehicleId
      ) {
        setTimeout(() => {
          if (suppressNextAutoPopupForRef.current !== vehicleId) {
            createDetachedPopup(event);
          }
        }, 300);
      }

      const wasTooltipOpen = markersWithOpenTooltips.some(
        (m) => (m as any)._event?.vehicle?.registrationNumber === vehicleId,
      );
      if (wasTooltipOpen) {
        setTimeout(() => {
          marker.openTooltip();
          (marker as any)._tooltipOpen = true;
        }, 0);
      }

      markersToKeep.push(marker);
    });

    markersRef.current = markersToKeep;
    prevEventsRef.current = events;
    setForceUpdate((prev) => prev + 1);
  }, [
    events,
    numberedMode,
    openedPopupVehicleId,
    clickedVehicleEvents,
    map,
    onMarkerClick,
    freezeMarkers,
    vehicleModes,
    createDetachedPopup,
    setVehicleMode,
    i18n.language,
    t,
  ]);

  return null;
};
