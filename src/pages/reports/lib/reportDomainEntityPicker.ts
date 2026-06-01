import type { ReportFieldDefinition } from '../types/reportApiTypes';

/**
 * Поле metadata типа ENTITY со ссылкой на доменную сущность (branch → BranchOffice).
 * Записи API — сами офисы/пользователи, а не объект с ключом fieldName.
 */
export function isDomainEntityReferencePicker(
  domainEntity: string,
  field: ReportFieldDefinition | undefined,
): boolean {
  if (!field) return false;
  const type = (field.type ?? '').toUpperCase();
  if (type !== 'ENTITY') return false;
  const ref = (domainEntity === 'Driver' ? 'User' : domainEntity).trim();
  const fieldRef = (field.referenceEntity ?? '').trim();
  return Boolean(ref && fieldRef === ref);
}
