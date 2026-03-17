import { ICONS } from '@shared/const/icons';

import { VehicleEventsGroup } from './types';

type VehiclePopupProps = {
  event: VehicleEventsGroup;
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

export const VehiclePopup = ({
  event,
  getEventColor,
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
  closeButton.style.position = 'absolute';
  closeButton.style.right = '4px';
  closeButton.style.top = '5px';
  closeButton.style.cursor = 'pointer';
  closeButton.style.fontSize = '20px';
  closeButton.style.fontWeight = 'bold';
  closeButton.style.zIndex = '1000';
  closeButton.addEventListener('click', (e) => {
    e.stopPropagation();
    onClose();
  });

  const vehicleName = document.createElement('b');
  vehicleName.textContent = `${event.vehicle?.manufacturer || ''} ${event.vehicle?.model || ''} (${event.vehicle?.registrationNumber || 'Нет данных'})`;

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
  const currentMode =
    event.mode ||
    event.vehicle?.monitoringDevice?.mode ||
    firstEvent?.action?.device?.mode ||
    'Нет данных';
  modeText.textContent = `Режим: ${currentMode}`;

  if (currentMode === 'Рабочий') {
    modeText.style.color = '#2e7d32';
  } else if (currentMode === 'Аварийный') {
    modeText.style.color = '#d32f2f';
  } else if (currentMode === 'Сервисный') {
    modeText.style.color = '#ed6c02';
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
  statusText.textContent = `Статус: ${deviceStatus ? 'в сети' : 'не в сети'}`;
  statusText.style.color = deviceStatus ? '#2e7d32' : '#d32f2f';
  statusInfo.appendChild(statusText);

  const deviceInfo = document.createElement('div');
  deviceInfo.style.display = 'flex';
  deviceInfo.style.alignItems = 'center';
  deviceInfo.style.gap = '8px';
  deviceInfo.style.marginBottom = '6px';
  const deviceIcon = createSvgIcon(ICONS.DEVICE);
  deviceInfo.appendChild(deviceIcon);
  const deviceText = document.createElement('span');
  deviceText.textContent = `Алкозамок: ${firstEvent?.action?.device?.name || 'Нет данных'} (${firstEvent?.action?.device?.serialNumber || 'Нет данных'})`;
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
    const cacheKey = `${event.latitude.toFixed(6)},${event.longitude.toFixed(6)}`;

    if (geocodingCache.has(cacheKey)) {
      // Используем кэшированный адрес
      addressText.textContent = geocodingCache.get(cacheKey) || 'Адрес не определен';
    } else {
      addressText.textContent = 'Определение адреса...';

      // Делаем запрос только если адрес еще не в кэше
      fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${event.latitude}&lon=${event.longitude}`,
      )
        .then((response) => response.json())
        .then((data) => {
          const displayName = data.display_name || 'Адрес не определен';
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
          geocodingCache.set(cacheKey, 'Адрес не определен');
          if (addressText.parentNode) {
            addressText.textContent = 'Адрес не определен';
          }
        });
    }
  } else {
    addressText.textContent = 'Координаты не указаны';
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

    const typeCell = document.createElement('div');
    typeCell.textContent = ev.eventType || 'Неизвестное событие';
    typeCell.style.color = getEventColor(ev.eventType || '');
    typeCell.style.fontWeight = '500';
    typeCell.style.gridColumn = '2';

    eventsTable.appendChild(dateCell);
    eventsTable.appendChild(typeCell);
  });

  const viewEventsLink = document.createElement('div');
  viewEventsLink.style.color = '#1976d2';
  viewEventsLink.style.textDecoration = 'none';
  viewEventsLink.style.marginTop = '4px';
  viewEventsLink.style.display = 'block';
  viewEventsLink.style.width = '100%';
  viewEventsLink.style.textAlign = 'center';
  viewEventsLink.style.cursor = 'pointer';
  viewEventsLink.textContent = 'Посмотреть все события';
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
    driverText.textContent = `Водитель: ${firstEvent?.user?.fullName || 'Неизвестный водитель'}`;
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
