/* eslint-disable @typescript-eslint/no-explicit-any */
import { type CSSProperties, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';

// import { Dayjs } from 'dayjs';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { enqueueSnackbar } from 'notistack';

import { useMediaQuery } from '@mui/material';

import { HistoryTypes } from '@entities/events_data';
import { RowTableInfo } from '@entities/row_table_info';
import { EventsHistory } from '@features/events_history';
import { mapFilterPanelStore } from '@features/map_filter_panel/model/mapFilterPanelStore';
import { EventsApi } from '@shared/api/baseQuerys';
import { UsersApi } from '@shared/api/baseQuerys';
import { RoutePaths } from '@shared/config/routePathsEnum';
import { testids } from '@shared/const/testid';
import { appStore } from '@shared/model/app_store/AppStore';
import { useColorMode } from '@shared/theme/colorMode';
import { ID } from '@shared/types/BaseQueryTypes';
import { Aside } from '@shared/ui/aside';
import { Button, ButtonsType } from '@shared/ui/button/Button';
import type { Values } from '@shared/ui/search_multiple_select';
import { Formatters } from '@shared/utils/formatters';
import { useQueries } from '@tanstack/react-query';
import { EventInfo } from '@widgets/events_info';
import { AdditionInfo } from '@widgets/events_info/ui/AdditionInfo';
import { breakpoints } from '@widgets/nav_bar/breakpoints';
import { useVehiclesTableApi } from '@widgets/vehicles_table/api/useVehiclesTableApi';

// eslint-disable-next-line @typescript-eslint/no-unused-vars -- оставлено для будущего включения DebugPanel
import { DebugPanel } from './DebugPanel';
import { LocationSelectorModal, type NominatimResult } from './LocationSelectorModal';
import { MapProvider } from './MapContext';
import { MapControls } from './MapControls';
import { MapMarkers } from './MapMarkers';
import { MapRoutes } from './MapRoutes';
import {
  addRasterBasemapForTheme,
  addVectorBasemapToLeafletMap,
  baseLangFromI18n,
  isMapReadyForLayers,
  isVectorBasemapEnabled,
  rasterBasemapSpec,
  replaceVectorBasemapTheme,
  vectorStyleUrlForTheme,
} from './mapBasemap';
import './mapTheme.scss';
import './mapTooltip.scss';
import {
  type SpeedCalculationOptions,
  type VehicleSpeedTracker,
  createVehicleSpeedTracker,
  updateVehicleSpeed,
} from './mapVehicleSpeed';
import { EventData, VehicleEventsGroup } from './types';

const DEFAULT_MAP_CENTER: [number, number] = [59.9343, 30.3351]; // Санкт-Петербург
const DEFAULT_MAP_ZOOM = 12;

type MapDetailsTabKey = 'info' | 'additional';
type ReturnNavigation = {
  pathname: string;
  search?: string;
  hash?: string;
  state?: unknown;
};

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

const PlateBadge = ({
  registrationNumber,
  isSelected,
}: {
  registrationNumber: string;
  isSelected: boolean;
}) => {
  const { firstLetter, digits, lastLetters, region } = formatPlateParts(registrationNumber);
  return (
    <span
      style={{
        flexShrink: 0,
        display: 'flex',
        padding: '4px',
        backgroundColor: '#ffffff',
        borderRadius: '3px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
      }}>
      <span
        style={{
          display: 'flex',
          flex: 1,
          minWidth: 130,
          height: '32px',
          border: isSelected ? '2px solid #d32f2f' : '2px solid #000000',
          borderRadius: '2px',
          overflow: 'hidden',
          backgroundColor: '#ffffff',
        }}>
        <span
          style={{
            flex: 1,
            minWidth: 70,
            padding: '0 6px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '4px',
            backgroundColor: '#ffffff',
            color: '#000000',
            fontWeight: 800,
            letterSpacing: '0.8px',
            fontFamily: 'Arial, sans-serif',
            whiteSpace: 'nowrap',
          }}>
          <span style={{ fontSize: '12px', fontWeight: 800 }}>{firstLetter}</span>
          <span style={{ fontSize: '15px', fontWeight: 800 }}>{digits}</span>
          <span style={{ fontSize: '12px', fontWeight: 800 }}>{lastLetters}</span>
        </span>
        <span
          style={{
            width: '2px',
            backgroundColor: '#000000',
          }}
        />
        <span
          style={{
            width: region.length > 2 ? 44 : 36,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '3px 2px',
            backgroundColor: '#ffffff',
            color: '#000000',
          }}>
          <span
            style={{
              fontSize: '15px',
              fontWeight: 800,
              letterSpacing: '0.8px',
              fontFamily: 'Arial, sans-serif',
              lineHeight: 1,
            }}>
            {region}
          </span>
          <span
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '2px',
              marginTop: '2px',
            }}>
            <span style={{ fontSize: '8px', fontWeight: 700 }}>RUS</span>
            <span
              style={{
                width: 10,
                height: 8,
                display: 'flex',
                flexDirection: 'column',
                borderRadius: 1,
                overflow: 'hidden',
              }}>
              <span style={{ height: 2.67, minHeight: 2, background: '#fff', display: 'block' }} />
              <span
                style={{ height: 2.67, minHeight: 2, background: '#0039a6', display: 'block' }}
              />
              <span
                style={{ height: 2.67, minHeight: 2, background: '#d52b1e', display: 'block' }}
              />
            </span>
          </span>
        </span>
      </span>
    </span>
  );
};

const useQueryParams = () => {
  const location = useLocation();
  return new URLSearchParams(location.search);
};

type MapBasemapState =
  | {
      kind: 'vector';
      layer: L.Layer;
      setMapLanguage: (lang: string) => void;
      vectorStyleUrl: string;
    }
  | { kind: 'raster'; layer: L.TileLayer };

export const MapPage = () => {
  const { t, i18n } = useTranslation();
  const { mode: colorMode } = useColorMode();
  const colorModeRef = useRef(colorMode);
  colorModeRef.current = colorMode;
  const i18nLangRef = useRef(i18n.language);
  i18nLangRef.current = i18n.language;
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const basemapRef = useRef<MapBasemapState | null>(null);
  /** Одна за другой: setStyle/recreate подложки, иначе гонки с pan/zoom Leaflet. */
  const basemapSwapChainRef = useRef<Promise<void>>(Promise.resolve());
  const scheduleBasemapWork = useCallback((fn: () => Promise<void>) => {
    basemapSwapChainRef.current = basemapSwapChainRef.current.then(fn, fn).catch(() => {});
  }, []);

  useEffect(() => {
    const el = mapContainerRef.current;
    if (!el) return;
    el.setAttribute('data-basemap-lang', baseLangFromI18n(i18n.language));
    el.setAttribute(
      'data-basemap-tiles',
      isVectorBasemapEnabled() ? 'vector' : rasterBasemapSpec(colorMode, i18n.language).tileVisual,
    );
  }, [colorMode, i18n.language]);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- оставлено для будущего включения DebugPanel
  const [debugInfo, setDebugInfo] = useState<string>('Инициализация...');
  const location = useLocation();
  const navigate = useNavigate();
  const returnNavigation = (location.state as { returnNavigation?: ReturnNavigation } | null)
    ?.returnNavigation;
  const queryParams = useQueryParams();
  const urlLat = queryParams.get('lat');
  const urlLng = queryParams.get('lng');
  const urlVehicle = queryParams.get('vehicle');
  const isCoordinateTransitionMode = Boolean(urlLat && urlLng && urlVehicle);
  const isMapPage = location.pathname === RoutePaths.map;
  // const [startDate, setStartDate] = useState<Dayjs | null>(null);
  // const [endDate, setEndDate] = useState<Dayjs | null>(null);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
  const [, setSelectedVehicleActive] = useState(false);
  const [openedPopupVehicleId, setOpenedPopupVehicleId] = useState<string | null>(null);
  const [mapBounds, setMapBounds] = useState<{
    northEast: { lat: number; lng: number };
    southWest: { lat: number; lng: number };
  } | null>(null);
  const [clickedVehicleEvents, setClickedVehicleEvents] = useState<EventData[]>([]);
  const [, setIsLoadingEvents] = useState(false);
  const [hasTemperatureSensor, setHasTemperatureSensor] = useState(false);
  const [activeTab, setActiveTab] = useState<MapDetailsTabKey>('info');
  const [freezeMarkers, setFreezeMarkers] = useState(false);
  const [showOnlyWithAlcolock, setShowOnlyWithAlcolock] = useState(false);
  const [showRoutes, setShowRoutes] = useState(false);
  const [numberedMarkersMode, setNumberedMarkersMode] = useState(false);
  const [listItemClickedVehicleId, setListItemClickedVehicleId] = useState<string | null>(null);
  const popupRef = useRef<L.Popup | null>(null);
  const isMobile = useMediaQuery(breakpoints.mobile);
  const [mobileParamsExpanded, setMobileParamsExpanded] = useState(false);
  const [mobileHistoryVehicleId, setMobileHistoryVehicleId] = useState<string | null>(null);
  const [frozenMarkersData] = useState<VehicleEventsGroup[]>([]);
  const [urlMarker, setUrlMarker] = useState<L.Marker | null>(null);
  const [expandedRowId, setExpandedRowId] = useState<ID | null>(null);
  const [urlMarkerEvent, setUrlMarkerEvent] = useState<EventData | null>(null);
  const [locationSelectorOpen, setLocationSelectorOpen] = useState(false);
  const [locationSelectorResults, setLocationSelectorResults] = useState<NominatimResult[]>([]);
  const [locationSelectorQuery, setLocationSelectorQuery] = useState('');
  const [isMapInitialized, setIsMapInitialized] = useState(false);
  // const mainMarkerRef = useRef<L.Marker | null>(null);
  const [baseMarkerCoords, setBaseMarkerCoords] = useState<{ lat: number; lng: number } | null>(
    null,
  );
  const selectedVehicleCoordsRef = useRef<{ lat: number; lng: number } | null>(null);
  /** Координаты маркера при открытии боковой панели — не перезаписываются при клике по координатам события */
  const sidebarReturnCoordsRef = useRef<{ lat: number; lng: number } | null>(null);
  const userLocationRef = useRef<[number, number] | null>(null);

  // Стек для управления вложенными панелями
  const [panelStack, setPanelStack] = useState<Array<{ id: ID; content: React.ReactNode }>>([]);

  const handleOpenPanel = (params: { id: ID; content: React.ReactNode }) => {
    setPanelStack((prev) => [...prev, params]);
    setActiveTab('info');
  };

  const handleCloseAllPanels = () => {
    setPanelStack([]);
  };
  const handleReturnToOrigin = useCallback(() => {
    if (!returnNavigation) return;
    navigate(
      `${returnNavigation.pathname}${returnNavigation.search || ''}${returnNavigation.hash || ''}`,
      {
        state: returnNavigation.state,
      },
    );
  }, [navigate, returnNavigation]);

  const handleResetMapCenter = () => {
    if (mapRef.current) {
      const center = userLocationRef.current ?? DEFAULT_MAP_CENTER;
      mapRef.current.setView(center, DEFAULT_MAP_ZOOM);
    }
  };

  const handleLocationSearch = async (query: string) => {
    const q = query.trim();
    if (!q || !mapRef.current) return;
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&q=${encodeURIComponent(q)}&limit=10`,
        {
          headers: {
            'Accept-Language': 'ru',
            'User-Agent': 'AlcolockMapApp/1.0',
          },
        },
      );
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        if (data.length === 1) {
          const { lat, lon } = data[0];
          mapRef.current.setView([parseFloat(lat), parseFloat(lon)], 14);
        } else {
          setLocationSelectorResults(data);
          setLocationSelectorQuery(q);
          setLocationSelectorOpen(true);
        }
      } else {
        enqueueSnackbar(t('map.locationNotFound'), { variant: 'warning' });
      }
    } catch {
      enqueueSnackbar(t('map.locationSearchError'), { variant: 'error' });
    }
  };

  const handleLocationSelect = (lat: number, lon: number) => {
    if (mapRef.current) {
      mapRef.current.setView([lat, lon], 14);
    }
    setLocationSelectorOpen(false);
  };

  const handleCloseAside = (resetToDefault = false) => {
    const vehicleIdToFocus = selectedVehicleId;
    setSelectedVehicleId(null);
    setSelectedVehicleActive(false);
    setOpenedPopupVehicleId(null);
    setMobileHistoryVehicleId(null);
    setFreezeMarkers(false);
    setActiveTab('info');
    setPanelStack([]);
    setShowRoutes(false);
    setExpandedRowId(null);

    if (popupRef.current) {
      popupRef.current.remove();
      popupRef.current = null;
    }
    // Удаляем красные маркеры (от координат событий) и очищаем URL
    if (urlMarker) {
      urlMarker.remove();
      setUrlMarker(null);
      setUrlMarkerEvent(null);
    }
    navigate({ pathname: RoutePaths.map, search: '' });

    // При смене филиала — в точку пользователя (геолокация) или Санкт-Петербург; иначе — на маркер выбранного ТС
    if (mapRef.current) {
      if (resetToDefault) {
        const center = userLocationRef.current ?? DEFAULT_MAP_CENTER;
        mapRef.current.setView(center, DEFAULT_MAP_ZOOM);
      } else {
        // Приоритет: координаты маркера при открытии панели → refs → события ТС → API vehicles
        const coords =
          sidebarReturnCoordsRef.current ??
          selectedVehicleCoordsRef.current ??
          baseMarkerCoords ??
          (vehicleIdToFocus && clickedVehicleEvents.length > 0
            ? (() => {
                const ev =
                  clickedVehicleEvents.find(
                    (e) => e?.action?.vehicleRecord?.registrationNumber === vehicleIdToFocus,
                  ) ?? clickedVehicleEvents[0];
                return ev?.latitude != null && ev?.longitude != null
                  ? { lat: ev.latitude, lng: ev.longitude }
                  : null;
              })()
            : null) ??
          (vehicleIdToFocus
            ? (() => {
                const v = vehiclesResponse?.content?.find(
                  (x: any) => x?.registrationNumber === vehicleIdToFocus,
                );
                return v?.latitude != null && v?.longitude != null
                  ? { lat: v.latitude, lng: v.longitude }
                  : null;
              })()
            : null);
        if (coords) {
          mapRef.current.flyTo([coords.lat, coords.lng], 14, { duration: 0.6 });
        }
      }
      selectedVehicleCoordsRef.current = null;
      sidebarReturnCoordsRef.current = null;
    }
  };

  const branchId = appStore.getState().selectedBranchState?.id;
  const {
    filters: mapFilters,
    hasActiveFilters: hasMapFilters,
    resetFilters: resetMapFilters,
  } = mapFilterPanelStore();

  const [userInfo, setUserInfo] = useState<{
    currentUserId: number | null;
    permission: string[];
    role: number[];
  }>({ currentUserId: null, permission: [], role: [] });

  useEffect(() => {
    UsersApi.getInfo()
      .then((res) => {
        const roles = res.data?.groupMembership?.map((m: any) => m.group?.id) || [];
        setUserInfo({
          currentUserId: Number(res.data?.id) || null,
          permission: res.data?.permissions || [],
          role: roles,
        });
      })
      .catch(() => {});
  }, []);

  // Поиск по пользователю — через api/device-events. Поиск по ТС и алкозамку — из api/vehicles (vehiclesResponse)
  const deviceEventsUsersQuery = useQueries({
    queries: [
      {
        queryKey: ['map-device-events-users', mapFilters.driverId, branchId],
        queryFn: () =>
          EventsApi.getListForMap({
            page: 0,
            limit: 100,
            filterOptions: {
              branchId,
              users: Formatters.getStringForQueryParams(mapFilters.driverId as Values),
            },
            currentUserId: userInfo.currentUserId ?? undefined,
            permission: userInfo.permission,
            role: userInfo.role,
          }),
        enabled: hasMapFilters && !!branchId && mapFilters.driverId.length > 0,
      },
    ],
  });

  const prevBranchIdRef = useRef<typeof branchId>(branchId);
  useEffect(() => {
    // На первом рендере не сбрасываем URL-параметры (lat/lng/vehicle),
    // иначе переход по координатам с других вкладок теряет контекст.
    if (prevBranchIdRef.current === branchId) return;

    prevBranchIdRef.current = branchId;
    if (branchId !== undefined) {
      setBaseMarkerCoords(null);
      handleCloseAside(true); // смена филиала — сброс карты в Санкт-Петербург
      setFreezeMarkers(false);
      resetMapFilters();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branchId]);

  useEffect(() => {
    if (!isMapInitialized || !mapRef.current || !urlLat || !urlLng || !urlVehicle) return;

    const lat = parseFloat(urlLat);
    const lng = parseFloat(urlLng);

    if (isNaN(lat) || isNaN(lng)) return;

    if (urlMarker) {
      urlMarker.remove();
      setUrlMarker(null);
    }

    const { firstLetter, digits, lastLetters, region } = formatPlateParts(urlVehicle);
    const newMarker = L.marker([lat, lng], {
      icon: L.divIcon({
        html: `
          <div style="display: flex; flex-direction: column; align-items: center; z-index: 1000;">
            <div style="
              padding: 3px;
              background: #fff;
              border-radius: 3px;
              box-shadow: 0 1px 4px rgba(0,0,0,0.25);
            ">
              <div style="
                display: flex;
                min-width: 78px;
                height: 26px;
                border: 2px solid #d32f2f;
                border-radius: 2px;
                overflow: hidden;
                background: #fff;
              ">
                <div style="
                  flex: 1;
                  padding: 0 4px;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  gap: 2px;
                  color: #000;
                  font-weight: 800;
                  font-size: 13px;
                  letter-spacing: 0.6px;
                  font-family: Arial, sans-serif;
                ">
                  <span>${firstLetter}</span>
                  <span style="font-size: 15px;">${digits}</span>
                  <span>${lastLetters}</span>
                </div>
                <div style="width: 2px; background: #000;"></div>
                <div style="
                  width: 28px;
                  display: flex;
                  flex-direction: column;
                  align-items: center;
                  justify-content: center;
                  padding: 2px 3px;
                  font-size: 11px;
                  font-weight: 800;
                  color: #000;
                  font-family: Arial, sans-serif;
                  line-height: 1;
                ">
                  <span>${region}</span>
                  <span style="font-size: 7px; font-weight: 700; margin-top: 1px;">RUS</span>
                </div>
              </div>
            </div>
            <div style="
              width: 0;
              height: 0;
              border-left: 9px solid transparent;
              border-right: 9px solid transparent;
              border-top: 12px solid #d32f2f;
              margin-top: -1px;
            "></div>
          </div>
        `,
        iconSize: [100, 65],
        iconAnchor: [50, 65],
        className: 'url-marker',
      }),
      zIndexOffset: 1000,
      bubblingMouseEvents: false,
    }).addTo(mapRef.current);

    newMarker.on('click', () => {
      loadVehicleEvents(urlVehicle);
      setSelectedVehicleId(urlVehicle);
    });

    setUrlMarker(newMarker);
    // Переход по координатам должен вести себя как клик в Истории на Карте:
    // закрепляем маркеры, чтобы режим был явно активирован.
    setFreezeMarkers(true);
    // Для переходов с вкладок Пользователи/Транспорт/Алкозамки нужен такой же поток,
    // как при клике по координатам внутри Карты: подгружаем события по госномеру.
    loadVehicleEvents(urlVehicle);
    setMobileHistoryVehicleId(urlVehicle);
    if (isMobile) {
      // На мобильном карта должна оставаться видимой после перехода по координатам.
      setOpenedPopupVehicleId(urlVehicle);
      setSelectedVehicleId(null);
      setPanelStack([]);
      setActiveTab('info');
      setExpandedRowId(null);
    } else {
      setSelectedVehicleId(urlVehicle);
    }
    mapRef.current.setView([lat, lng], 15);

    return () => {
      newMarker.remove();
      setUrlMarker((prev) => (prev === newMarker ? null : prev));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMapInitialized, isMobile, urlLat, urlLng, urlVehicle]);

  useEffect(() => {
    if (!urlMarker || !urlMarkerEvent) return;

    const tooltipContent = document.createElement('div');
    const titleRow = document.createElement('div');
    titleRow.style.fontWeight = 'bold';
    titleRow.style.marginBottom = '4px';
    titleRow.textContent = `${t('map.popup.eventType')}:`;
    const typeRow = document.createElement('div');
    typeRow.textContent = urlMarkerEvent.eventType ?? '';
    tooltipContent.appendChild(titleRow);
    tooltipContent.appendChild(typeRow);

    urlMarker.unbindTooltip();
    urlMarker.bindTooltip(tooltipContent, {
      permanent: false,
      direction: 'top',
      offset: [0, -25],
      opacity: 0.95,
      className: 'custom-tooltip',
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlMarkerEvent, t, i18n.language]);

  const transformEvent = useCallback(
    (event: any) => ({
      id: event.id,
      timestamp: event.timestamp,
      isActive: event.isActive,
      latitude: event.latitude,
      longitude: event.longitude,
      eventType: event.eventsForFront?.label,
      user: {
        id: event.userRecord?.email,
        fullName: event.userRecord
          ? `${event.userRecord.surname || ''} ${event.userRecord.firstName || ''} ${event.userRecord.middleName || ''}`.trim()
          : t('map.popup.unknownDriver'),
      },
      action: {
        id: event.actionId,
        vehicleRecord: {
          registrationNumber: event.vehicleRecord?.registrationNumber,
          manufacturer: event.vehicleRecord?.manufacturer,
          model: event.vehicleRecord?.model,
          year: event.action?.vehicleRecord?.year,
          vin: event.action?.vehicleRecord?.vin,
          type: event.action?.vehicleRecord?.type,
          color: event.action?.vehicleRecord?.color,
        },
        device: {
          id:
            event.action?.device?.id ??
            event.device?.id ??
            event.deviceRecord?.id ??
            event.summary?.deviceId ??
            event.summary?.description?.deviceId,
          name: event.deviceRecord?.name,
          serialNumber: event.deviceRecord?.serialNumber,
          mode: event.action?.device?.mode,
        },
      },
      mode: event.action?.device?.mode,
    }),
    [t],
  );

  const loadVehicleEvents = async (vehicleId: string, allEvents = false) => {
    try {
      setIsLoadingEvents(true);
      const now = Date.now();
      const targetCount = allEvents || freezeMarkers ? undefined : 3;
      const pageSize = allEvents ? 100 : 50;
      const validEvents: any[] = [];
      let page = 0;
      let hasMore = true;
      let firstPageContent: any[] = [];

      while (hasMore) {
        const response = await EventsApi.getListForMap({
          page,
          limit: pageSize,
          sortBy: 'DATE_OCCURRENT',
          order: 'desc',
          filterOptions: {
            carsRegistrationNumbers: [vehicleId],
          },
        });

        const content = response?.data?.content ?? [];
        if (page === 0) firstPageContent = content;

        const transformed = content.map((ev: any) => transformEvent(ev));
        const fromPage = transformed.filter(
          (ev: any) => ev.timestamp && new Date(ev.timestamp).getTime() <= now,
        );

        validEvents.push(...fromPage);
        if (targetCount != null && validEvents.length >= targetCount) hasMore = false;
        else if (content.length < pageSize || content.length === 0) hasMore = false;
        else page++;
      }

      const events = targetCount != null ? validEvents.slice(0, targetCount) : validEvents;

      const finalEvents =
        events.length > 0
          ? events
          : firstPageContent
              .filter((ev: any) => ev.latitude != null && ev.longitude != null)
              .slice(0, 3)
              .map((ev: any) => transformEvent(ev));

      setClickedVehicleEvents(finalEvents);

      if (finalEvents.length > 0) {
        setBaseMarkerCoords({
          lat: finalEvents[0].latitude ?? 0,
          lng: finalEvents[0].longitude ?? 0,
        });
      }

      if (allEvents && freezeMarkers) {
        setShowRoutes(true);
      }
    } catch (error) {
      console.error('Error loading vehicle events:', error);
      setClickedVehicleEvents([]);
    } finally {
      setIsLoadingEvents(false);
    }
  };

  const handleMarkerClick = (vehicleId: string, lat?: number, lng?: number) => {
    if (lat != null && lng != null) {
      const coords = { lat, lng };
      selectedVehicleCoordsRef.current = coords;
      sidebarReturnCoordsRef.current = coords;
    } else {
      selectedVehicleCoordsRef.current = null;
      sidebarReturnCoordsRef.current = null;
    }
    loadVehicleEvents(vehicleId);
    if (freezeMarkers) {
      setShowRoutes(true);
    }
  };

  const handleViewAllEventsWithCoords = (
    vehicleId: string,
    markerCoords: { lat: number; lng: number },
  ) => {
    selectedVehicleCoordsRef.current = markerCoords;
    sidebarReturnCoordsRef.current = markerCoords;
  };

  const handleFreezeToggle = (checked: boolean) => {
    setFreezeMarkers(checked);
  };

  const handleResetMapStateFromFilters = () => {
    // Полный сброс контекста перехода по координатам: убираем URL-маркер, очищаем URL и мобильную кнопку истории.
    if (urlMarker) {
      urlMarker.remove();
      setUrlMarker(null);
    }
    setUrlMarkerEvent(null);
    setMobileHistoryVehicleId(null);
    setOpenedPopupVehicleId(null);
    setSelectedVehicleId(null);
    setExpandedRowId(null);
    setPanelStack([]);
    setFreezeMarkers(false);
    setShowRoutes(false);
    setBaseMarkerCoords(null);
    selectedVehicleCoordsRef.current = null;
    sidebarReturnCoordsRef.current = null;
    navigate({ pathname: RoutePaths.map, search: '' });
  };

  const {
    cars: vehiclesResponse,
    stopPolling,
    startPolling,
  } = useVehiclesTableApi(
    {
      forMap: true,
      limit: 25,
      searchQuery: '',
      bounds: mapBounds
        ? {
            northEastLat: mapBounds.northEast.lat,
            northEastLng: mapBounds.northEast.lng,
            southWestLat: mapBounds.southWest.lat,
            southWestLng: mapBounds.southWest.lng,
          }
        : undefined,
    },
    isMapPage && !freezeMarkers,
  );

  useEffect(() => {
    if (freezeMarkers) {
      stopPolling();
    } else {
      startPolling();
    }
  }, [freezeMarkers, stopPolling, startPolling]);

  /** Скорость по смене координат между опросами api/vehicles с учётом дорожной сети. */
  const vehicleTrackersRef = useRef<Record<string, VehicleSpeedTracker>>({});
  const [vehicleSpeedsKmh, setVehicleSpeedsKmh] = useState<Record<string, number>>({});

  // Конфигурация расчёта скорости для региона (можно вынести в .env при необходимости)
  const speedOptions: SpeedCalculationOptions = {
    minDistanceMeters: 8, // 8 метров — минимальное значимое перемещение
    minTimeSeconds: 1.5, // 1.5 секунды — минимальный интервал между замерами
    maxSpeedKmh: 130, // Максимальная скорость для региона
    smoothingFactor: 0.35, // Базовое сглаживание
    roadCurvatureFactor: 1.12, // +12% к расстоянию из-за извилистости дорог (настройте под свой регион)
    lowSpeedThreshold: 12, // Ниже 12 км/ч — считаем пробкой/парковкой
    lowSpeedSmoothingFactor: 0.12, // Сильное сглаживание в пробках
    adaptiveSmoothing: true, // Адаптивное сглаживание включено
  };

  useEffect(() => {
    const content = vehiclesResponse?.content;

    // Сброс трекеров, если нет данных
    if (!content?.length) {
      vehicleTrackersRef.current = {};
      setVehicleSpeedsKmh({});
      return;
    }

    const now = Date.now();
    const nextSpeeds: Record<string, number> = {};
    const updatedTrackers = { ...vehicleTrackersRef.current };

    for (const v of content) {
      const reg = v.registrationNumber;
      if (!reg || v.latitude == null || v.longitude == null) continue;

      const lat = Number(v.latitude);
      const lng = Number(v.longitude);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;

      // Получаем текущий трекер для ТС или создаём новый
      let tracker = updatedTrackers[reg];
      if (!tracker) {
        tracker = createVehicleSpeedTracker(0);
      }

      // Обновляем скорость на основе новых координат
      const updatedTracker = updateVehicleSpeed(tracker, lat, lng, now, speedOptions);
      updatedTrackers[reg] = updatedTracker;
      nextSpeeds[reg] = updatedTracker.currentSpeedKmh;
    }

    vehicleTrackersRef.current = updatedTrackers;
    setVehicleSpeedsKmh(nextSpeeds);
  }, [vehiclesResponse]);

  const filterRegistrationNumbers = useMemo(() => {
    if (!hasMapFilters) return null;
    const set = new Set<string>();
    const carIds = new Set(
      (mapFilters.carId || []).map((v) => Number(v?.value)).filter((n) => !isNaN(n) && n > 0),
    );
    const alcolockIds = new Set(
      (mapFilters.alcolocks || []).map((v) => Number(v?.value)).filter((n) => !isNaN(n) && n > 0),
    );

    if (vehiclesResponse?.content) {
      vehiclesResponse.content.forEach((v: any) => {
        const reg = v?.registrationNumber;
        if (!reg) return;
        const regStr = String(reg).trim();
        const matchCar = carIds.size > 0 && v?.id != null && carIds.has(Number(v.id));
        const matchAlcolock =
          alcolockIds.size > 0 &&
          v?.monitoringDevice?.id != null &&
          alcolockIds.has(Number(v.monitoringDevice.id));
        if (matchCar || matchAlcolock) set.add(regStr);
      });
    }

    deviceEventsUsersQuery.forEach((query) => {
      const content = query.data?.data?.content;
      if (!content?.length) return;
      const latestByVehicle = new Map<string, { ts: number }>();
      content.forEach((ev: any) => {
        const reg = ev?.vehicleRecord?.registrationNumber;
        if (!reg) return;
        const regStr = String(reg).trim();
        const ts = ev?.timestamp ? new Date(ev.timestamp).getTime() : 0;
        const existing = latestByVehicle.get(regStr);
        if (!existing || ts > existing.ts) {
          latestByVehicle.set(regStr, { ts });
        }
      });
      latestByVehicle.forEach((_, regStr) => set.add(regStr));
    });

    return set;
  }, [
    hasMapFilters,
    mapFilters.carId,
    mapFilters.alcolocks,
    vehiclesResponse?.content,
    deviceEventsUsersQuery[0]?.data?.data?.content,
  ]);

  const notInLocationLabels = useMemo(() => {
    if (!filterRegistrationNumbers || !vehiclesResponse?.content) return [];
    const visibleRegNumbers = new Set(
      vehiclesResponse.content.map((v: any) => v.registrationNumber).filter(Boolean),
    );
    return Array.from(filterRegistrationNumbers).filter((reg) => !visibleRegNumbers.has(reg));
  }, [filterRegistrationNumbers, vehiclesResponse?.content]);

  const latestEvents = useMemo(() => {
    if (freezeMarkers && frozenMarkersData.length > 0) {
      return frozenMarkersData;
    }

    if (!vehiclesResponse?.content) {
      setDebugInfo('Нет данных content в ответе');
      return [];
    }

    const vehicleEventsMap = new Map<string, EventData[]>();
    let eventsWithCoordinates = 0;
    const uniqueRegistrationNumbers = new Set<string>();

    vehiclesResponse.content.forEach((vehicle: any) => {
      const vehicleId = vehicle.registrationNumber;
      if (!vehicleId) return;

      uniqueRegistrationNumbers.add(vehicleId);

      const event: EventData = {
        id: vehicle.id,
        timestamp: new Date().toISOString(),
        isActive: vehicle.isActive,
        latitude: vehicle.latitude,
        longitude: vehicle.longitude,
        mode: vehicle.monitoringDevice?.mode || vehicle.mode,
        action: {
          id: vehicle.id,
          vehicleRecord: {
            registrationNumber: vehicle.registrationNumber,
            manufacturer: vehicle.manufacturer,
            model: vehicle.model,
            year: vehicle.year,
            vin: vehicle.vin,
            type: vehicle.type,
            color: vehicle.color,
          },
          device: vehicle.monitoringDevice,
        },
      };

      if (event.latitude && event.longitude) eventsWithCoordinates++;

      if (!vehicleEventsMap.has(vehicleId)) {
        vehicleEventsMap.set(vehicleId, []);
      }

      const vehicleEvents = vehicleEventsMap.get(vehicleId);
      if (vehicleEvents) {
        vehicleEvents.push(event);
        vehicleEvents.sort(
          (a, b) => new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime(),
        );
        if (vehicleEvents.length > 3) {
          vehicleEvents.length = 3;
        }
      }
    });

    const registrationNumbersArray = Array.from(uniqueRegistrationNumbers);
    const formattedNumbers = [];
    for (let i = 0; i < registrationNumbersArray.length; i += 3) {
      const group = registrationNumbersArray.slice(i, i + 3).join(', ');
      formattedNumbers.push(group);
    }

    setDebugInfo(
      `Найдено ТС: ${vehiclesResponse.totalElements}\n` +
        `С координатами: ${eventsWithCoordinates}\n` +
        `Уникальных ТС: ${vehicleEventsMap.size}\n` +
        `Госномера:\n${formattedNumbers.join('\n')}`,
    );

    return Array.from(vehicleEventsMap.entries())
      .map(([, events]) => ({
        vehicle: {
          ...(events[0]?.action?.vehicleRecord || {}),
          type: events[0]?.action?.vehicleRecord?.type,
          color: events[0]?.action?.vehicleRecord?.color,
          monitoringDevice: events[0]?.action?.device,
        },
        events,
        latitude: events[0]?.latitude || 0,
        longitude: events[0]?.longitude || 0,
        mode: events[0]?.mode,
      }))
      .filter((event) => event.latitude && event.longitude)
      .filter((event) => !showOnlyWithAlcolock || !!event.events[0]?.action?.device)
      .filter(
        (event) =>
          !filterRegistrationNumbers ||
          (event.vehicle?.registrationNumber &&
            filterRegistrationNumbers.has(event.vehicle.registrationNumber)),
      ) as VehicleEventsGroup[];
  }, [
    vehiclesResponse,
    freezeMarkers,
    frozenMarkersData,
    showOnlyWithAlcolock,
    filterRegistrationNumbers,
  ]);

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    mapRef.current = L.map(mapContainerRef.current, {
      attributionControl: false,
      maxBounds: L.latLngBounds(L.latLng(-85, -180), L.latLng(85, 180)),
      maxBoundsViscosity: 1,
      minZoom: 2,
      maxZoom: 18,
    }).setView(DEFAULT_MAP_CENTER, DEFAULT_MAP_ZOOM);
    setIsMapInitialized(true);

    requestAnimationFrame(() => {
      mapRef.current?.invalidateSize();
    });

    const map = mapRef.current;
    basemapRef.current = null;

    void (async () => {
      const vector = await addVectorBasemapToLeafletMap(
        map,
        () => i18nLangRef.current,
        () => vectorStyleUrlForTheme(colorModeRef.current),
      );
      // После await карта могла быть снята (Strict Mode / уход со страницы) — не трогаем чужой инстанс.
      if (!mapRef.current || mapRef.current !== map || !isMapReadyForLayers(map)) return;

      if (vector) {
        const appliedStyle = vectorStyleUrlForTheme(colorModeRef.current);
        basemapRef.current = {
          kind: 'vector',
          layer: vector.layer,
          setMapLanguage: vector.setMapLanguage,
          vectorStyleUrl: appliedStyle,
        };
      } else if (isMapReadyForLayers(map)) {
        basemapRef.current = {
          kind: 'raster',
          layer: addRasterBasemapForTheme(map, colorModeRef.current, i18nLangRef.current),
        };
      }
    })();

    const updateBounds = () => {
      const bounds = mapRef.current?.getBounds();
      if (bounds) {
        setMapBounds({
          northEast: bounds.getNorthEast(),
          southWest: bounds.getSouthWest(),
        });
      }
    };

    map.on('moveend', updateBounds);
    updateBounds();

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          userLocationRef.current = [latitude, longitude];
          if (mapRef.current) {
            mapRef.current.setView([latitude, longitude], DEFAULT_MAP_ZOOM);
            updateBounds();
          }
        },
        () => {
          // Отказ или ошибка — остаёмся на дефолтном центре (Санкт-Петербург)
        },
        { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 },
      );
    }

    return () => {
      basemapSwapChainRef.current = Promise.resolve();
      basemapRef.current = null;
      map.off('moveend', updateBounds);
      map.remove();
      mapRef.current = null;
    };
  }, [scheduleBasemapWork]);

  /** Светлая/тёмная подложка: вектор — новый экземпляр слоя; растр — смена TileLayer */
  useEffect(() => {
    const mapSnap = mapRef.current;
    if (!mapSnap || !isMapReadyForLayers(mapSnap)) return;

    scheduleBasemapWork(async () => {
      const m = mapRef.current;
      if (!m || m !== mapSnap || !isMapReadyForLayers(m)) return;
      const bs = basemapRef.current;
      if (!bs) return;

      const invalidate = () =>
        requestAnimationFrame(() => {
          if (mapRef.current === m && isMapReadyForLayers(m)) {
            m.invalidateSize();
          }
        });

      if (bs.kind === 'vector') {
        const url = vectorStyleUrlForTheme(colorMode);
        if (bs.vectorStyleUrl === url) {
          bs.setMapLanguage(i18n.language);
          invalidate();
          return;
        }
        const oldLayer = bs.layer;
        const next = await replaceVectorBasemapTheme(m, oldLayer, url, () => i18nLangRef.current);
        if (!mapRef.current || mapRef.current !== m || !isMapReadyForLayers(m)) {
          if (next && m.hasLayer(next.layer)) {
            m.removeLayer(next.layer);
          }
          return;
        }
        if (
          !basemapRef.current ||
          basemapRef.current.kind !== 'vector' ||
          basemapRef.current.layer !== oldLayer
        ) {
          if (next && m.hasLayer(next.layer)) {
            m.removeLayer(next.layer);
          }
          return;
        }
        if (next) {
          basemapRef.current = {
            kind: 'vector',
            layer: next.layer,
            setMapLanguage: next.setMapLanguage,
            vectorStyleUrl: url,
          };
        } else {
          basemapRef.current = {
            kind: 'raster',
            layer: addRasterBasemapForTheme(m, colorMode, i18n.language),
          };
        }
        invalidate();
        return;
      }

      try {
        m.removeLayer(bs.layer);
      } catch {
        /* слой уже отвязан */
      }
      if (!isMapReadyForLayers(m)) return;
      basemapRef.current = {
        kind: 'raster',
        layer: addRasterBasemapForTheme(m, colorMode, i18n.language),
      };
      invalidate();
    });
  }, [colorMode, i18n.language, scheduleBasemapWork]);

  const getClickedVehicleEvents = () => {
    if (!selectedVehicleId) return [];
    return clickedVehicleEvents;
  };

  const handleViewAllEvents = () => {
    if (selectedVehicleId) {
      loadVehicleEvents(selectedVehicleId, true);
    }
  };

  const handleCoordinateClick = (lat: number, lng: number, vehicle: string) => {
    navigate({
      pathname: RoutePaths.map,
      search: `?lat=${lat}&lng=${lng}&vehicle=${encodeURIComponent(vehicle)}`,
    }, {
      state: location.state,
    });

    // На мобильном боковая панель перекрывает карту: закрываем панели,
    // чтобы номерной маркер был виден сразу после перехода по координатам.
    if (isMobile) {
      setPanelStack([]);
      setActiveTab('info');
      setExpandedRowId(null);
      // `selectedVehicleId` в MapPage управляет видимостью полного aside на mobile,
      // поэтому чтобы пользователь увидел карту — не оставляем aside открытым.
      setOpenedPopupVehicleId(vehicle);
      setSelectedVehicleId(null);
      setMobileHistoryVehicleId(vehicle);

      // Центрируем карту на координатах клика, чтобы пользователь видел маркер.
      if (mapRef.current) {
        mapRef.current.flyTo([lat, lng], 15, { duration: 0.35 });
      }

      loadVehicleEvents(vehicle);
      return;
    }

    setSelectedVehicleId(vehicle);
    loadVehicleEvents(vehicle);
  };

  const tabs = [
    {
      testid: testids.page_users.users_widget_info.USERS_WIDGET_INFO_TAB_BUTTON_HISTORY,
      name: t('info.historyTab'),
      content: (
        <EventsHistory
          type={HistoryTypes.byCar}
          registrationNumber={selectedVehicleId}
          //@ts-expect-error: Временное решение
          customEvents={getClickedVehicleEvents()}
          disableApiRequests={false}
          showDetailsLink={true}
          openDetailsPanel={(params) => {
            handleOpenPanel(params);
            setHasTemperatureSensor(true);
          }}
          onViewAllEvents={freezeMarkers ? handleViewAllEvents : undefined}
          expandedRowId={expandedRowId}
          onExpandRow={setExpandedRowId}
          freezeMarkers={freezeMarkers}
          onToggleFreezeMarkers={(checked) => setFreezeMarkers(checked)}
          onCoordinateClick={handleCoordinateClick}
          sidePanelMobileFilterUx
          sidePanelFilterUxAlways
        />
      ),
    },
  ];

  const asidePanelBackground = colorMode === 'dark' ? '#121212' : '#ffffff';
  const asidePanelShadow =
    colorMode === 'dark' ? '0 0 16px rgba(0,0,0,0.45)' : '0 0 10px rgba(0,0,0,0.1)';

  const mobileAsideShellStyle: CSSProperties = {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    width: '100%',
    maxWidth: '100%',
    boxSizing: 'border-box',
    overflow: 'hidden',
    backgroundColor: asidePanelBackground,
  };

  const desktopPanelStackShellStyle: React.CSSProperties = {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: '680px',
    boxShadow: asidePanelShadow,
  };

  const detailsTabs = [
    {
      name: t('info.infoTab'),
      key: 'info',
      content: (
        <EventInfo
          selectedEventId={panelStack[panelStack.length - 1]?.id}
          onHasTemperatureSensor={setHasTemperatureSensor}
        />
      ),
    },
    ...(hasTemperatureSensor
      ? [
          {
            name: t('info.additionalDataTab'),
            key: 'additional',
            content: <AdditionInfo selectedEventId={panelStack[panelStack.length - 1]?.id} />,
          },
        ]
      : []),
  ];

  return (
    <MapProvider>
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 1,
          display: 'flex',
          flexDirection: 'column',
          minHeight: 0,
        }}>
        {!isMobile && !isCoordinateTransitionMode ? (
          <MapControls
            variant="toolbar"
            onResetFilters={handleResetMapStateFromFilters}
            onResetMapCenter={handleResetMapCenter}
            onLocationSearch={handleLocationSearch}
            desktopToggles={{
              freezeMarkers,
              showOnlyWithAlcolock,
              numberedMarkersMode,
              onFreezeToggle: handleFreezeToggle,
              onShowOnlyWithAlcolock: setShowOnlyWithAlcolock,
              onNumberedMarkersMode: setNumberedMarkersMode,
            }}
          />
        ) : null}
        <div
          ref={mapContainerRef}
          style={{
            flex: 1,
            minHeight: 0,
            position: 'relative',
            width: '100%',
          }}
        />
      </div>

      {isMobile && !isCoordinateTransitionMode ? (
        <div
          style={{
            position: 'absolute',
            top: '10px',
            /* Не наезжаем на слот темы (right ~10px, z-index 999) */
            right: '68px',
            maxWidth: 'min(100%, calc(100dvw - 70px - 58px))',
            zIndex: 1000,
            boxSizing: 'border-box',
          }}>
          <MapControls
            isMobile
            compact
            onExpandedChange={setMobileParamsExpanded}
            onResetFilters={handleResetMapStateFromFilters}
            onResetMapCenter={handleResetMapCenter}
            onLocationSearch={handleLocationSearch}
            mobileToggles={{
              freezeMarkers,
              showOnlyWithAlcolock,
              numberedMarkersMode,
              onFreezeToggle: handleFreezeToggle,
              onShowOnlyWithAlcolock: setShowOnlyWithAlcolock,
              onNumberedMarkersMode: setNumberedMarkersMode,
            }}
          />
        </div>
      ) : null}

      {isMobile && mobileHistoryVehicleId && !selectedVehicleId ? (
        <Button
          typeButton={ButtonsType.action}
          onClick={() => setSelectedVehicleId(mobileHistoryVehicleId)}
          sx={{
            position: 'absolute',
            left: '12px',
            top: mobileParamsExpanded ? '162px' : '82px',
            zIndex: 1001,
            minWidth: '100px',
            height: '38px',
            backgroundColor: '#fff',
          }}>
          {t('info.historyTab')}
        </Button>
      ) : null}

      {numberedMarkersMode && latestEvents.length > 0 && !(isMobile && mobileParamsExpanded) && (
        <div
          style={{
            position: 'absolute',
            top: isMobile ? '140px' : '200px',
            left: '10px',
            width: '200px',
            maxHeight: isMobile ? '28vh' : '1024px',
            height: 'fit-content',
            zIndex: 1000,
            backgroundColor: isMobile ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.95)',
            backdropFilter: isMobile ? 'blur(2px)' : undefined,
            WebkitBackdropFilter: isMobile ? 'blur(2px)' : undefined,
            borderRadius: '8px',
            boxShadow: '0 2px 12px rgba(0,0,0,0.15)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            padding: '12px',
          }}>
          <div
            style={{
              flexShrink: 0,
              fontSize: '13px',
              fontWeight: 600,
              marginBottom: '8px',
              color: '#333',
            }}>
            {t('nav.vehicles')}
          </div>
          <div
            style={{
              maxHeight: isMobile ? 'calc(28vh - 50px)' : 'calc(1024px - 60px)',
              overflowY: 'auto',
              overflowX: 'hidden',
            }}>
            {latestEvents.map((event, index) => {
              const firstEvent = event.events[0];
              const vehicleId = event.vehicle?.registrationNumber;
              const desc = `${firstEvent?.action?.vehicleRecord?.manufacturer || ''} ${firstEvent?.action?.vehicleRecord?.model || ''} (${firstEvent?.action?.vehicleRecord?.registrationNumber || 'Нет данных'})`;
              const mode = event.mode || firstEvent?.action?.device?.mode || 'Нет данных';
              return (
                <div
                  key={vehicleId || index}
                  onClick={() => {
                    if (vehicleId) {
                      setListItemClickedVehicleId(vehicleId);
                      setOpenedPopupVehicleId(vehicleId);
                      setSelectedVehicleId(null); // Свернуть боковую панель при клике на другой элемент списка
                      handleMarkerClick(vehicleId, event?.latitude, event?.longitude);
                      handleCloseAllPanels?.();
                    }
                  }}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (vehicleId && (e.key === 'Enter' || e.key === ' ')) {
                      e.preventDefault();
                      setListItemClickedVehicleId(vehicleId);
                      setOpenedPopupVehicleId(vehicleId);
                      setSelectedVehicleId(null); // Свернуть боковую панель при клике на другой элемент списка
                      handleMarkerClick(vehicleId, event?.latitude, event?.longitude);
                      handleCloseAllPanels?.();
                    }
                  }}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                    gap: '6px',
                    padding: '8px 10px',
                    marginBottom: '4px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    backgroundColor:
                      selectedVehicleId === vehicleId
                        ? 'rgba(25, 118, 210, 0.25)'
                        : isMobile
                          ? 'rgba(255, 255, 255, 0.08)'
                          : 'transparent',
                    border:
                      selectedVehicleId === vehicleId
                        ? '1px solid rgba(25, 118, 210, 0.5)'
                        : '1px solid transparent',
                  }}
                  onMouseEnter={(e) => {
                    if (selectedVehicleId !== vehicleId) {
                      e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.04)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (selectedVehicleId !== vehicleId) {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }
                  }}>
                  <PlateBadge
                    registrationNumber={vehicleId || '?'}
                    isSelected={selectedVehicleId === vehicleId}
                  />
                  <div style={{ fontSize: '13px', lineHeight: 1.4, width: '100%' }}>
                    <div>{desc}</div>
                    <div style={{ color: '#666', fontSize: '12px' }}>режим: {mode}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {notInLocationLabels.length > 0 && (
        <div
          style={{
            position: 'absolute',
            bottom: '20px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 1000,
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            padding: '12px 20px',
            borderRadius: '8px',
            boxShadow: '0 2px 12px rgba(0,0,0,0.15)',
            fontSize: '14px',
            maxWidth: '90vw',
            textAlign: 'center',
          }}>
          Не отображаются в текущей локации: {notInLocationLabels.join(', ')}
        </div>
      )}

      {/* <DebugPanel debugInfo={debugInfo} /> */}

      {selectedVehicleId && (
        <div
          style={{
            ...(isMobile
              ? { ...mobileAsideShellStyle, zIndex: 1001 }
              : {
                  position: 'absolute',
                  right: 0,
                  zIndex: 1001,
                  backgroundColor: asidePanelBackground,
                  boxShadow: asidePanelShadow,
                }),
          }}>
          <Aside
            onClose={handleCloseAside}
            onReturnToOrigin={returnNavigation ? handleReturnToOrigin : undefined}
            style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <RowTableInfo tabs={tabs} style={{ flex: 1 }} />
          </Aside>
        </div>
      )}

      {panelStack.map((panel, index) => (
        <div
          key={`panel-${panel.id}`}
          style={{
            ...(isMobile
              ? { ...mobileAsideShellStyle, zIndex: 1002 + index }
              : {
                  ...desktopPanelStackShellStyle,
                  zIndex: 1002 + index,
                  backgroundColor: asidePanelBackground,
                }),
          }}>
          <Aside
            onClose={handleCloseAllPanels}
            onReturnToOrigin={returnNavigation ? handleReturnToOrigin : undefined}
            style={{
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
            }}>
            <RowTableInfo
              tabs={detailsTabs}
              activeTab={activeTab === 'additional' ? 1 : 0}
              onTabChange={(index) => setActiveTab(index === 1 ? 'additional' : 'info')}
              style={{ flex: 1 }}
            />
          </Aside>
        </div>
      ))}

      {mapRef.current && (
        <>
          <MapMarkers
            map={mapRef.current}
            events={isMobile && mobileParamsExpanded ? [] : latestEvents}
            numberedMode={numberedMarkersMode}
            listItemClickedVehicleId={listItemClickedVehicleId}
            onListItemClickedProcessed={() => setListItemClickedVehicleId(null)}
            openedPopupVehicleId={openedPopupVehicleId}
            setOpenedPopupVehicleId={setOpenedPopupVehicleId}
            setSelectedVehicleId={setSelectedVehicleId}
            onMarkerClick={handleMarkerClick}
            onViewAllEventsWithCoords={handleViewAllEventsWithCoords}
            clickedVehicleEvents={clickedVehicleEvents.map((ev) => {
              const regNum = ev.action?.vehicleRecord?.registrationNumber;
              const vehicleFromApi = vehiclesResponse?.content?.find(
                (v: any) => v?.registrationNumber === regNum,
              );
              const monitoringDeviceWithId = vehicleFromApi?.monitoringDevice
                ? {
                    ...ev.action?.device,
                    id: ev.action?.device?.id ?? vehicleFromApi.monitoringDevice.id,
                    name: ev.action?.device?.name ?? vehicleFromApi.monitoringDevice.name,
                    serialNumber:
                      ev.action?.device?.serialNumber ??
                      vehicleFromApi.monitoringDevice.serialNumber,
                    mode: ev.action?.device?.mode ?? vehicleFromApi.monitoringDevice.mode,
                  }
                : ev.action?.device;
              return {
                vehicle: {
                  ...(ev.action?.vehicleRecord || {}),
                  type: ev.action?.vehicleRecord?.type,
                  color: ev.action?.vehicleRecord?.color,
                  monitoringDevice: monitoringDeviceWithId,
                },
                events: clickedVehicleEvents
                  .filter(
                    (e) =>
                      e.action?.vehicleRecord?.registrationNumber ===
                      ev.action?.vehicleRecord?.registrationNumber,
                  )
                  .map((e) => ({
                    ...e,
                    action: {
                      ...e.action,
                      device: {
                        ...e.action?.device,
                        id: e.action?.device?.id ?? vehicleFromApi?.monitoringDevice?.id,
                      },
                    },
                  })),
                latitude: ev.latitude || 0,
                longitude: ev.longitude || 0,
                mode: ev.mode,
              };
            })}
            onCloseAllPanels={handleCloseAllPanels}
            popupRef={popupRef}
            freezeMarkers={freezeMarkers}
            vehicleSpeedsKmh={vehicleSpeedsKmh}
          />
          {freezeMarkers &&
            showRoutes &&
            selectedVehicleId &&
            clickedVehicleEvents.length > 0 &&
            !(isMobile && mobileParamsExpanded) && (
              <MapRoutes
                map={mapRef.current}
                events={clickedVehicleEvents.map((ev) => ({
                  vehicle: {
                    ...(ev.action?.vehicleRecord || {}),
                    type: ev.action?.vehicleRecord?.type,
                    color: ev.action?.vehicleRecord?.color,
                  },
                  events: [ev],
                  latitude: ev.latitude || 0,
                  longitude: ev.longitude || 0,
                  mode: ev.mode,
                }))}
                selectedVehicleId={selectedVehicleId}
              />
            )}
        </>
      )}
      <LocationSelectorModal
        open={locationSelectorOpen}
        onClose={() => setLocationSelectorOpen(false)}
        results={locationSelectorResults}
        query={locationSelectorQuery}
        onSelect={handleLocationSelect}
      />
    </MapProvider>
  );
};
