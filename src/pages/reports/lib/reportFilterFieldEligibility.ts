import type { TFunction } from 'i18next';

import type { Values } from '@shared/ui/search_multiple_select';

import { stripDuplicateColumnSuffix } from './reportColumnDuplicate';
import { isReportIdentifierFieldPath } from './reportTableFieldIdentifier';

import type { ReportEntityMetadata, ReportFieldDefinition } from '../types/reportApiTypes';

/** Локально — без импорта composite-модулей (jest/циклы). */
const COORDINATE_MEMBER_FIELD_NAMES = ['latitude', 'longitude'] as const;
const COORDINATES_COMPOSITE_PROPERTY = '__composite.Coordinates';

/**
 * Контракт бэка: selectable=false отменяет filterable для самого поля.
 * В UI фильтрации — только filterable && selectable === true.
 */
export function isReportMetadataFilterField(field: ReportFieldDefinition): boolean {
  if (!field.filterable) return false;
  if (field.selectable !== true) return false;
  if (isReportIdentifierFieldPath(field.fieldName)) return false;
  return true;
}

/** Лист поля по path `vehicleBind.vehicle.model` относительно корневой metadata. */
export function resolveReportFilterPathLeafField(
  path: string,
  metadata: ReportEntityMetadata | null | undefined,
  nestedByName: Record<string, ReportEntityMetadata | null | undefined> = {},
): ReportFieldDefinition | undefined {
  const parts = path
    .split('.')
    .map((p) => p.trim())
    .filter(Boolean);
  if (!parts.length || !metadata?.fields?.length) return undefined;

  let meta: ReportEntityMetadata | null | undefined = metadata;
  let field: ReportFieldDefinition | undefined;

  for (let i = 0; i < parts.length; i += 1) {
    const step = parts[i];
    if (step === '__composite') {
      // __composite.Coordinates — синтетический лист
      if (parts[i + 1] === 'Coordinates') {
        return {
          fieldName: COORDINATES_COMPOSITE_PROPERTY,
          label: 'Coordinates',
          alias: null,
          type: 'COORDINATE',
          referenceEntity: null,
          filterable: true,
          sortable: false,
          groupable: false,
          selectable: true,
          aggregation: null,
          availableOperations: [],
          availableFunctions: [],
        };
      }
      return undefined;
    }

    field = meta?.fields?.find((f) => f.fieldName === step);
    if (!field) return undefined;
    if (i === parts.length - 1) return field;

    // Явная аннотация: иначе TS (строгий контроль потока в цикле) выводит «any»
    // из-за косвенной циклической ссылки meta → field → ref.
    const ref: string | undefined = field.referenceEntity?.trim();
    if (!ref) return field;
    meta = nestedByName[ref] ?? null;
  }

  return field;
}

/**
 * «Поле результата» — только пути из «Текущий состав таблицы»,
 * у которых лист filterable (selectable уже обеспечен составом колонок).
 */
export function buildReportFilterOptionsFromComposition(
  compositionFields: Values,
  metadata: ReportEntityMetadata,
  nestedByName: Record<string, ReportEntityMetadata | null | undefined>,
  t: TFunction,
): Values {
  const options: Values = [];
  const seen = new Set<string>();

  for (const item of compositionFields) {
    const rawPath = String(item.value ?? '').trim();
    if (!rawPath || seen.has(rawPath)) continue;
    if (isReportIdentifierFieldPath(rawPath)) continue;

    const isCoordComposite =
      rawPath === COORDINATES_COMPOSITE_PROPERTY ||
      rawPath.endsWith(`.${COORDINATES_COMPOSITE_PROPERTY}`);
    if (isCoordComposite) {
      seen.add(rawPath);
      options.push({
        value: rawPath,
        label:
          (item.label != null && String(item.label).trim()) ||
          t('reports.composite.entityCoordinates'),
      });
      continue;
    }

    // Клоны («field#N»): фильтруемость/leaf проверяем по БАЗОВОМУ пути,
    // а в опцию кладём ИСХОДНЫЙ ключ клона с его подписью («…_1»).
    const basePath = stripDuplicateColumnSuffix(rawPath);
    const leaf = resolveReportFilterPathLeafField(basePath, metadata, nestedByName);
    if (!leaf?.filterable) continue;

    seen.add(rawPath);
    options.push({
      value: rawPath,
      label:
        (item.label != null && String(item.label).trim()) ||
        (leaf.label ?? '').trim() ||
        rawPath,
    });
  }

  return options.sort((a, b) => a.label.localeCompare(b.label, 'ru'));
}

/**
 * Опции одного шага nested «Атрибут» — только прямые поля текущего metadata
 * (filterable && selectable). Без авто-спуска по мостам (выбор шагов вручную).
 */
export function collectReportNestedFilterPropertyOptions(
  tableMetadata: ReportEntityMetadata | null | undefined,
  t: TFunction,
): Values {
  const fields = tableMetadata?.fields ?? [];
  const options: Values = [];
  const coordMembers = new Set<string>(COORDINATE_MEMBER_FIELD_NAMES);
  let hasCoords = false;

  for (const field of fields) {
    const name = (field.fieldName ?? '').trim();
    if (!name) continue;
    if (coordMembers.has(name) && field.filterable && field.selectable === true) {
      hasCoords = true;
      continue;
    }
    if (!isReportMetadataFilterField(field)) continue;
    options.push({
      value: name,
      label: (field.label ?? '').trim() || name,
    });
  }

  if (hasCoords) {
    options.push({
      value: COORDINATES_COMPOSITE_PROPERTY,
      label: t('reports.composite.entityCoordinates'),
    });
  }

  return options.sort((a, b) => a.label.localeCompare(b.label, 'ru'));
}
