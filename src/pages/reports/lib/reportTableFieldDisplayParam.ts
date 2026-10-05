import type { Values } from '@shared/ui/search_multiple_select';

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

/** Селект «Текущий состав»: только availableFunctions текущего поля metadata. */
export function buildReportTableFieldDisplayOptions(field: ReportFieldDefinition | undefined): Values {
  if (!field) return [];
  const seen = new Set<string>();
  const merged: Values = [];
  for (const item of functionsToValues(field.availableFunctions)) {
    const key = String(item.value);
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(item);
  }
  return merged;
}

export function encodeReportTableFieldFunctionParam(code: string | undefined | null): string {
  const trimmed = String(code ?? '').trim();
  return trimmed ? `${REPORT_TABLE_FIELD_FN_PREFIX}${trimmed}` : '';
}
