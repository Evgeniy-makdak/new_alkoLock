import type { ReportAiComposeDraft } from '../types/reportAiComposeTypes';
import type { ReportEntityMetadata } from '../types/reportApiTypes';

import {
  resolveReportAiFilterFieldLabel,
  resolveReportAiOperatorLabel,
} from './reportAiFieldLabels';

/**
 * Человекочитаемая сводка черновика отчёта для подтверждения перед запуском.
 * Показывает, что ИИ понял из запроса: сущность, вид, колонки, фильтры, группировку, сортировку.
 */

export type ReportAiDraftSummaryLabels = {
  entityLabel?: string;
  /** path → UI label (из metadata.label / compose options). */
  fieldLabels?: Record<string, string>;
  metadata?: ReportEntityMetadata | null;
  referenceEntityMetadataByName?: Record<string, ReportEntityMetadata | null | undefined>;
};

function formatValues(values: unknown[] | undefined): string {
  if (!values?.length) return '';
  return values.map((v) => String(v)).join(', ');
}

function formatAggregation(code: string | undefined, fieldLabels: Record<string, string>): string {
  const raw = (code ?? '').trim();
  if (!raw) return '';
  // Типовые коды бэка → короткая русская пометка в сводке AI.
  const known: Record<string, string> = {
    count: 'Количество',
    countdistinct: 'Количество уникальных',
    sum: 'Сумма',
    avg: 'Среднее',
    min: 'Минимум',
    max: 'Максимум',
  };
  const key = raw.toLowerCase().replace(/[_-]/g, '');
  return known[key] ?? fieldLabels[raw] ?? raw;
}

function formatFilterLabel(
  fieldName: string,
  operator: string,
  values: unknown[] | undefined,
  labels: ReportAiDraftSummaryLabels,
): string {
  const nested = labels.referenceEntityMetadataByName ?? {};
  const fieldLabel = resolveReportAiFilterFieldLabel(
    fieldName,
    labels.metadata,
    nested,
    labels.fieldLabels,
  );
  const opLabel = resolveReportAiOperatorLabel(
    operator,
    fieldName,
    labels.metadata,
    nested,
  );
  const vals = formatValues(values);
  return vals ? `${fieldLabel} ${opLabel} [${vals}]` : `${fieldLabel} ${opLabel}`;
}

export function buildReportAiDraftSummary(
  draft: ReportAiComposeDraft,
  labels: ReportAiDraftSummaryLabels = {},
): string[] {
  const lines: string[] = [];
  const fieldLabels = labels.fieldLabels ?? {};

  lines.push(`Сущность: ${labels.entityLabel?.trim() || draft.entityName}`);
  lines.push(`Вид: ${draft.viewMode === 'chart' ? 'график' : 'таблица'}`);

  const columns = (draft.selectedFields ?? []).map((f) => {
    const path = (f.fieldName ?? '').trim();
    const name = (fieldLabels[path] ?? '').trim() || path;
    const agg = f.aggregation ? ` [${formatAggregation(f.aggregation, fieldLabels)}]` : '';
    return `${name}${agg}`;
  });
  lines.push(`Колонки: ${columns.length ? columns.join(', ') : '(не заданы)'}`);

  const filters = (draft.filters ?? []).map((f) =>
    formatFilterLabel(f.fieldName, f.operator, f.values, labels),
  );
  lines.push(`Фильтры: ${filters.length ? filters.join('; ') : '(нет)'}`);

  const groupBy = (draft.groupBy ?? []).map(
    (path) => (fieldLabels[path] ?? '').trim() || path,
  );
  lines.push(`Группировка: ${groupBy.length ? groupBy.join(', ') : '(нет)'}`);

  const sort = (draft.sort ?? []).map((param) => {
    const comma = param.lastIndexOf(',');
    if (comma <= 0) return param;
    const field = param.slice(0, comma).trim();
    const dir = param.slice(comma + 1).trim();
    const name = (fieldLabels[field] ?? '').trim() || field;
    return `${name},${dir}`;
  });
  lines.push(`Сортировка: ${sort.length ? sort.join('; ') : '(нет)'}`);

  if (draft.explanation) {
    lines.push(`Пояснение: ${draft.explanation}`);
  }

  if (draft.ignoredHints?.length) {
    lines.push(`Игнорировано: ${draft.ignoredHints.join('; ')}`);
  }

  return lines;
}

export function buildReportAiDraftSummaryText(
  draft: ReportAiComposeDraft,
  labels?: ReportAiDraftSummaryLabels,
): string {
  return buildReportAiDraftSummary(draft, labels).join('\n');
}
