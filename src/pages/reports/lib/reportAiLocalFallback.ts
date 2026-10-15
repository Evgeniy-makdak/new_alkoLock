import { REPORT_AI_VEHICLE_MAKE_SYNONYMS } from './reportAiVehicleSynonyms';

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
    if ((lower.includes('событ') || lower.includes('движени')) && name.includes('deviceevent'))
      score += 5;
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
  const wantsCount = /количеств|сколько|статистик|подсчит|число(?:[^а-яёa-z]|$)/i.test(text);
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
    /(?:алкозам[а-яё]*|устройств[а-яё]*|serial|номер)\s*(?:с\s*)?(?:номером\s*)?(\d{4,})/i,
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

  if (/основн[а-яё]*\s+филиал/i.test(text) || /главн[а-яё]*\s+филиал/i.test(text)) {
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

  if (/аварийн[а-яё]*\s+блокир/i.test(text)) {
    resolveHints.push({
      fieldName: 'eventsForFront.label',
      kind: 'eventType',
      query: 'аварийная блокировка двигателя',
    });
  }

  if (/неразреш[а-яё]*\s+движени|движени[а-яё]*\s+без\s+разрешени/i.test(text)) {
    resolveHints.push({
      fieldName: 'eventsForFront.label',
      kind: 'eventType',
      query: 'неразрешённое движение',
    });
  }

  // Марки ТС: «Жигули», «Москвич» и т.п. → vehicleMake (несколько через «и»/«а также»).
  // \b не работает с кириллицей в JS-регэкспах — используем границы по не-буквам.
  const makeKeys = Object.keys(REPORT_AI_VEHICLE_MAKE_SYNONYMS);
  const mentionedMakes = makeKeys.filter((key) =>
    new RegExp(`(^|[^а-яёa-z])${key}([^а-яёa-z]|$)`, 'i').test(text),
  );
  if (mentionedMakes.length) {
    resolveHints.push({
      fieldName: 'vehicle.manufacturer',
      kind: 'vehicleMake',
      query: mentionedMakes.join(', '),
    });
  }

  // Относительные периоды: «предыдущий квартал», «текущий месяц» и т.п.
  const periodMatch =
    /предыдущ[а-яё]*\s+квартал|текущ[а-яё]*\s+месяц|текущ[а-яё]*\s+год|последн[а-яё]*\s+(7|30)\s+дн|прошл[а-яё]*\s+месяц|прошл[а-яё]*\s+недел/i.exec(
      text,
    );
  if (periodMatch) {
    const phrase = periodMatch[0].toLowerCase();
    const range =
      /предыдущ[а-яё]*\s+квартал/.test(phrase)
        ? 'previous_quarter'
        : /текущ[а-яё]*\s+месяц/.test(phrase)
          ? 'current_month'
          : /текущ[а-яё]*\s+год/.test(phrase)
            ? 'current_year'
            : /последн[а-яё]*\s+7\s+дн/.test(phrase)
              ? 'last_7_days'
              : /последн[а-яё]*\s+30\s+дн/.test(phrase)
                ? 'last_30_days'
                : /прошл[а-яё]*\s+месяц/.test(phrase)
                  ? 'previous_month'
                  : 'previous_week';

    const meta = context.metadataByEntity[entity.entityName];
    const timeField = meta?.fields.find((f) =>
      ['timestamp', 'reportedAt', 'createdAt', 'occurredAt'].includes(f.fieldName),
    );
    const fieldName = timeField?.fieldName ?? (entity.entityName === 'DeviceEvent' ? 'timestamp' : 'id');

    if (timeField || entity.entityName === 'DeviceEvent') {
      relativeDateRanges.push({
        fieldName,
        range,
        operator: 'between',
      });
    } else {
      ignoredHints.push(`Не найдено поле даты для периода «${phrase}».`);
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

  // «количество/сколько/статистика» → count-агрегация на ключевое поле.
  if (wantsCount && !groupBy) {
    const countTarget = selectedFields.find((f) => f.fieldName === 'id') ?? selectedFields[0];
    if (countTarget) {
      const idx = selectedFields.indexOf(countTarget);
      selectedFields[idx] = { ...countTarget, aggregation: 'count' };
    }
  }

  const periodLabel = relativeDateRanges[0]
    ? {
        previous_quarter: 'предыдущий квартал',
        previous_month: 'предыдущий месяц',
        previous_week: 'предыдущая неделя',
        current_month: 'текущий месяц',
        current_year: 'текущий год',
        last_7_days: 'последние 7 дней',
        last_30_days: 'последние 30 дней',
      }[relativeDateRanges[0].range] ?? relativeDateRanges[0].range
    : '';

  const explanationParts = [
    `Сущность: ${entity.label}`,
    `Вид: ${viewMode === 'chart' ? 'график' : 'таблица'}`,
    resolveHints.length ? `Резолв: ${resolveHints.map((h) => h.query).join(', ')}` : '',
    periodLabel ? `Период: ${periodLabel}` : '',
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
