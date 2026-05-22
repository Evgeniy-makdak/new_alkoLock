import type { ReportLogicConnect, ReportLogicOperator } from '../types/reportApiTypes';

/** Номер группы фильтров в POST: строки 0–1 → 1, 2–3 → 2, … */
export function reportFilterGroupNumberForRowIndex(rowIndex: number): number {
  return Math.floor(rowIndex / 2) + 1;
}

/** Количество групп при N строках фильтра (по две строки в группе). */
export function reportFilterPairGroupCount(rowCount: number): number {
  return Math.ceil(rowCount / 2);
}

/**
 * Связи между группами фильтров (И/ИЛИ при добавлении варианта).
 * — 2 строки (обе в group 1): одна связь { groupNumber: 1 }.
 * — 3 строки (group 1 + group 2 из одной строки): связь между строками в паре 1
 *   и отдельная связь с последней «неполной» группой { groupNumber: 2 }.
 * — 4 строки (две полные пары): одна связь между group 1 и group 2.
 */
export function buildReportLogicConnects(
  activeRowCount: number,
  logicOperator: ReportLogicOperator,
): ReportLogicConnect[] {
  if (activeRowCount <= 1) {
    return [];
  }

  if (activeRowCount === 2) {
    return [{ groupNumber: 1, logicOperator }];
  }

  const pairGroupCount = reportFilterPairGroupCount(activeRowCount);
  const connects: ReportLogicConnect[] = Array.from(
    { length: Math.max(0, pairGroupCount - 1) },
    (_, index) => ({
      groupNumber: index + 1,
      logicOperator,
    }),
  );

  // Нечётное число строк: последняя группа из одной строки — нужна связь с groupNumber последней группы.
  if (activeRowCount % 2 === 1) {
    const lastGroupNumber = pairGroupCount;
    if (!connects.some((c) => c.groupNumber === lastGroupNumber)) {
      connects.push({ groupNumber: lastGroupNumber, logicOperator });
    }
  }

  return connects;
}
