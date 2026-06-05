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
  const domain = (domainEntity ?? '').trim();
  const fieldRef = (field.referenceEntity ?? '').trim();
  if (!domain || !fieldRef) return false;
  if (fieldRef === domain) return true;
  if (domain === 'Driver' && (fieldRef === 'Driver' || fieldRef === 'User')) return true;
  if (domain === 'User' && fieldRef === 'User') return true;
  return false;
}
