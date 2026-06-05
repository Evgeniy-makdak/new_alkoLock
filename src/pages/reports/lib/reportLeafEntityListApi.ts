/** Сущности, для которых «Значение» на листе path грузится доменным API (не metadata). */
export const REPORT_LEAF_DOMAIN_LIST_ENTITIES = new Set([
  'User',
  'Driver',
  'Vehicle',
  'MonitoringDevice',
  'DeviceAction',
  'AutoServiceHistory',
  'VehicleBind',
  'BranchOffice',
  'EventsForFront',
]);

export function isReportLeafDomainListEntity(entityName: string): boolean {
  return REPORT_LEAF_DOMAIN_LIST_ENTITIES.has((entityName ?? '').trim());
}

/** Имя сущности для доменного справочника (User, Vehicle, …). */
export function resolveReportDomainListEntityName(entityName: string): string | null {
  const name = (entityName ?? '').trim();
  if (isReportLeafDomainListEntity(name)) return name;
  return null;
}
