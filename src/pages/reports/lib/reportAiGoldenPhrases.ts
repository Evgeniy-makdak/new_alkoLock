/**
 * Эталонные русские фразы для регрессии NL → ReportQueryRequest.
 * Используются в UI как примеры и для локального smoke без Gemini.
 */
export type ReportAiGoldenPhrase = {
  id: string;
  text: string;
  /** Ожидаемая сущность (мягкая проверка). */
  expectEntity?: string;
  expectViewMode?: 'table' | 'chart';
  notes?: string;
};

export const REPORT_AI_GOLDEN_PHRASES: ReportAiGoldenPhrase[] = [
  {
    id: 'drivers-failed-test-quarter',
    text: 'Выведи мне статистику по всем водителям из основного филиала с результатом тестирования «тестирование не пройдено» за предыдущий квартал',
    expectEntity: 'DeviceEvent',
    expectViewMode: 'table',
    notes: 'groupBy user + branch resolve + eventType + previous_quarter',
  },
  {
    id: 'pie-engine-lock-device',
    text: 'Покажи мне графически в виде круговой диаграммы количество аварийных блокировок двигателя у алкозамка с номером 7777777. При этом отфильтруй список в порядке возрастания по координатам широта',
    expectEntity: 'DeviceEvent',
    expectViewMode: 'chart',
    notes: 'pie chart; sort by latitude ignoredHint',
  },
  {
    id: 'vehicle-events-month',
    text: 'Список событий по ТС за текущий месяц в виде таблицы',
    expectEntity: 'DeviceEvent',
    expectViewMode: 'table',
  },
  {
    id: 'alcolock-serial-table',
    text: 'Покажи отчёт по алкозамку с серийным номером 1234567',
    expectEntity: 'MonitoringDevice',
    expectViewMode: 'table',
  },
  {
    id: 'users-branch',
    text: 'Отчёт по пользователям основного филиала',
    expectEntity: 'User',
    expectViewMode: 'table',
  },
  {
    id: 'bar-chart-events',
    text: 'Построй столбчатую диаграмму по типам событий за последние 30 дней',
    expectEntity: 'DeviceEvent',
    expectViewMode: 'chart',
  },
  {
    id: 'lat-sort-only',
    text: 'Выведи события отсортированные по широте по возрастанию',
    expectEntity: 'DeviceEvent',
    expectViewMode: 'table',
  },
  {
    id: 'autoservice',
    text: 'Отчёт по истории автосервиса за предыдущий месяц',
    expectEntity: 'AutoServiceHistory',
    expectViewMode: 'table',
  },
  {
    id: 'unauthorized-moves-zhiguli-moskvich-month',
    text: 'Создай отчёт по основному филиалу, в котором будет показано количество неразрешённых движений для автомобилей Жигули, а также Москвич за текущий месяц',
    expectEntity: 'DeviceEvent',
    expectViewMode: 'table',
    notes: 'count + branch resolve + eventType + vehicleMake (multi) + current_month',
  },
];

export function matchGoldenPhraseExpectations(
  phrase: ReportAiGoldenPhrase,
  draft: { entityName: string; viewMode: 'table' | 'chart' },
): string[] {
  const issues: string[] = [];
  if (phrase.expectEntity && draft.entityName !== phrase.expectEntity) {
    issues.push(`entity: expected ${phrase.expectEntity}, got ${draft.entityName}`);
  }
  if (phrase.expectViewMode && draft.viewMode !== phrase.expectViewMode) {
    issues.push(`viewMode: expected ${phrase.expectViewMode}, got ${draft.viewMode}`);
  }
  return issues;
}
