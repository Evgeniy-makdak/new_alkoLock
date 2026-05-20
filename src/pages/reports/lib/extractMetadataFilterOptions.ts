import type { Values } from '@shared/ui/search_multiple_select';

import type {
  ReportEntityMetadata,
  ReportFieldDefinition,
  ReportFilterControlDef,
} from '../types/reportApiTypes';

const dedupeValues = (items: Values): Values => {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = String(item.value);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

/** Опции из вложенной структуры groups (подписки, e-mail). */
export function extractGroupFilterOptions(metadata: ReportEntityMetadata) {
  const eventTypes: Values = [];
  const emails: Values = [];

  for (const group of metadata.groups ?? []) {
    if (group.email) {
      emails.push({ value: group.email, label: group.email });
    }
    for (const sub of group.subscriptions ?? []) {
      const et = sub.eventType;
      if (et?.id != null) {
        const label = et.label || et.event || String(et.id);
        const code = et.event?.trim() || String(et.id);
        eventTypes.push({ value: code, label });
      }
    }
  }

  return {
    eventTypes: dedupeValues(eventTypes),
    emails: dedupeValues(emails),
  };
}

export function buildFilterControls(metadata: ReportEntityMetadata): ReportFilterControlDef[] {
  const controls: ReportFilterControlDef[] = [];
  const { eventTypes, emails } = extractGroupFilterOptions(metadata);

  if (eventTypes.length > 0) {
    controls.push({
      id: '__group_eventType',
      fieldName: 'eventType',
      label: 'Тип события',
    });
  }
  if (emails.length > 0) {
    controls.push({
      id: '__group_email',
      fieldName: 'email',
      label: 'E-mail',
    });
  }

  for (const field of metadata.fields ?? []) {
    if (!field.filterable) continue;
    controls.push({
      id: field.fieldName,
      fieldName: field.fieldName,
      label: field.label || field.fieldName,
      referenceEntity: field.referenceEntity,
    });
  }

  return controls;
}

export function getStaticOptionsForControl(
  controlId: string,
  metadata: ReportEntityMetadata,
): Values {
  const { eventTypes, emails } = extractGroupFilterOptions(metadata);
  if (controlId === '__group_eventType') return eventTypes;
  if (controlId === '__group_email') return emails;
  return [];
}

export function fieldDefinitionsToValues(fields: ReportFieldDefinition[]): Values {
  return fields.map((f) => ({
    value: f.fieldName,
    label: f.label || f.fieldName,
  }));
}
