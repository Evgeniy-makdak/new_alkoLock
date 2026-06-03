import { parseFieldPath } from './reportCoordinateComposite';

import type {
  ReportEntityMetadata,
  ReportFieldDefinition,
  ReportOutputRow,
} from '../types/reportApiTypes';

const VEHICLE_REFERENCE_ENTITIES = new Set(['Vehicle']);

function isVehicleColorOrTypeLeaf(path: string): boolean {
  const { leaf } = parseFieldPath(path);
  return leaf === 'color' || leaf === 'type';
}

function fieldReferencesVehicle(field: ReportFieldDefinition | undefined): boolean {
  const ref = field?.referenceEntity?.trim();
  return Boolean(ref && VEHICLE_REFERENCE_ENTITIES.has(ref));
}

function metadataTreeReferencesVehicle(
  metadata: ReportEntityMetadata | null | undefined,
  referenceEntityMetadataByName: Record<string, ReportEntityMetadata | null>,
  visited: Set<string> = new Set(),
): boolean {
  if (!metadata?.entityName) return false;
  if (metadata.entityName === 'Vehicle') return true;
  if (visited.has(metadata.entityName)) return false;
  visited.add(metadata.entityName);

  for (const field of metadata.fields ?? []) {
    if (fieldReferencesVehicle(field)) return true;
    const ref = field.referenceEntity?.trim();
    if (!ref || visited.has(ref)) continue;
    const child = referenceEntityMetadataByName[ref];
    if (child && metadataTreeReferencesVehicle(child, referenceEntityMetadataByName, visited)) {
      return true;
    }
  }
  return false;
}

/** Путь ведёт к полям color/type сущности Vehicle (например vehicle.color). */
export function isVehicleColorOrTypeFieldPath(
  path: string,
  entityMetadata: ReportEntityMetadata | null | undefined,
  fieldMap: Map<string, ReportFieldDefinition>,
  referenceEntityMetadataByName: Record<string, ReportEntityMetadata | null>,
): boolean {
  if (!isVehicleColorOrTypeLeaf(path)) return false;

  const parts = path.split('.');
  if (parts.length < 2) {
    return entityMetadata?.entityName === 'Vehicle';
  }

  const prefix = parts.slice(0, -1).join('.');
  const parentField =
    fieldMap.get(prefix) ??
    entityMetadata?.fields?.find((f) => f.fieldName === parts[0]);
  if (fieldReferencesVehicle(parentField)) return true;

  const rootField = entityMetadata?.fields?.find((f) => f.fieldName === parts[0]);
  if (fieldReferencesVehicle(rootField)) return true;

  return metadataTreeReferencesVehicle(entityMetadata, referenceEntityMetadataByName);
}

export function reportContentHasVehicleColorOrTypeColumns(keys: string[]): boolean {
  return keys.some((key) => {
    const { leaf } = parseFieldPath(key);
    return (leaf === 'color' || leaf === 'type') && key.includes('.');
  });
}

/** Нужны справочники front-data/vehicle-color и vehicle-types. */
export function shouldLoadVehicleLabelMaps(params: {
  entityMetadata?: ReportEntityMetadata | null;
  outputRows?: ReportOutputRow[];
  fieldMap?: Map<string, ReportFieldDefinition>;
  referenceEntityMetadataByName?: Record<string, ReportEntityMetadata | null>;
  contentColumnKeys?: string[];
}): boolean {
  const {
    entityMetadata,
    outputRows = [],
    fieldMap = new Map(),
    referenceEntityMetadataByName = {},
    contentColumnKeys = [],
  } = params;

  if (entityMetadata?.entityName === 'Vehicle') return true;

  if (metadataTreeReferencesVehicle(entityMetadata, referenceEntityMetadataByName)) {
    return true;
  }

  for (const row of outputRows) {
    const outputKey = row.selectedOutputFields[0] ? String(row.selectedOutputFields[0].value) : '';
    if (fieldReferencesVehicle(fieldMap.get(outputKey))) return true;

    for (const item of row.reportTableFields) {
      const path = String(item.value);
      if (
        isVehicleColorOrTypeFieldPath(
          path,
          entityMetadata ?? null,
          fieldMap,
          referenceEntityMetadataByName,
        )
      ) {
        return true;
      }
    }
  }

  if (reportContentHasVehicleColorOrTypeColumns(contentColumnKeys)) {
    return true;
  }

  return false;
}
