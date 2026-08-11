import type { MobileFeature } from '@shared/api/mobileFeaturesApi';

const normalizeType = (value?: string | null) => String(value || '').trim().toUpperCase();
const normalizeLabel = (value?: string | null) => String(value || '').trim().toLowerCase();
const normalizeLevel = (value?: string | null) => String(value || '').trim().toUpperCase();

/**
 * «Сервисный режим (сервисный работник)» — PUT ок, на «Включить»/баннер не влияет.
 */
export function isServiceModeWorkerFeature(
  feature: Pick<MobileFeature, 'featureType' | 'label'> | null | undefined,
): boolean {
  if (!feature) return false;
  if (normalizeType(feature.featureType) === 'SERVICE_MODE_SERVICE_WORKER') return true;
  const label = normalizeLabel(feature.label);
  return (
    label.includes('сервисный работник') ||
    label.includes('сервисного работника') ||
    label.includes('service worker')
  );
}

/**
 * Единственная фича для блокировки «Включить» / баннера:
 * GLOBAL + SERVICE_MODE_DRIVER («Заявки на сервисный режим»).
 */
export function isServiceModeRequestsFeature(
  feature: Pick<MobileFeature, 'featureType' | 'label' | 'featureLevel'> | null | undefined,
): boolean {
  if (!feature) return false;
  if (isServiceModeWorkerFeature(feature)) return false;
  if (normalizeLevel(feature.featureLevel) && normalizeLevel(feature.featureLevel) !== 'GLOBAL') {
    return false;
  }
  return normalizeType(feature.featureType) === 'SERVICE_MODE_DRIVER';
}
