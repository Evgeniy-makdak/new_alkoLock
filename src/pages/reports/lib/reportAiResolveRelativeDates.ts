import type {
  ReportAiRelativeDateRange,
  ReportAiComposeDraft,
} from '../types/reportAiComposeTypes';
import type { ReportQueryFilter } from '../types/reportApiTypes';

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

/** Диапазон [from, to] в ISO для relativeDateRanges. */
export function resolveReportAiRelativeDateRange(
  range: ReportAiRelativeDateRange,
  now: Date = new Date(),
): { from: string; to: string } {
  const today = startOfDay(now);

  switch (range) {
    case 'last_7_days': {
      const from = new Date(today);
      from.setDate(from.getDate() - 6);
      return { from: from.toISOString(), to: endOfDay(now).toISOString() };
    }
    case 'last_30_days': {
      const from = new Date(today);
      from.setDate(from.getDate() - 29);
      return { from: from.toISOString(), to: endOfDay(now).toISOString() };
    }
    case 'previous_week': {
      const day = today.getDay() || 7;
      const thisMonday = new Date(today);
      thisMonday.setDate(today.getDate() - (day - 1));
      const prevMonday = new Date(thisMonday);
      prevMonday.setDate(thisMonday.getDate() - 7);
      const prevSunday = new Date(thisMonday);
      prevSunday.setDate(thisMonday.getDate() - 1);
      return {
        from: startOfDay(prevMonday).toISOString(),
        to: endOfDay(prevSunday).toISOString(),
      };
    }
    case 'previous_month': {
      const from = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const to = new Date(today.getFullYear(), today.getMonth(), 0);
      return { from: startOfDay(from).toISOString(), to: endOfDay(to).toISOString() };
    }
    case 'current_month': {
      const from = new Date(today.getFullYear(), today.getMonth(), 1);
      return { from: startOfDay(from).toISOString(), to: endOfDay(now).toISOString() };
    }
    case 'current_year': {
      const from = new Date(today.getFullYear(), 0, 1);
      return { from: startOfDay(from).toISOString(), to: endOfDay(now).toISOString() };
    }
    case 'previous_quarter':
    default: {
      const month = today.getMonth();
      const quarter = Math.floor(month / 3);
      const prevQuarter = quarter === 0 ? 3 : quarter - 1;
      const year = quarter === 0 ? today.getFullYear() - 1 : today.getFullYear();
      const from = new Date(year, prevQuarter * 3, 1);
      const to = new Date(year, prevQuarter * 3 + 3, 0);
      return { from: startOfDay(from).toISOString(), to: endOfDay(to).toISOString() };
    }
  }
}

/** Вшивает relativeDateRanges в filters (between / greaterThanOrEqual+lessThanOrEqual). */
export function applyRelativeDateRangesToDraft(
  draft: ReportAiComposeDraft,
  now: Date = new Date(),
): ReportAiComposeDraft {
  const ranges = draft.relativeDateRanges ?? [];
  if (!ranges.length) return draft;

  const filters: ReportQueryFilter[] = [...(draft.filters ?? [])];
  for (const item of ranges) {
    const fieldName = (item.fieldName ?? '').trim();
    if (!fieldName) continue;
    const { from, to } = resolveReportAiRelativeDateRange(item.range, now);
    const op = (item.operator ?? 'between').trim() || 'between';
    const already = filters.some((f) => f.fieldName === fieldName);
    if (already) continue;
    filters.push({
      fieldName,
      operator: op,
      values: [from, to],
    });
  }

  return {
    ...draft,
    filters,
    relativeDateRanges: undefined,
  };
}
