/**
 * Готовые относительные окна (как Last 1h / 24h / 7d / 30d в Kibana/Grafana).
 * Резолвятся в абсолютный [from, to] ISO на момент вызова — в query уходит обычный between.
 */

export type ReportRollingDatePreset =
  | 'last_1_hour'
  | 'last_24_hours'
  | 'last_7_days'
  | 'last_30_days';

export type ReportRollingDatePresetOption = {
  id: ReportRollingDatePreset;
  /** i18n key under reports.* */
  labelKey: string;
};

/** Пресеты UI (подписи — через t(labelKey)). */
export const REPORT_ROLLING_DATE_PRESETS: readonly ReportRollingDatePresetOption[] = [
  { id: 'last_1_hour', labelKey: 'reports.datePresetLast1Hour' },
  { id: 'last_24_hours', labelKey: 'reports.datePresetLast24Hours' },
  { id: 'last_7_days', labelKey: 'reports.datePresetLast7Days' },
  { id: 'last_30_days', labelKey: 'reports.datePresetLast30Days' },
] as const;

/** [from, to] = [now − N, now]; секунды обнуляем для совпадения с UI ЧЧ:ММ. */
export function resolveReportRollingDateRange(
  preset: ReportRollingDatePreset,
  now: Date = new Date(),
): { from: string; to: string } {
  const to = new Date(now);
  to.setSeconds(0, 0);
  const from = new Date(to);

  switch (preset) {
    case 'last_1_hour':
      from.setHours(from.getHours() - 1);
      break;
    case 'last_24_hours':
      from.setHours(from.getHours() - 24);
      break;
    case 'last_7_days':
      from.setDate(from.getDate() - 7);
      break;
    case 'last_30_days':
      from.setDate(from.getDate() - 30);
      break;
    default: {
      const _exhaustive: never = preset;
      return _exhaustive;
    }
  }

  return { from: from.toISOString(), to: to.toISOString() };
}
