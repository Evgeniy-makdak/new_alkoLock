import { ICONS } from '@shared/const/icons';

import { VehicleEventsGroup } from './types';

/** Строки UI для попапа маркера (передаются из компонента с useTranslation). */
export type VehiclePopupLabels = {
  closeTitle: string;
  noData: string;
  mode: string;
  status: string;
  online: string;
  offline: string;
  alcolockPrefix: string;
  driverPrefix: string;
  unknownDriver: string;
  addressUnknown: string;
  addressLoading: string;
  noCoordinates: string;
  unknownEvent: string;
  viewAllEvents: string;
};

type VehiclePopupProps = {
  event: VehicleEventsGroup;
  labels: VehiclePopupLabels;
  /** BCP-47 / i18n language для Nominatim (Accept-Language). */
  acceptLanguage: string;
  getEventColor: (eventType: string) => string;
  formatDate: (dateString: string) => string;
  onClose: () => void;
  onViewAllEvents: (markerCoords?: { lat: number; lng: number }) => void;
  deviceStatus?: boolean;
  key?: string;
};

// Кэш для результатов геокодирования
const geocodingCache = new Map<string, string>();

// Функция для проверки полноты данных события
const isEventDataComplete = (event: VehicleEventsGroup): boolean => {
  const firstEvent = event.events[0];

  // user.fullName не обязателен — при событиях выключения/снятия водитель скрывается
  if (!firstEvent?.eventType || firstEvent.eventType.trim() === '') {
    console.warn('Event data incomplete: missing eventType');
    return false;
  }

  if (!event.vehicle?.registrationNumber || event.vehicle.registrationNumber.trim() === '') {
    console.warn('Event data incomplete: missing registrationNumber');
    return false;
  }

  // Проверяем координаты
  if (!event.latitude || !event.longitude) {
    console.warn('Event data incomplete: missing coordinates');
    return false;
  }

  return true;
};

const NO_DATA_RU = 'Нет данных';

/** Возвращает CSS-класс для типа события (без инлайновых цветов — тема через CSS). */
function eventTypeClass(eventType: string): string {
  if (eventType.includes('Тестирование пройдено')) return 'vp-event--passed';
  if (eventType.includes('Тестирование не пройдено')) return 'vp-event--failed';
  if (eventType.includes('Тестирование прервано')) return 'vp-event--interrupted';
  return 'vp-event--default';
}

export const VehiclePopup = ({
  event,
  labels,
  acceptLanguage,
  formatDate,
  onClose,
  onViewAllEvents,
  deviceStatus,
  key,
}: VehiclePopupProps) => {
  // Проверяем полноту данных - если данные неполные, возвращаем null
  if (!isEventDataComplete(event)) {
    console.warn('VehiclePopup: incomplete data, returning null');
    return null;
  }

  const popupContent = document.createElement('div');
  // Используем key как data-атрибут для идентификации попапа
  if (key) {
    popupContent.setAttribute('data-popup-key', key);
  }
  popupContent.style.fontSize = '14px';
  popupContent.style.position = 'relative';
  popupContent.style.minWidth = '350px';
  popupContent.style.padding = '4px';
  popupContent.style.paddingTop = '20px';

  const closeButton = document.createElement('span');
  closeButton.innerHTML = '&times;';
  closeButton.className = 'vp-close-btn';
  closeButton.style.position = 'absolute';
  closeButton.style.right = '4px';
  closeButton.style.top = '5px';
  closeButton.style.cursor = 'pointer';
  closeButton.style.fontSize = '20px';
  closeButton.style.fontWeight = 'bold';
  closeButton.style.zIndex = '1000';
  closeButton.setAttribute('title', labels.closeTitle);
  closeButton.setAttribute('aria-label', labels.closeTitle);
  closeButton.addEventListener('click', (e) => {
    e.stopPropagation();
    onClose();
  });

  const vehicleName = document.createElement('b');
  vehicleName.textContent = `${event.vehicle?.manufacturer || ''} ${event.vehicle?.model || ''} (${event.vehicle?.registrationNumber || labels.noData})`;

  const infoContainer = document.createElement('div');
  infoContainer.style.marginTop = '4px';

  const createSvgIcon = (pathD: string) => {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('width', '16');
    svg.setAttribute('height', '16');
    svg.setAttribute('fill', 'currentColor');

    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', pathD);
    svg.appendChild(path);

    return svg;
  };

  const firstEvent = event.events[0];

  // Не показывать водителя, если последнее событие — выключение/отключение/снятие
  const shouldHideDriver = [
    'Выключение зажигания',
    'Отключение от замка',
    'Снятие алкозамка с ТС',
    'Снятие БИ с ТС',
  ].some((eventType) => firstEvent?.eventType?.includes(eventType));

  const modeInfo = document.createElement('div');
  modeInfo.style.display = 'flex';
  modeInfo.style.alignItems = 'center';
  modeInfo.style.gap = '8px';
  modeInfo.style.marginBottom = '6px';
  const modeIcon = createSvgIcon(ICONS.MODE_HAMMER);
  modeInfo.appendChild(modeIcon);
  const modeText = document.createElement('span');
  modeText.setAttribute('data-mode-element', 'true'); // Добавляем data-атрибут для поиска

  // Получаем режим из события, устройства или monitoringDevice
  const rawMode =
    event.mode || event.vehicle?.monitoringDevice?.mode || firstEvent?.action?.device?.mode || '';
  const displayMode =
    !rawMode || rawMode === NO_DATA_RU || String(rawMode).trim() === '' ? labels.noData : rawMode;
  modeText.textContent = `${labels.mode}: ${displayMode}`;

  if (rawMode === 'Рабочий') {
    modeText.className = 'vp-mode--working';
  } else if (rawMode === 'Аварийный') {
    modeText.className = 'vp-mode--emergency';
  } else if (rawMode === 'Сервисный') {
    modeText.className = 'vp-mode--service';
  }

  modeInfo.appendChild(modeText);

  const statusInfo = document.createElement('div');
  statusInfo.style.display = 'flex';
  statusInfo.style.alignItems = 'center';
  statusInfo.style.gap = '8px';
  statusInfo.style.marginBottom = '6px';
  const statusIcon = createSvgIcon(ICONS.STATUS);
  statusInfo.appendChild(statusIcon);
  const statusText = document.createElement('span');
  statusText.textContent = `${labels.status}: ${deviceStatus ? labels.online : labels.offline}`;
  statusText.className = deviceStatus ? 'vp-status--online' : 'vp-status--offline';
  statusInfo.appendChild(statusText);

  const deviceInfo = document.createElement('div');
  deviceInfo.style.display = 'flex';
  deviceInfo.style.alignItems = 'center';
  deviceInfo.style.gap = '8px';
  deviceInfo.style.marginBottom = '6px';
  const deviceIcon = createSvgIcon(ICONS.DEVICE);
  deviceInfo.appendChild(deviceIcon);
  const deviceText = document.createElement('span');
  const devName = firstEvent?.action?.device?.name || labels.noData;
  const devSerial = firstEvent?.action?.device?.serialNumber || labels.noData;
  deviceText.textContent = `${labels.alcolockPrefix}: ${devName} (${devSerial})`;
  deviceInfo.appendChild(deviceText);

  const addressInfo = document.createElement('div');
  addressInfo.style.display = 'flex';
  addressInfo.style.alignItems = 'center';
  addressInfo.style.gap = '8px';
  addressInfo.style.margin = '12px 0';
  const addressIcon = createSvgIcon(ICONS.ADDRESS);
  addressInfo.appendChild(addressIcon);
  const addressText = document.createElement('span');
  addressText.style.minHeight = '1em';

  if (event.latitude && event.longitude) {
    const cacheKey = `${event.latitude.toFixed(6)},${event.longitude.toFixed(6)}|${acceptLanguage}`;

    if (geocodingCache.has(cacheKey)) {
      // Используем кэшированный адрес
      addressText.textContent = geocodingCache.get(cacheKey) || labels.addressUnknown;
    } else {
      addressText.textContent = labels.addressLoading;

      // Делаем запрос только если адрес еще не в кэше
      fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${event.latitude}&lon=${event.longitude}`,
        { headers: { 'Accept-Language': acceptLanguage } },
      )
        .then((response) => response.json())
        .then((data) => {
          const displayName = data.display_name || labels.addressUnknown;
          const shortAddress = displayName.split(',').slice(0, 3).join(', ');

          // Сохраняем в кэш
          geocodingCache.set(cacheKey, shortAddress);

          // Обновляем текст только если это тот же элемент
          if (addressText.parentNode) {
            addressText.textContent = shortAddress;
          }
        })
        .catch(() => {
          // Сохраняем ошибку в кэше, чтобы не повторять запрос
          geocodingCache.set(cacheKey, labels.addressUnknown);
          if (addressText.parentNode) {
            addressText.textContent = labels.addressUnknown;
          }
        });
    }
  } else {
    addressText.textContent = labels.noCoordinates;
  }

  addressInfo.appendChild(addressText);
  const eventsTable = document.createElement('div');
  eventsTable.style.marginTop = '12px';
  eventsTable.style.display = 'grid';
  eventsTable.style.gridTemplateColumns = 'auto auto';
  eventsTable.style.gap = '4px 8px';

  event.events.forEach((ev) => {
    const dateCell = document.createElement('div');
    dateCell.textContent = formatDate(ev.timestamp || '');
    dateCell.style.gridColumn = '1';
    dateCell.className = 'vp-date';

    const typeCell = document.createElement('div');
    typeCell.textContent = ev.eventType || labels.unknownEvent;
    typeCell.className = `${eventTypeClass(ev.eventType || '')} vp-event-type`;
    typeCell.style.gridColumn = '2';

    eventsTable.appendChild(dateCell);
    eventsTable.appendChild(typeCell);
  });

  const viewEventsLink = document.createElement('div');
  viewEventsLink.className = 'vp-view-link';
  viewEventsLink.style.textDecoration = 'none';
  viewEventsLink.style.marginTop = '4px';
  viewEventsLink.style.display = 'block';
  viewEventsLink.style.width = '100%';
  viewEventsLink.style.textAlign = 'center';
  viewEventsLink.style.cursor = 'pointer';
  viewEventsLink.textContent = labels.viewAllEvents;
  viewEventsLink.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    onViewAllEvents({ lat: event.latitude, lng: event.longitude });
  });

  popupContent.appendChild(closeButton);
  popupContent.appendChild(vehicleName);
  if (!shouldHideDriver) {
    const driverInfo = document.createElement('div');
    driverInfo.style.display = 'flex';
    driverInfo.style.alignItems = 'center';
    driverInfo.style.gap = '8px';
    driverInfo.style.marginBottom = '6px';
    const driverIcon = createSvgIcon(ICONS.DRIVER);
    driverInfo.appendChild(driverIcon);
    const driverText = document.createElement('span');
    driverText.textContent = `${labels.driverPrefix}: ${firstEvent?.user?.fullName || labels.unknownDriver}`;
    driverInfo.appendChild(driverText);
    infoContainer.appendChild(driverInfo);
  }
  infoContainer.appendChild(deviceInfo);
  infoContainer.appendChild(modeInfo);
  infoContainer.appendChild(statusInfo);
  popupContent.appendChild(infoContainer);
  popupContent.appendChild(addressInfo);
  popupContent.appendChild(eventsTable);
  popupContent.appendChild(viewEventsLink);

  return popupContent;
};
