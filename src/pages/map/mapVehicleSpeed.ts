/**
 * Расстояние между точками на сфере по формуле гаверсинусов (метры).
 * Используется для базового расчёта расстояния между координатами.
 */
export function haversineDistanceM(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const R = 6371000; // радиус Земли в метрах
  const toRad = (x: number) => (x * Math.PI) / 180;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const s1 = Math.sin(dLat / 2);
  const s2 = Math.sin(dLng / 2);
  const h = s1 * s1 + Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * s2 * s2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

/**
 * Опции для расчёта скорости с учётом дорожной сети.
 * Настраивается под реальные условия движения.
 */
export interface SpeedCalculationOptions {
  /** Минимальное расстояние между точками для расчёта скорости (метры). По умолчанию 5 м. */
  minDistanceMeters?: number;
  /** Минимальный интервал времени между замерами (секунды). По умолчанию 1 с. */
  minTimeSeconds?: number;
  /** Максимальная реалистичная скорость (км/ч). По умолчанию 130 км/ч. */
  maxSpeedKmh?: number;
  /** Коэффициент сглаживания EMA (0-1). По умолчанию 0.35 (более плавный). */
  smoothingFactor?: number;
  /** Коэффициент извилистости дорог (1.0 = прямая, 1.3 = извилистые). По умолчанию 1.15. */
  roadCurvatureFactor?: number;
  /** Минимальная скорость для сглаживания (км/ч). Ниже этого порога сглаживание сильнее. */
  lowSpeedThreshold?: number;
  /** Коэффициент сглаживания при низкой скорости (0-1). По умолчанию 0.15. */
  lowSpeedSmoothingFactor?: number;
  /** Включить адаптивное сглаживание в зависимости от скорости. */
  adaptiveSmoothing?: boolean;
}

const DEFAULT_OPTIONS: Required<SpeedCalculationOptions> = {
  minDistanceMeters: 8, // 8 метров — ниже этого считаем GPS-шумом
  minTimeSeconds: 1.5, // 1.5 секунды — минимальный интервал для расчёта
  maxSpeedKmh: 130, // 130 км/ч — максимальная реалистичная скорость
  smoothingFactor: 0.35, // 35% нового значения, 65% старого
  roadCurvatureFactor: 1.12, // +12% к расстоянию из-за извилистости дорог (для региона)
  lowSpeedThreshold: 12, // ниже 12 км/ч — считаем "медленным движением"
  lowSpeedSmoothingFactor: 0.12, // сильное сглаживание при низкой скорости
  adaptiveSmoothing: true, // адаптивное сглаживание включено
};

/**
 * Рассчитывает мгновенную скорость между двумя точками с учётом дорожной сети.
 * Возвращает скорость в км/ч или null, если расчёт невозможен.
 */
export function calculateInstantSpeed(
  prevLat: number,
  prevLng: number,
  currLat: number,
  currLng: number,
  timeDiffSeconds: number,
  options: SpeedCalculationOptions = {},
): number | null {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  // Проверка на валидность входных данных
  if (
    !Number.isFinite(prevLat) ||
    !Number.isFinite(prevLng) ||
    !Number.isFinite(currLat) ||
    !Number.isFinite(currLng) ||
    !Number.isFinite(timeDiffSeconds) ||
    timeDiffSeconds <= 0
  ) {
    return null;
  }

  // Расчёт расстояния по прямой (метры)
  const straightDistanceM = haversineDistanceM(prevLat, prevLng, currLat, currLng);

  // Коррекция расстояния с учётом извилистости дорог
  const roadDistanceM = straightDistanceM * opts.roadCurvatureFactor;

  // Проверка минимального расстояния (фильтрация GPS-шума)
  if (roadDistanceM < opts.minDistanceMeters) {
    return null; // слишком малое перемещение — считаем шумом
  }

  // Проверка минимального временного интервала
  if (timeDiffSeconds < opts.minTimeSeconds) {
    return null; // слишком частые замеры — не успели физически переместиться
  }

  // Расчёт скорости в км/ч
  let speedKmh = (roadDistanceM / timeDiffSeconds) * 3.6;

  // Ограничение максимальной скорости
  if (speedKmh > opts.maxSpeedKmh) {
    speedKmh = opts.maxSpeedKmh;
  }

  // Минимальная скорость не может быть отрицательной
  if (speedKmh < 0) {
    speedKmh = 0;
  }

  return speedKmh;
}

/**
 * Обновляет сглаженную скорость с использованием EMA.
 * Поддерживает адаптивное сглаживание в зависимости от текущей скорости.
 */
export function updateSmoothedSpeed(
  previousSpeedKmh: number | undefined,
  instantSpeedKmh: number | null,
  options: SpeedCalculationOptions = {},
): number {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  // Если нет мгновенной скорости, возвращаем предыдущую (или 0)
  if (instantSpeedKmh === null) {
    return previousSpeedKmh ?? 0;
  }

  // Если нет предыдущей скорости, используем мгновенную
  if (previousSpeedKmh === undefined) {
    return instantSpeedKmh;
  }

  let smoothing = opts.smoothingFactor;

  // Адаптивное сглаживание: при низкой скорости используем более сильное сглаживание
  if (opts.adaptiveSmoothing && instantSpeedKmh < opts.lowSpeedThreshold) {
    smoothing = opts.lowSpeedSmoothingFactor;
  }

  // Формула EMA: new = prev * (1 - α) + current * α
  return previousSpeedKmh * (1 - smoothing) + instantSpeedKmh * smoothing;
}

/**
 * Полная функция для обновления скорости ТС на основе новых координат.
 * Возвращает новую сглаженную скорость и обновлённые данные для следующего расчёта.
 */
export interface VehicleSpeedTracker {
  /** Последние координаты и время для расчёта скорости */
  lastGeo: { lat: number; lng: number; timestamp: number } | null;
  /** Текущая сглаженная скорость (км/ч) */
  currentSpeedKmh: number;
}

export function updateVehicleSpeed(
  tracker: VehicleSpeedTracker,
  newLat: number,
  newLng: number,
  newTimestamp: number,
  options: SpeedCalculationOptions = {},
): VehicleSpeedTracker {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  // Проверка валидности новых координат
  if (!Number.isFinite(newLat) || !Number.isFinite(newLng)) {
    return tracker;
  }

  // Если нет предыдущих данных, инициализируем трекер
  if (!tracker.lastGeo) {
    return {
      lastGeo: { lat: newLat, lng: newLng, timestamp: newTimestamp },
      currentSpeedKmh: 0,
    };
  }

  // Расчёт временного интервала
  const timeDiffSeconds = (newTimestamp - tracker.lastGeo.timestamp) / 1000;

  // Расчёт мгновенной скорости
  const instantSpeed = calculateInstantSpeed(
    tracker.lastGeo.lat,
    tracker.lastGeo.lng,
    newLat,
    newLng,
    timeDiffSeconds,
    opts,
  );

  // Обновление сглаженной скорости
  const newSpeed = updateSmoothedSpeed(tracker.currentSpeedKmh, instantSpeed, opts);

  // Возвращаем обновлённый трекер
  return {
    lastGeo: { lat: newLat, lng: newLng, timestamp: newTimestamp },
    currentSpeedKmh: newSpeed,
  };
}

/**
 * Создаёт новый трекер скорости для конкретного ТС.
 */
export function createVehicleSpeedTracker(initialSpeedKmh: number = 0): VehicleSpeedTracker {
  return {
    lastGeo: null,
    currentSpeedKmh: initialSpeedKmh,
  };
}

/**
 * Форматирует скорость для отображения.
 */
export function formatSpeedKmh(speedKmh: number): string {
  if (!Number.isFinite(speedKmh) || speedKmh < 0) {
    return '0';
  }
  return Math.round(speedKmh).toString();
}
