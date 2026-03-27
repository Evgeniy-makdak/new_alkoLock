import L from 'leaflet';

import type { ColorMode } from '@shared/theme/colorMode';

/** Бесплатные векторные тайлы (OpenFreeMap, на базе OpenMapTiles). */
export const OPENFREEMAP_LIBERTY_STYLE = 'https://tiles.openfreemap.org/styles/liberty';

/** Векторная тёмная подложка (Carto Dark Matter, MapLibre GL style JSON). */
export const CARTO_DARK_MATTER_VECTOR_STYLE =
  'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json';

/** Растровый fallback (Carto), если вектор не поднялся — те же пары светлая/тёмная. */
export const RASTER_TILE_TEMPLATE_LIGHT =
  'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';
export const RASTER_TILE_TEMPLATE_DARK =
  'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';

/**
 * Вектор (MapLibre + maplibre-gl-leaflet) по умолчанию выключен — при pan/zoom часты падения и циклы ошибок.
 * Включить экспериментально: `REACT_APP_MAP_USE_VECTOR=true`
 * Только растр: `REACT_APP_MAP_FORCE_RASTER=true` (имеет приоритет над USE_VECTOR).
 */
export function isVectorBasemapEnabled(): boolean {
  if (process.env.REACT_APP_MAP_FORCE_RASTER === 'true') {
    return false;
  }
  return process.env.REACT_APP_MAP_USE_VECTOR === 'true';
}

type LeafletWithMaplibre = typeof L & {
  maplibreGL?: (options: { style: string | object }) => L.Layer;
};

type MaplibreMapLike = {
  setStyle?: (url: string | object) => unknown;
  setLanguage?: (code: string) => void;
  loaded?: () => boolean;
  on?: (type: string, fn: () => void) => void;
  once?: (type: string, fn: () => void) => void;
};

type MaplibreLeafletLayer = L.Layer & {
  getMaplibreMap?: () => MaplibreMapLike;
};

/** Коды языка для MapLibre `setLanguage` (OpenMapTiles name:* в данных). */
export function mapLangForMapLibre(i18nLang: string): string {
  const base = (i18nLang || 'ru').split('-')[0].toLowerCase();
  const supported = ['ru', 'en', 'kk', 'ky', 'be', 'uz'];
  if (supported.includes(base)) return base;
  return 'en';
}

export function basemapRasterOptions() {
  return {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; CARTO',
    noWrap: true,
    bounds: L.latLngBounds(L.latLng(-85, -180), L.latLng(85, 180)),
    maxNativeZoom: 19,
    subdomains: 'abcd',
    detectRetina: true,
  } as const;
}

/** Карта после remove() или в переходном состоянии — не добавлять слои. */
export function isMapReadyForLayers(map: L.Map): boolean {
  try {
    return Boolean(map?.getPane?.('tilePane'));
  } catch {
    return false;
  }
}

export function addRasterBasemapForTheme(map: L.Map, mode: ColorMode): L.TileLayer {
  const url =
    mode === 'dark'
      ? process.env.REACT_APP_MAP_RASTER_DARK_URL?.trim() || RASTER_TILE_TEMPLATE_DARK
      : process.env.REACT_APP_MAP_RASTER_LIGHT_URL?.trim() || RASTER_TILE_TEMPLATE_LIGHT;
  return L.tileLayer(url, { ...basemapRasterOptions() }).addTo(map);
}

/** @deprecated используйте addRasterBasemapForTheme; OSM оставлен для совместимости вызовов */
export function addRasterBasemap(map: L.Map): L.TileLayer {
  return L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '',
    noWrap: true,
    bounds: L.latLngBounds(L.latLng(-85, -180), L.latLng(85, 180)),
    maxNativeZoom: 18,
    detectRetina: false,
  }).addTo(map);
}

export function vectorStyleUrlForTheme(mode: ColorMode): string {
  const dark =
    process.env.REACT_APP_MAP_VECTOR_STYLE_URL_DARK?.trim() || CARTO_DARK_MATTER_VECTOR_STYLE;
  const lightFromEnv =
    process.env.REACT_APP_MAP_VECTOR_STYLE_URL_LIGHT?.trim() ||
    process.env.REACT_APP_MAP_VECTOR_STYLE_URL?.trim();
  const light = lightFromEnv || OPENFREEMAP_LIBERTY_STYLE;
  return mode === 'dark' ? dark : light;
}

/**
 * Тема: снять векторный слой и создать новый со стилем (setStyle у gl-leaflet нестабилен при параллельных апдейтах Leaflet).
 */
export async function replaceVectorBasemapTheme(
  map: L.Map,
  oldLayer: L.Layer,
  styleUrl: string,
  getCurrentLanguage: () => string,
): Promise<{ layer: L.Layer; setMapLanguage: (i18nLang: string) => void } | null> {
  if (!isMapReadyForLayers(map)) {
    return null;
  }
  try {
    if (map.hasLayer(oldLayer)) {
      map.removeLayer(oldLayer);
    }
  } catch {
    /* слой уже снят */
  }
  if (!isMapReadyForLayers(map)) {
    return null;
  }
  return addVectorBasemapToLeafletMap(map, getCurrentLanguage, styleUrl);
}

function getMaplibreFactory(): ((options: { style: string | object }) => L.Layer) | null {
  const Lm = L as LeafletWithMaplibre;
  return Lm.maplibreGL ?? null;
}

/**
 * Векторная подложка MapLibre под существующий Leaflet (маркеры/маршруты без изменений).
 * При ошибке загрузки — вернуть null (вызывающий добавит растровый OSM).
 */
export async function addVectorBasemapToLeafletMap(
  map: L.Map,
  getCurrentLanguage: () => string,
  styleUrl?: string | (() => string),
): Promise<{ layer: L.Layer; setMapLanguage: (i18nLang: string) => void } | null> {
  if (!isVectorBasemapEnabled()) {
    return null;
  }

  try {
    await import('maplibre-gl/dist/maplibre-gl.css');

    // CRA/Webpack: без явного URL воркера MapLibre часто падает в рантайме (белый экран / ошибка Worker).
    const { setWorkerUrl, getVersion } = await import('maplibre-gl');
    const v = typeof getVersion === 'function' ? getVersion() : '4.7.1';
    setWorkerUrl(`https://unpkg.com/maplibre-gl@${v}/dist/maplibre-gl-csp-worker.js`);

    await import('@maplibre/maplibre-gl-leaflet');

    const factory = getMaplibreFactory();
    if (!factory) {
      return null;
    }

    // URL стиля читаем после await импортов — иначе тема, сменившаяся пока грузились чанки, будет проигнорирована.
    const rawStyle = typeof styleUrl === 'function' ? styleUrl() : styleUrl;
    const resolvedStyle =
      rawStyle?.trim() ||
      (typeof process !== 'undefined' && process.env.REACT_APP_MAP_VECTOR_STYLE_URL?.trim()) ||
      OPENFREEMAP_LIBERTY_STYLE;

    const layer = factory({
      style: resolvedStyle,
    }).addTo(map) as MaplibreLeafletLayer;

    const applyLanguage = (i18nLang: string) => {
      const code = mapLangForMapLibre(i18nLang);
      const ml = layer.getMaplibreMap?.();
      try {
        ml?.setLanguage?.(code);
      } catch {
        /* стиль может не поддерживать setLanguage */
      }
    };

    const mlMap = layer.getMaplibreMap?.();
    const onReady = () => applyLanguage(getCurrentLanguage());
    if (mlMap?.loaded?.()) {
      onReady();
    } else if (mlMap?.once) {
      mlMap.once('load', onReady);
    } else if (mlMap?.on) {
      mlMap.on('load', onReady);
    } else {
      onReady();
    }

    return {
      layer,
      setMapLanguage: applyLanguage,
    };
  } catch (e) {
    if (process.env.NODE_ENV === 'development') {
      // eslint-disable-next-line no-console
      console.warn('[mapBasemap] vector basemap failed, using OSM raster:', e);
    }
    return null;
  }
}
