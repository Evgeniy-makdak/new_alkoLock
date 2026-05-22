import type { ReportEntityMetadata, ReportFieldDefinition } from '../types/reportApiTypes';

/** Поле reference-сущности (Vehicle, User, …) по ключу свойства в nested-фильтре. */
export function findReferenceEntityFieldByAttribute(
  tableMetadata: ReportEntityMetadata | null | undefined,
  attribute: string | null | undefined,
): ReportFieldDefinition | undefined {
  const attr = (attribute ?? '').trim();
  if (!attr || !tableMetadata?.fields?.length) {
    return undefined;
  }
  return tableMetadata.fields.find((f) => f.fieldName === attr);
}
