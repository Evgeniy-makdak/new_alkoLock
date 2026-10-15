import type { ReportAiComposeDraft } from '../types/reportAiComposeTypes';

/**
 * Человекочитаемая сводка черновика отчёта для подтверждения перед запуском.
 * Показывает, что ИИ понял из запроса: сущность, вид, колонки, фильтры, группировку, сортировку.
 */

function formatValues(values: unknown[] | undefined): string {
  if (!values?.length) return '';
  return values.map((v) => String(v)).join(', ');
}

function formatFilterLabel(fieldName: string, operator: string, values: unknown[] | undefined): string {
  const vals = formatValues(values);
  return vals ? `${fieldName} ${operator} [${vals}]` : `${fieldName} ${operator}`;
}

export function buildReportAiDraftSummary(draft: ReportAiComposeDraft): string[] {
  const lines: string[] = [];

  lines.push(`Сущность: ${draft.entityName}`);
  lines.push(`Вид: ${draft.viewMode === 'chart' ? 'график' : 'таблица'}`);

  const columns = (draft.selectedFields ?? []).map((f) => {
    const agg = f.aggregation ? ` [${f.aggregation}]` : '';
    return `${f.fieldName}${agg}`;
  });
  lines.push(`Колонки: ${columns.length ? columns.join(', ') : '(не заданы)'}`);

  const filters = (draft.filters ?? []).map((f) =>
    formatFilterLabel(f.fieldName, f.operator, f.values),
  );
  lines.push(`Фильтры: ${filters.length ? filters.join('; ') : '(нет)'}`);

  const groupBy = draft.groupBy ?? [];
  lines.push(`Группировка: ${groupBy.length ? groupBy.join(', ') : '(нет)'}`);

  const sort = draft.sort ?? [];
  lines.push(`Сортировка: ${sort.length ? sort.join('; ') : '(нет)'}`);

  if (draft.explanation) {
    lines.push(`Пояснение: ${draft.explanation}`);
  }

  if (draft.ignoredHints?.length) {
    lines.push(`Игнорировано: ${draft.ignoredHints.join('; ')}`);
  }

  return lines;
}

export function buildReportAiDraftSummaryText(draft: ReportAiComposeDraft): string {
  return buildReportAiDraftSummary(draft).join('\n');
}
