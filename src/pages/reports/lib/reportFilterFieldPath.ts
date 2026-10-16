import type { ReportEntityMetadata, ReportFieldDefinition } from '../types/reportApiTypes';

/** Корень metadata + хвост path для filter fieldName вида assignment.branch.name. */
export function findRootFieldForFilterPath(
  fieldName: string,
  metadata: ReportEntityMetadata,
): { primary: ReportFieldDefinition; nestedPath: string[] } | null {
  const path = fieldName.trim();
  if (!path) return null;

  let best: ReportFieldDefinition | null = null;
  for (const field of metadata.fields) {
    const name = (field.fieldName ?? '').trim();
    if (!name) continue;
    if (path === name || path.startsWith(`${name}.`)) {
      if (!best || name.length >= (best.fieldName?.length ?? 0)) {
        best = field;
      }
    }
  }
  if (!best) return null;

  const primaryName = best.fieldName.trim();
  const rest =
    path === primaryName ? '' : path.slice(primaryName.length).replace(/^\./, '');
  const nestedPath = rest ? rest.split('.').filter(Boolean) : [];
  return { primary: best, nestedPath };
}
