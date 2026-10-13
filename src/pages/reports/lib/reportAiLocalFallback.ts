import type { ReportAiComposeDraft, ReportAiPromptContext } from '../types/reportAiComposeTypes';
import type { ReportSelectedFieldPayload } from '../types/reportApiTypes';

function pickEntity(
  text: string,
  context: ReportAiPromptContext,
): { entityName: string; label: string } {
  const lower = text.toLowerCase();
  const scored = context.entities.map((e) => {
    const label = e.label.toLowerCase();
    const name = e.entityName.toLowerCase();
    let score = 0;
    if (lower.includes('событ') && name.includes('deviceevent')) score += 5;
    if (lower.includes('водител') && (name === 'user' || name === 'driver')) score += 4;
    if ((lower.includes('алкозам') || lower.includes('устройств')) && name.includes('monitoring'))
      score += 5;
    if ((lower.includes(' тс') || lower.includes('транспорт') || lower.includes('машин')) && name === 'vehicle')
      score += 4;
    if (lower.includes('автосервис') && name.toLowerCase().includes('autoservice')) score += 5;
    if (lower.includes(label)) score += 3;
    return { e, score };
  });
  scored.sort((a, b) => b.score - a.score);
  const best = scored[0]?.score ? scored[0].e : context.entities.find((e) => e.entityName === 'DeviceEvent');
  return best ?? { entityName: 'DeviceEvent', label: 'DeviceEvent' };
}

function defaultFieldsForEntity(entityName: string, context: ReportAiPromptContext): string[] {
  const meta = context.metadataByEntity[entityName];
  const names = (meta?.fields ?? [])
    .filter((f) => f.selectable && f.type.toUpperCase() !== 'ENTITY')
    .map((f) => f.fieldName);
  const preferred =
    entityName === 'DeviceEvent'
      ? ['id', 'timestamp', 'latitude', 'longitude']
      : entityName === 'User'
        ? ['id', 'surname', 'firstName', 'phone']
        : entityName === 'MonitoringDevice'
          ? ['id', 'name', 'serialNumber']
          : entityName === 'Vehicle'
            ? ['id', 'registrationNumber', 'manufacturer', 'model']
            : ['id'];
  const out = preferred.filter((p) => names.includes(p));
  if (!out.length && names[0]) out.push(names[0]);
  return out.slice(0, 6);
}

/**
 * Детерминированный черновик без Gemini — для dev без ключа и как запасной путь.
 * Покрывает типовые русские формулировки из golden phrases.
 */
export function buildLocalReportAiComposeDraft(
  userText: string,
  context: ReportAiPromptContext,
): ReportAiComposeDraft {
  const text = userText.trim();
  const lower = text.toLowerCase();
  const entity = pickEntity(text, context);
  const selectedFields: ReportSelectedFieldPayload[] = defaultFieldsForEntity(
    entity.entityName,
    context,
  ).map((fieldName) => ({ fieldName }));

  const ignoredHints: string[] = [];
  const wantsChart =
    /график|диаграмм|кругов|pie|chart|визуал/i.test(text);
  const wantsSort = /сортир|порядк|возрастани|убывани/i.test(text);
  let viewMode: 'table' | 'chart' = wantsChart ? 'chart' : 'table';
  if (wantsChart && wantsSort) {
    ignoredHints.push('Сортировка списка проигнорирована в пользу графика.');
  }

  const resolveHints: ReportAiComposeDraft['resolveHints'] = [];
  const relativeDateRanges: ReportAiComposeDraft['relativeDateRanges'] = [];
  const filters: ReportAiComposeDraft['filters'] = [];
  const sort: string[] = [];
  let groupBy: string[] | undefined;
  let chartSpec: ReportAiComposeDraft['chartSpec'];

  const serialMatch = text.match(
    /(?:алкозам\w*|устройств\w*|serial|номер)\s*(?:с\s*)?(?:номером\s*)?(\d{4,})/i,
  ) || text.match(/\b(\d{7,})\b/);
  if (serialMatch && entity.entityName === 'DeviceEvent') {
    resolveHints.push({
      fieldName: 'device.id',
      kind: 'device',
      query: serialMatch[1],
    });
  } else if (serialMatch && entity.entityName === 'MonitoringDevice') {
    resolveHints.push({
      fieldName: 'id',
      kind: 'device',
      query: serialMatch[1],
    });
  }

  if (/основн\w*\s+филиал/i.test(text) || /главн\w*\s+филиал/i.test(text)) {
    resolveHints.push({
      fieldName: entity.entityName === 'DeviceEvent' ? 'branch.id' : 'assignment.branch.id',
      kind: 'branch',
      query: 'основной',
    });
  }

  if (/тестирование\s+не\s+пройдено/i.test(text) || /не\s+пройден/i.test(text)) {
    resolveHints.push({
      fieldName: 'eventsForFront.label',
      kind: 'eventType',
      query: 'тестирование не пройдено',
    });
  }

  if (/аварийн\w*\s+блокир/i.test(text)) {
    resolveHints.push({
      fieldName: 'eventsForFront.label',
      kind: 'eventType',
      query: 'аварийная блокировка двигателя',
    });
  }

  if (/предыдущ\w*\s+квартал/i.test(text)) {
    relativeDateRanges.push({
      fieldName: entity.entityName === 'DeviceEvent' ? 'timestamp' : 'id',
      range: 'previous_quarter',
      operator: 'between',
    });
    // для User нет timestamp в default — поправим field если есть
    const meta = context.metadataByEntity[entity.entityName];
    const timeField = meta?.fields.find((f) =>
      ['timestamp', 'reportedAt', 'createdAt', 'occurredAt'].includes(f.fieldName),
    );
    if (timeField) {
      relativeDateRanges[relativeDateRanges.length - 1].fieldName = timeField.fieldName;
    } else if (entity.entityName !== 'DeviceEvent') {
      relativeDateRanges.pop();
      ignoredHints.push('Не найдено поле даты для «предыдущий квартал».');
    }
  }

  if (/водител/i.test(text) && /статистик/i.test(text)) {
    groupBy = entity.entityName === 'DeviceEvent' ? ['user.id'] : ['id'];
    if (!selectedFields.some((f) => f.fieldName === 'id')) {
      selectedFields.unshift({ fieldName: 'id', aggregation: 'count' });
    } else {
      selectedFields[0] = { ...selectedFields[0], aggregation: 'count' };
    }
  }

  if (viewMode === 'chart') {
    chartSpec = {
      type: /кругов|pie/i.test(text) ? 'pie' : 'bar',
      encoding: {
        categoryField: 'eventsForFront.label',
        valueField: null,
        seriesField: null,
      },
    };
  }

  if (viewMode === 'table' && wantsSort && /широт|latitude/i.test(text)) {
    sort.push(/убыв/i.test(text) ? 'latitude,DESC' : 'latitude,ASC');
  }

  const explanationParts = [
    `Сущность: ${entity.label}`,
    `Вид: ${viewMode === 'chart' ? 'график' : 'таблица'}`,
    resolveHints.length ? `Резолв: ${resolveHints.map((h) => h.query).join(', ')}` : '',
    relativeDateRanges.length ? 'Период: предыдущий квартал' : '',
  ].filter(Boolean);

  return {
    entityName: entity.entityName,
    selectedFields,
    filters,
    ...(groupBy ? { groupBy } : {}),
    ...(sort.length ? { sort } : {}),
    viewMode,
    ...(chartSpec ? { chartSpec } : {}),
    explanation: explanationParts.join('; '),
    ...(ignoredHints.length ? { ignoredHints } : {}),
    ...(relativeDateRanges.length ? { relativeDateRanges } : {}),
    ...(resolveHints.length ? { resolveHints } : {}),
  };
}
