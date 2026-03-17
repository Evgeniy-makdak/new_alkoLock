/**
 * Маппинг цветов ТС с бэкенда (RED, GREY и т.д.) в hex для отображения на карте.
 * Используется для динамической окраски прозрачных SVG-иконок.
 */
export const VEHICLE_COLOR_MAP: Record<string, string> = {
  RED: '#e53935',
  GREY: '#757575',
  GRAY: '#757575',
  BLACK: '#212121',
  WHITE: '#fafafa',
  BLUE: '#1e88e5',
  GREEN: '#43a047',
  YELLOW: '#fdd835',
  ORANGE: '#fb8c00',
  BROWN: '#6d4c41',
  BEIGE: '#a1887f',
  VIOLET: '#8e24aa',
};

const DEFAULT_COLOR = '#757575';

export const getVehicleColorHex = (colorFromBackend?: string): string => {
  if (!colorFromBackend) return DEFAULT_COLOR;
  const normalized = colorFromBackend.toUpperCase().trim();
  return VEHICLE_COLOR_MAP[normalized] ?? DEFAULT_COLOR;
};
