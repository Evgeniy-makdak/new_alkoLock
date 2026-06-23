/** Нормализует id филиалов для query-параметра all.branch.id.in. */
export function normalizeReportBranchIds(branchIds?: Array<number | string | null | undefined>): number[] {
  if (!branchIds?.length) return [];
  const unique = new Set<number>();
  for (const raw of branchIds) {
    const id = Number(raw);
    if (Number.isFinite(id)) {
      unique.add(id);
    }
  }
  return Array.from(unique);
}

/** Добавляет all.branch.id.in=… к частям query string (как в api/device-events). */
export function appendReportBranchIdsToQueryParts(
  queryParts: string[],
  branchIds?: Array<number | string | null | undefined>,
): void {
  const normalized = normalizeReportBranchIds(branchIds);
  if (!normalized.length) return;
  queryParts.push(`all.branch.id.in=${normalized.join(',')}`);
}
