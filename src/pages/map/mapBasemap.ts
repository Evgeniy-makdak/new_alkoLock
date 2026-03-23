import L from 'leaflet';

/** Бесплатные векторные тайлы (OpenFreeMap, на базе OpenMapTiles). */
export const OPENFREEMAP_LIBERTY_STYLE = 'https://tiles.openfreemap.org/styles/liberty';

type LeafletWithMaplibre = typeof L & {
  maplibreGL?: (options: { style: string | object }) => L.Layer;
};

type MaplibreLeafletLayer = L.Layer & {
  getMaplibreMap?: () => {
    setLanguage?: (code: string) => void;
    loaded?: () => boolean;
    on?: (type: string, fn: () => void) => void;
    once?: (type: string, fn: () => void) => void;
  };
};

/** Коды языка для MapLibre `setLanguage` (OpenMapTiles name:* в данных). */
export function mapLangForMapLibre(i18nLang: string): string {
  const base = (i18nLang || 'ru').split('-')[0].toLowerCase();
  const supported = ['ru', 'en', 'kk', 'ky', 'be', 'uz'];
  if (supported.includes(base)) return base;
  return 'en';
}

export function addRasterBasemap(map: L.Map): L.TileLayer {
  return L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '',
    noWrap: true,
    bounds: L.latLngBounds(L.latLng(-85, -180), L.latLng(85, 180)),
    maxNativeZoom: 18,
    detectRetina: false,
  }).addTo(map);
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
): Promise<{ layer: L.Layer; setMapLanguage: (i18nLang: string) => void } | null> {
  if (process.env.REACT_APP_MAP_FORCE_RASTER === 'true') {
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

    const styleUrl =
      (typeof process !== 'undefined' && process.env.REACT_APP_MAP_VECTOR_STYLE_URL?.trim()) ||
      OPENFREEMAP_LIBERTY_STYLE;

    const layer = factory({
      style: styleUrl,
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
