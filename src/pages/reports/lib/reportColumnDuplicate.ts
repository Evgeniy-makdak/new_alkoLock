import type { Values } from '@shared/ui/search_multiple_select';

/**
 * Составные ключи строк «Текущего состава таблицы» для дублирования колонок.
 * Первое вхождение поля — обычный fieldPath (например «latitude»);
 * дубликаты — «latitude#2», «latitude#3», … — УНИКАЛЬНЫЕ ключи для отдельной
 * агрегации/алиаса/видимости каждой строки.
 * Перед сборкой запроса суффикс «#N» срезается до реального fieldPath.
 */

export const REPORT_COLUMN_DUP_SEPARATOR = '#';

const DUP_SUFFIX_PATTERN = /#\d+$/;

/** Ключ — дубликат (содержит суффикс «#N»)? */
export function isDuplicateColumnKey(key: string): boolean {
  return DUP_SUFFIX_PATTERN.test(String(key ?? ''));
}

/** Срезает суффикс «#N» → реальный fieldPath. Не-дубликаты возвращает как есть. */
export function stripDuplicateColumnSuffix(key: string): string {
  return String(key ?? '').replace(DUP_SUFFIX_PATTERN, '');
}

/** Порядковый номер вхождения: первая строка = 1, дубликат «…#N» = N. */
export function getDuplicateColumnIndex(key: string): number {
  const match = String(key ?? '').match(/#(\d+)$/);
  return match ? Number(match[1]) : 1;
}

/** Следующий уникальный ключ дубликата для базового fieldPath. */
export function buildDuplicateColumnKey(baseKey: string, index: number): string {
  return `${stripDuplicateColumnSuffix(baseKey)}${REPORT_COLUMN_DUP_SEPARATOR}${index}`;
}

/**
 * Приводит список строк состава к уникальным ключам: повторные вхождения одного
 * base fieldPath переименовываются в «field#2», «field#3», … (первое остаётся «field»).
 * Нужно при восстановлении из store/query, где дубли могут прийти с одинаковым ключом.
 */
export function normalizeDuplicateColumnKeys(values: Values): Values {
  const seen = new Map<string, number>();
  return values.map((item) => {
    const base = stripDuplicateColumnSuffix(String(item.value ?? ''));
    const count = (seen.get(base) ?? 0) + 1;
    seen.set(base, count);
    return count === 1
      ? { ...item, value: base }
      : { ...item, value: buildDuplicateColumnKey(base, count) };
  });
}
