import type { MobileFeature } from '@shared/api/mobileFeaturesApi';

export type MpoRoleColumn = {
  roleKey: string;
  roleLabel: string;
};

export type GlobalFeatureCell = {
  id: string;
  featureType: string;
  feature: MobileFeature;
  label: string;
};

export type RoleFeatureCell = {
  roleKey: string;
  roleLabel: string;
  featureType: string;
  feature: MobileFeature | null;
  applicable: boolean;
};

export type MpoConfigLocalFeatureRow = {
  id: string;
  featureType: string;
  featureLabel: string;
  cells: Record<string, RoleFeatureCell>;
};

export type MpoConfigRoleRow = {
  id: string;
  roleKey: string;
  roleLabel: string;
  cells: Record<string, RoleFeatureCell>;
};

export type RoleFeatureMatrix = {
  roles: MpoRoleColumn[];
  localFeatureRows: MpoConfigLocalFeatureRow[];
  roleRows: MpoConfigRoleRow[];
};

const normalize = (value?: string | null) => (value ?? '').trim();
const normalizeType = (value?: string | null) => normalize(value).toUpperCase();

export const isGlobalFeature = (feature: MobileFeature): boolean =>
  normalizeType(feature.featureLevel) === 'GLOBAL';

export const isRoleFeature = (feature: MobileFeature): boolean =>
  normalizeType(feature.featureLevel) === 'ROLE';

/** Глобальные фичи — порядок и подписи из ответа mobile-features. */
export const mapGlobalFeatures = (features: MobileFeature[]): GlobalFeatureCell[] =>
  features.filter(isGlobalFeature).map((feature) => ({
    id: String(feature.id),
    featureType: normalizeType(feature.featureType),
    feature,
    label: normalize(feature.label) || normalizeType(feature.featureType),
  }));

/**
 * Локальные (ROLE) фичи: строки = featureType, столбцы = group из бэка.
 * Нет записи для пары роль×тип → applicable: false (прочерк в UI).
 */
export const mapRoleFeatureMatrix = (features: MobileFeature[]): RoleFeatureMatrix => {
  const roleFeatures = features.filter(isRoleFeature);

  const rolesMap = new Map<string, MpoRoleColumn>();
  const featureTypesOrder: string[] = [];
  const featureTypeLabels = new Map<string, string>();
  const featureByRoleAndType = new Map<string, MobileFeature>();

  for (const feature of roleFeatures) {
    const group = feature.group;
    if (!group?.id) continue;

    const roleKey = String(group.id);
    if (!rolesMap.has(roleKey)) {
      rolesMap.set(roleKey, {
        roleKey,
        roleLabel: normalize(group.name) || roleKey,
      });
    }

    const featureType = normalizeType(feature.featureType);
    if (!featureTypesOrder.includes(featureType)) {
      featureTypesOrder.push(featureType);
    }

    const label = normalize(feature.label);
    if (label && !featureTypeLabels.has(featureType)) {
      featureTypeLabels.set(featureType, label);
    }

    featureByRoleAndType.set(`${roleKey}:${featureType}`, feature);
  }

  const roles = Array.from(rolesMap.values());

  const localFeatureRows: MpoConfigLocalFeatureRow[] = featureTypesOrder.map((featureType) => {
    const cells: Record<string, RoleFeatureCell> = {};
    for (const role of roles) {
      const feature = featureByRoleAndType.get(`${role.roleKey}:${featureType}`) ?? null;
      cells[role.roleKey] = {
        roleKey: role.roleKey,
        roleLabel: role.roleLabel,
        featureType,
        feature,
        applicable: feature != null,
      };
    }
    return {
      id: featureType,
      featureType,
      featureLabel: featureTypeLabels.get(featureType) || featureType,
      cells,
    };
  });

  const roleRows: MpoConfigRoleRow[] = roles.map((role) => {
    const cells: Record<string, RoleFeatureCell> = {};
    for (const row of localFeatureRows) {
      cells[row.featureType] = row.cells[role.roleKey];
    }
    return {
      id: role.roleKey,
      roleKey: role.roleKey,
      roleLabel: role.roleLabel,
      cells,
    };
  });

  return { roles, localFeatureRows, roleRows };
};

export const getFeatureDisplayLabel = (feature: MobileFeature | null | undefined): string => {
  if (!feature) return '';
  const label = normalize(feature.label);
  if (label) return label;
  return normalizeType(feature.featureType) || String(feature.id);
};
