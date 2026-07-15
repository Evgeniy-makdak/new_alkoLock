import type { MobileFeature } from '@shared/api/mobileFeaturesApi';

/** Ключи ролей матрицы */
export const MpoRoleKey = {
  DRIVER: 'driver',
  SERVICE_WORKER: 'serviceWorker',
} as const;

export type MpoRoleKey = (typeof MpoRoleKey)[keyof typeof MpoRoleKey];

/**
 * Локальные (ROLE) фичи из ответа бэка:
 * TEST_INTERVAL, INTERVAL_100_ENERGY, INTERVAL_LOW_ENERGY, CREATE_BINDING
 */
export const MpoRoleFeatureKey = {
  TESTING_INTERVAL: 'testingInterval',
  ENERGY_FULL: 'energyFull',
  ENERGY_LOW: 'energyLow',
  CREATE_BINDING: 'createBinding',
} as const;

export type MpoRoleFeatureKey = (typeof MpoRoleFeatureKey)[keyof typeof MpoRoleFeatureKey];

/**
 * Глобальные (GLOBAL) фичи из ответа бэка:
 * CHAT, SERVICE_MODE_DRIVER, SERVICE_MODE_SERVICE_WORKER
 */
export const MpoGlobalFeatureKey = {
  CHAT: 'chat',
  SERVICE_MODE_DRIVER: 'serviceModeDriver',
  SERVICE_MODE_SERVICE_WORKER: 'serviceModeServiceWorker',
} as const;

export type MpoGlobalFeatureKey = (typeof MpoGlobalFeatureKey)[keyof typeof MpoGlobalFeatureKey];

export const MPO_ROLE_ORDER: MpoRoleKey[] = [MpoRoleKey.DRIVER, MpoRoleKey.SERVICE_WORKER];

export const MPO_ROLE_FEATURE_ORDER: MpoRoleFeatureKey[] = [
  MpoRoleFeatureKey.TESTING_INTERVAL,
  MpoRoleFeatureKey.ENERGY_FULL,
  MpoRoleFeatureKey.ENERGY_LOW,
  MpoRoleFeatureKey.CREATE_BINDING,
];

export const MPO_GLOBAL_FEATURE_ORDER: MpoGlobalFeatureKey[] = [
  MpoGlobalFeatureKey.CHAT,
  MpoGlobalFeatureKey.SERVICE_MODE_DRIVER,
  MpoGlobalFeatureKey.SERVICE_MODE_SERVICE_WORKER,
];

/** Какие фичи доступны какой роли (по фактическому ответу бэка) */
export const MPO_ROLE_FEATURES: Record<MpoRoleKey, readonly MpoRoleFeatureKey[]> = {
  [MpoRoleKey.DRIVER]: [
    MpoRoleFeatureKey.TESTING_INTERVAL,
    MpoRoleFeatureKey.ENERGY_FULL,
    MpoRoleFeatureKey.ENERGY_LOW,
  ],
  [MpoRoleKey.SERVICE_WORKER]: [
    MpoRoleFeatureKey.TESTING_INTERVAL,
    MpoRoleFeatureKey.ENERGY_FULL,
    MpoRoleFeatureKey.ENERGY_LOW,
    MpoRoleFeatureKey.CREATE_BINDING,
  ],
};

const ROLE_NAME_BY_GROUP: Record<string, MpoRoleKey> = {
  водитель: MpoRoleKey.DRIVER,
  driver: MpoRoleKey.DRIVER,
  'сервисный работник': MpoRoleKey.SERVICE_WORKER,
  'service worker': MpoRoleKey.SERVICE_WORKER,
};

/** Точный маппинг featureType → глобальный ключ */
const GLOBAL_FEATURE_TYPE_MAP: Record<string, MpoGlobalFeatureKey> = {
  CHAT: MpoGlobalFeatureKey.CHAT,
  SERVICE_MODE_DRIVER: MpoGlobalFeatureKey.SERVICE_MODE_DRIVER,
  SERVICE_MODE_SERVICE_WORKER: MpoGlobalFeatureKey.SERVICE_MODE_SERVICE_WORKER,
};

/** Точный маппинг featureType → локальный ключ */
const ROLE_FEATURE_TYPE_MAP: Record<string, MpoRoleFeatureKey> = {
  TEST_INTERVAL: MpoRoleFeatureKey.TESTING_INTERVAL,
  INTERVAL_100_ENERGY: MpoRoleFeatureKey.ENERGY_FULL,
  INTERVAL_LOW_ENERGY: MpoRoleFeatureKey.ENERGY_LOW,
  CREATE_BINDING: MpoRoleFeatureKey.CREATE_BINDING,
};

const normalize = (value?: string | null) => (value ?? '').trim();
const normalizeType = (value?: string | null) => normalize(value).toUpperCase();

export const isGlobalFeature = (feature: MobileFeature): boolean =>
  normalizeType(feature.featureLevel) === 'GLOBAL';

export const isRoleFeature = (feature: MobileFeature): boolean =>
  normalizeType(feature.featureLevel) === 'ROLE';

export const resolveRoleKey = (feature: MobileFeature): MpoRoleKey | null => {
  const groupName = normalize(feature.group?.name).toLowerCase();
  if (!groupName) return null;
  return ROLE_NAME_BY_GROUP[groupName] ?? null;
};

export const resolveGlobalFeatureKey = (feature: MobileFeature): MpoGlobalFeatureKey | null => {
  const type = normalizeType(feature.featureType);
  return GLOBAL_FEATURE_TYPE_MAP[type] ?? null;
};

export const resolveRoleFeatureKey = (feature: MobileFeature): MpoRoleFeatureKey | null => {
  const type = normalizeType(feature.featureType);
  return ROLE_FEATURE_TYPE_MAP[type] ?? null;
};

export type GlobalFeatureCell = {
  key: MpoGlobalFeatureKey;
  feature: MobileFeature | null;
};

export type RoleFeatureCell = {
  roleKey: MpoRoleKey;
  featureKey: MpoRoleFeatureKey;
  feature: MobileFeature | null;
  applicable: boolean;
};

export const mapGlobalFeatures = (features: MobileFeature[]): GlobalFeatureCell[] => {
  const globalFeatures = features.filter(isGlobalFeature);

  return MPO_GLOBAL_FEATURE_ORDER.map((key) => {
    const feature = globalFeatures.find((item) => resolveGlobalFeatureKey(item) === key) ?? null;
    return { key, feature };
  });
};

/** Строит матрицу роль × фича по featureType + group.name роли. */
export const mapRoleFeatureMatrix = (features: MobileFeature[]): RoleFeatureCell[] => {
  const roleFeatures = features.filter(isRoleFeature);
  const result: RoleFeatureCell[] = [];

  for (const roleKey of MPO_ROLE_ORDER) {
    for (const featureKey of MPO_ROLE_FEATURE_ORDER) {
      const applicable = MPO_ROLE_FEATURES[roleKey].includes(featureKey);

      if (!applicable) {
        result.push({ roleKey, featureKey, feature: null, applicable: false });
        continue;
      }

      const feature =
        roleFeatures.find(
          (item) =>
            resolveRoleFeatureKey(item) === featureKey && resolveRoleKey(item) === roleKey,
        ) ?? null;

      result.push({ roleKey, featureKey, feature, applicable: true });
    }
  }

  return result;
};
