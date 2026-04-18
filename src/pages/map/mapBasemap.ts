import L from 'leaflet';

import type { ColorMode } from '@shared/theme/colorMode';

/** Бесплатные векторные тайлы (OpenFreeMap, на базе OpenMapTiles). */
export const OPENFREEMAP_LIBERTY_STYLE = 'https://tiles.openfreemap.org/styles/liberty';

/** Векторная тёмная подложка (Carto Dark Matter, MapLibre GL style JSON). */
export const CARTO_DARK_MATTER_VECTOR_STYLE =
  'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json';

/**
 * Светлый растр по умолчанию: Carto Voyager (контрастный «международный» стиль; подписи часто на латинице).
 * Для локалей ru/kk/ky/uz/be без Jawg на светлой теме используем публичный растр OSM — в стране обычно местные name (РФ — кириллица).
 * Тёмный: при ru/kk/ky/uz/be — те же OSM-тайлы с приглушением в mapTheme; иначе Carto dark_all.
 * Единый язык подписей по всему миру — Jawg (REACT_APP_JAWG_ACCESS_TOKEN).
 */
export const RASTER_TILE_TEMPLATE_LIGHT =
  'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';
export const RASTER_TILE_TEMPLATE_DARK =
  'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';

/** Публичные тайлы OSM (соблюдайте https://operations.osmfoundation.org/policies/tiles/). */
export const OSM_RASTER_TEMPLATE = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';

const JAWG_ATTRIBUTION =
  '<a href="https://jawg.io?utm_medium=map&utm_source=attribution" target="_blank" rel="noreferrer">&copy; <b>Jawg</b>Maps</a> | &copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a>';

const CARTO_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/attributions">CARTO</a>';

const OSM_RASTER_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';

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

/** Базовый код языка интерфейса (kk-KZ → kk). */
export function baseLangFromI18n(i18nLang: string): string {
  return (i18nLang || 'en').split('-')[0].toLowerCase();
}

/** Коды языка для MapLibre `setLanguage` и растра Jawg (совпадает с локалями приложения). */
export function mapLangForMapLibre(i18nLang: string): string {
  const base = baseLangFromI18n(i18nLang);
  const supported = ['ru', 'en', 'kk', 'ky', 'be', 'uz'];
  if (supported.includes(base)) return base;
  return 'en';
}

export type RasterBasemapTileVisual = 'osm' | 'carto-voyager' | 'carto-dark' | 'jawg';

export type RasterBasemapSpec = {
  url: string;
  attribution: string;
  layerExtras: Pick<L.TileLayerOptions, 'maxNativeZoom' | 'detectRetina' | 'subdomains'>;
  /** Атрибут data-basemap-tiles на контейнере Leaflet — стили в mapTheme.scss */
  tileVisual: RasterBasemapTileVisual;
};

/** Без Jawg: OSM даёт локальные подписи (кириллица в РФ и т.д.), не латиница Carto Voyager/dark_all. */
const OSM_LOCAL_LABEL_LANGS = ['ru', 'kk', 'ky', 'uz', 'be'] as const;

function preferOsmLocalLabelsRaster(lang: string): boolean {
  return (OSM_LOCAL_LABEL_LANGS as readonly string[]).includes(lang);
}

function isOsmTileUrl(url: string): boolean {
  return url.includes('openstreetmap.org') && !url.includes('basemaps.cartocdn');
}

/**
 * Подложка по теме и языку интерфейса.
 * При `REACT_APP_JAWG_ACCESS_TOKEN` — Jawg (подписи на выбранном языке по всему миру).
 * Иначе светлая: для ru/kk/ky/uz/be — OSM; для en — Carto Voyager.
 */
export function rasterBasemapSpec(mode: ColorMode, i18nLang: string): RasterBasemapSpec {
  const lang = mapLangForMapLibre(i18nLang);
  const token = process.env.REACT_APP_JAWG_ACCESS_TOKEN?.trim();

  if (token) {
    const style = mode === 'dark' ? 'jawg-dark' : 'jawg-streets';
    const url = `https://tile.jawg.io/${style}/{z}/{x}/{y}.png?lang=${encodeURIComponent(lang)}&access-token=${encodeURIComponent(token)}`;
    return {
      url,
      attribution: JAWG_ATTRIBUTION,
      layerExtras: {
        maxNativeZoom: 22,
        detectRetina: false,
        subdomains: 'abcd',
      },
      tileVisual: 'jawg',
    };
  }

  const lightEnv = process.env.REACT_APP_MAP_RASTER_LIGHT_URL?.trim();
  const darkEnv = process.env.REACT_APP_MAP_RASTER_DARK_URL?.trim();

  if (mode === 'light') {
    let url: string;
    if (lightEnv) {
      url = lightEnv;
    } else if (preferOsmLocalLabelsRaster(lang)) {
      url = OSM_RASTER_TEMPLATE;
    } else {
      url = RASTER_TILE_TEMPLATE_LIGHT;
    }
    const osm = isOsmTileUrl(url);
    return {
      url,
      attribution: osm ? OSM_RASTER_ATTRIBUTION : CARTO_ATTRIBUTION,
      layerExtras: {
        maxNativeZoom: 19,
        detectRetina: !osm,
        subdomains: osm ? '' : 'abcd',
      },
      tileVisual: osm ? 'osm' : 'carto-voyager',
    };
  }

  let url: string;
  if (darkEnv) {
    url = darkEnv;
  } else if (preferOsmLocalLabelsRaster(lang)) {
    url = OSM_RASTER_TEMPLATE;
  } else {
    url = RASTER_TILE_TEMPLATE_DARK;
  }
  const osmDark = isOsmTileUrl(url);
  return {
    url,
    attribution: osmDark ? OSM_RASTER_ATTRIBUTION : CARTO_ATTRIBUTION,
    layerExtras: {
      maxNativeZoom: 19,
      detectRetina: !osmDark,
      subdomains: osmDark ? '' : 'abcd',
    },
    tileVisual: osmDark ? 'osm' : 'carto-dark',
  };
}

/** @deprecated используйте rasterBasemapSpec / addRasterBasemapForTheme(map, mode, lang) */
export function basemapRasterOptions() {
  return {
    attribution: CARTO_ATTRIBUTION,
    noWrap: true,
    bounds: L.latLngBounds(L.latLng(-85, -180), L.latLng(85, 180)),
    maxNativeZoom: 19,
    subdomains: 'abcd',
    detectRetina: true,
  } as const;
}

function basemapRasterLayerOptions(
  attribution: string,
  extras: RasterBasemapSpec['layerExtras'],
): L.TileLayerOptions {
  return {
    attribution,
    noWrap: true,
    bounds: L.latLngBounds(L.latLng(-85, -180), L.latLng(85, 180)),
    maxNativeZoom: extras.maxNativeZoom,
    subdomains: extras.subdomains,
    detectRetina: extras.detectRetina,
  };
}

/** Карта после remove() или в переходном состоянии — не добавлять слои. */
export function isMapReadyForLayers(map: L.Map): boolean {
  try {
    return Boolean(map?.getPane?.('tilePane'));
  } catch {
    return false;
  }
}

export function addRasterBasemapForTheme(
  map: L.Map,
  mode: ColorMode,
  i18nLang: string,
): L.TileLayer {
  const spec = rasterBasemapSpec(mode, i18nLang);
  return L.tileLayer(spec.url, basemapRasterLayerOptions(spec.attribution, spec.layerExtras)).addTo(
    map,
  );
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
    // @ts-ignore
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
