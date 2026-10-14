import type { Values } from '@shared/ui/search_multiple_select';

import {
  isReportIdentifierAggregationCode,
  isReportIdentifierFieldPath,
  REPORT_IDENTIFIER_AGGREGATION_CODE,
} from './reportTableFieldIdentifier';
import type { ReportFieldDefinition, ReportFieldOperation } from '../types/reportApiTypes';

export const REPORT_TABLE_FIELD_FN_PREFIX = 'fn:';

export function parseReportTableFieldDisplayParam(
  encoded: string | undefined | null,
): { kind: 'function'; code: string } | null {
  if (!encoded) return null;
  if (encoded.startsWith(REPORT_TABLE_FIELD_FN_PREFIX)) {
    const code = encoded.slice(REPORT_TABLE_FIELD_FN_PREFIX.length).trim();
    return code ? { kind: 'function', code } : null;
  }
  const legacy = encoded.trim();
  return legacy && !legacy.includes(':') ? { kind: 'function', code: legacy } : null;
}

function functionsToValues(ops: ReportFieldOperation[] | undefined): Values {
  return (ops ?? [])
    .map((op) => {
      const code = String(op.code ?? '').trim();
      if (!code) return null;
      return {
        value: `${REPORT_TABLE_FIELD_FN_PREFIX}${code}`,
        label: (op.label || code).trim() || code,
      };
    })
    .filter((item): item is NonNullable<typeof item> => item != null);
}

/** Закодированный fn:count для Идентификатора. */
export function encodeReportIdentifierDisplayParam(): string {
  return encodeReportTableFieldFunctionParam(REPORT_IDENTIFIER_AGGREGATION_CODE);
}

/** Селект «Текущий состав»: только availableFunctions текущего поля metadata. */
export function buildReportTableFieldDisplayOptions(
  field: ReportFieldDefinition | undefined,
  fieldPath?: string,
): Values {
  if (!field) return [];
  const seen = new Set<string>();
  const merged: Values = [];
  const path = fieldPath ?? field.fieldName;
  const identifierOnly = isReportIdentifierFieldPath(path);
  for (const item of functionsToValues(field.availableFunctions)) {
    const key = String(item.value);
    if (seen.has(key)) continue;
    if (identifierOnly) {
      const code = key.startsWith(REPORT_TABLE_FIELD_FN_PREFIX)
        ? key.slice(REPORT_TABLE_FIELD_FN_PREFIX.length)
        : key;
      if (!isReportIdentifierAggregationCode(code)) continue;
    }
    seen.add(key);
    merged.push(item);
  }
  // Идентификатор: всегда ровно один вариант — Количество (даже если metadata пустая/без count).
  if (identifierOnly && merged.length === 0) {
    const countOp = (field.availableFunctions ?? []).find((op) =>
      isReportIdentifierAggregationCode(String(op.code ?? '')),
    );
    const code = String(countOp?.code ?? REPORT_IDENTIFIER_AGGREGATION_CODE).trim();
    merged.push({
      value: encodeReportTableFieldFunctionParam(code),
      label: (countOp?.label || code).trim() || code,
    });
  }
  return merged;
}

export function encodeReportTableFieldFunctionParam(code: string | undefined | null): string {
  const trimmed = String(code ?? '').trim();
  return trimmed ? `${REPORT_TABLE_FIELD_FN_PREFIX}${trimmed}` : '';
}
