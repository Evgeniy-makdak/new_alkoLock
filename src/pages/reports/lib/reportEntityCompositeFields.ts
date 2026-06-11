import type { TFunction } from 'i18next';

import { formatDeviceNameSerialLabel } from './deviceActionReportOptions';
import {
  COORDINATE_MEMBER_FIELD_NAMES,
  COORDINATES_COMPOSITE_KIND,
  applyReportCoordinateFieldGrouping,
  buildReportCoordinatesCompositePropertyFieldName,
  buildSyntheticCoordinatesFilterField,
  expandCoordinatesCompositeFieldPath,
  formatReportCoordinatesCompositeCellValue,
  isReportCoordinateMemberField,
  isReportCoordinatesCompositePath,
  isReportCoordinatesCompositePropertyFieldName,
  isRootCoordinatesCompositeOutputFilter,
} from './reportCoordinateComposite';
import {
  REPORT_EMPTY_DISPLAY,
  finalizeReportCellDisplay,
  formatReportCarDisplay,
  isReportEmptyValue,
} from './reportDisplayValue';

import {
  buildReportTableFieldLeafKey,
  formatRootReportTableFieldLabel,
  type ReportTableFieldOptionDraft,
} from './buildReportTableFieldOptions';

import { Formatters } from '@shared/utils/formatters';

import type { Values } from '@shared/ui/search_multiple_select';

import type {
  ReportEntityMetadata,
  ReportFieldDefinition,
  ReportSelectedFieldPayload,
} from '../types/reportApiTypes';

/** Сегмент пути для объединённой колонки (не поле metadata). */
export const REPORT_COMPOSITE_SEGMENT = '__composite';

export type ReportEntityCompositeKind = 'User' | 'MonitoringDevice' | 'Vehicle';

type ReportEntityCompositeConfig = {
  referenceEntity: ReportEntityCompositeKind;
  memberFieldNames: string[];
  /** Длинная подпись колонки таблицы. */
  labelKey: string;
  /** Короткая подпись в фильтрах («Пользователь», «Алкозамок», «ТС»). */
  entityLabelKey: string;
};

const COMPOSITE_CONFIGS: ReportEntityCompositeConfig[] = [
  {
    referenceEntity: 'User',
    memberFieldNames: ['surname', 'firstName', 'middleName', 'email'],
    labelKey: 'reports.composite.userDisplay',
    entityLabelKey: 'reports.composite.entityUser',
  },
  {
    referenceEntity: 'MonitoringDevice',
    memberFieldNames: ['name', 'serialNumber'],
    labelKey: 'reports.composite.deviceDisplay',
    entityLabelKey: 'reports.composite.entityDevice',
  },
  {
    referenceEntity: 'Vehicle',
    memberFieldNames: ['manufacturer', 'model', 'registrationNumber'],
    labelKey: 'reports.composite.vehicleDisplay',
    entityLabelKey: 'reports.composite.entityVehicle',
  },
];

const CONFIG_BY_ENTITY = new Map(
  COMPOSITE_CONFIGS.map((c) => [c.referenceEntity, c] as const),
);

const MEMBER_FIELDS_GLOBAL = new Set(
  COMPOSITE_CONFIGS.flatMap((c) => c.memberFieldNames),
);

function resolveCompositeKind(referenceEntity: string): ReportEntityCompositeKind | undefined {
  if (referenceEntity === 'Driver') {
    return 'User';
  }
  const kind = referenceEntity as ReportEntityCompositeKind;
  return CONFIG_BY_ENTITY.has(kind) ? kind : undefined;
}

export function getReportEntityCompositeConfig(
  referenceEntity: string,
): ReportEntityCompositeConfig | undefined {
  const kind = resolveCompositeKind(referenceEntity);
  return kind ? CONFIG_BY_ENTITY.get(kind) : undefined;
}

export function getReportCompositeEntityLabelKey(kind: ReportEntityCompositeKind): string {
  return CONFIG_BY_ENTITY.get(kind)?.entityLabelKey ?? kind;
}

export function isReportCompositeFieldPath(path: string): boolean {
  return path.split('.').includes(REPORT_COMPOSITE_SEGMENT);
}

function compositeSegmentForEntity(referenceEntity: string): string {
  return `${REPORT_COMPOSITE_SEGMENT}.${referenceEntity}`;
}

export function buildReportCompositeFieldPath(prefix: string, compositeKind: string): string {
  const segment = compositeSegmentForEntity(compositeKind);
  return prefix ? `${prefix}.${segment}` : segment;
}

function parseFieldPath(path: string): { prefix: string; leaf: string } {
  const trimmed = path.trim();
  const dot = trimmed.lastIndexOf('.');
  if (dot < 0) return { prefix: '', leaf: trimmed };
  return { prefix: trimmed.slice(0, dot), leaf: trimmed.slice(dot + 1) };
}

function referenceEntityFromLeafKey(leafKey: string): string | null {
  const idx = leafKey.indexOf(':');
  if (idx < 0) return null;
  return leafKey.slice(0, idx);
}

/**
 * В списках колонок заменяет набор полей-членов одной объединённой опцией.
 */
export function applyReportEntityCompositeFieldGrouping(
  drafts: ReportTableFieldOptionDraft[],
  t: TFunction,
): ReportTableFieldOptionDraft[] {
  type GroupKey = string;
  const groups = new Map<
    GroupKey,
    {
      config: ReportEntityCompositeConfig;
      sourceLabel: string;
      prefix: string;
      members: ReportTableFieldOptionDraft[];
    }
  >();

  const passthrough: ReportTableFieldOptionDraft[] = [];

  for (const draft of drafts) {
    const ref = referenceEntityFromLeafKey(draft.leafKey);
    const kind = ref ? resolveCompositeKind(ref) : undefined;
    const config = kind ? CONFIG_BY_ENTITY.get(kind) : undefined;
    const { prefix, leaf } = parseFieldPath(draft.value);
    if (!config || !config.memberFieldNames.includes(leaf)) {
      passthrough.push(draft);
      continue;
    }
    const gk = `${kind}\0${prefix}\0${draft.sourceLabel}`;
    let group = groups.get(gk);
    if (!group) {
      group = {
        config,
        sourceLabel: draft.sourceLabel,
        prefix,
        members: [],
      };
      groups.set(gk, group);
    }
    group.members.push(draft);
  }

  const compositeDrafts: ReportTableFieldOptionDraft[] = [];
  for (const group of Array.from(groups.values())) {
    const compositePath = buildReportCompositeFieldPath(
      group.prefix,
      group.config.referenceEntity,
    );
    compositeDrafts.push({
      value: compositePath,
      baseLabel: t(group.config.labelKey),
      sourceLabel: group.sourceLabel,
      qualifyAs: group.prefix ? 'nested' : 'root',
      leafKey: buildReportTableFieldLeafKey(
        group.config.referenceEntity,
        `${REPORT_COMPOSITE_SEGMENT}.${group.config.referenceEntity}`,
      ),
    });
  }

  const memberLeavesToHide = new Set<string>();
  for (const group of Array.from(groups.values())) {
    for (const m of group.members) {
      memberLeavesToHide.add(m.value);
    }
  }

  const filteredPassthrough = passthrough.filter((d) => !memberLeavesToHide.has(d.value));
  return applyReportCoordinateFieldGrouping([...filteredPassthrough, ...compositeDrafts], t);
}

export function expandCompositeFieldPath(path: string): string[] {
  if (isReportCoordinatesCompositePath(path)) {
    return expandCoordinatesCompositeFieldPath(path);
  }
  if (!isReportCompositeFieldPath(path)) return [path];
  const parts = path.split('.');
  const segIdx = parts.indexOf(REPORT_COMPOSITE_SEGMENT);
  if (segIdx < 0 || segIdx + 1 >= parts.length) return [path];
  const referenceEntity = parts[segIdx + 1];
  const config = getReportEntityCompositeConfig(referenceEntity);
  if (!config) return [path];
  const prefix = parts.slice(0, segIdx).join('.');
  return config.memberFieldNames.map((leaf) =>
    prefix ? `${prefix}.${leaf}` : leaf,
  );
}

export function expandCompositeSelectedFields(
  items: ReportSelectedFieldPayload[],
): ReportSelectedFieldPayload[] {
  return items.flatMap((item) => {
    if (!isReportCompositeFieldPath(item.fieldName)) {
      return [item];
    }
    const members = expandCompositeFieldPath(item.fieldName).filter(
      (member) => !isReportCompositeFieldPath(member),
    );
    if (!members.length) {
      return [];
    }
    return members.map((fieldName) => ({
      fieldName,
      aggregation: item.aggregation,
      alias: item.alias,
    }));
  });
}

export type ReportCompositeKind = ReportEntityCompositeKind | typeof COORDINATES_COMPOSITE_KIND;

type CompositeColumnGroup = {
  compositeKey: string;
  memberKeys: string[];
  kind: ReportCompositeKind;
  prefix: string;
};

export function parseCompositePath(path: string): { prefix: string; kind: ReportCompositeKind } | null {
  if (!isReportCompositeFieldPath(path)) return null;
  const parts = path.split('.');
  const segIdx = parts.indexOf(REPORT_COMPOSITE_SEGMENT);
  if (segIdx < 0 || segIdx + 1 >= parts.length) return null;
  const kind = parts[segIdx + 1];
  if (kind === COORDINATES_COMPOSITE_KIND) {
    return {
      prefix: parts.slice(0, segIdx).join('.'),
      kind: COORDINATES_COMPOSITE_KIND,
    };
  }
  const entityKind = kind as ReportEntityCompositeKind;
  if (!CONFIG_BY_ENTITY.has(entityKind)) return null;
  return {
    prefix: parts.slice(0, segIdx).join('.'),
    kind: entityKind,
  };
}

/** Схлопывает колонки-члены в одну, если в запросе выбраны все поля группы. */
export function planReportCompositeResultColumns(
  columnKeys: string[],
  selectedFieldNames: string[] | undefined,
): {
  displayColumnKeys: string[];
  groups: CompositeColumnGroup[];
} {
  const keySet = new Set(columnKeys);
  const selectedSet = new Set(selectedFieldNames ?? columnKeys);
  const groups: CompositeColumnGroup[] = [];
  const keysToHide = new Set<string>();

  const prefixes = new Set<string>(['']);
  for (const key of columnKeys) {
    const { prefix } = parseFieldPath(key);
    prefixes.add(prefix);
    const parent = parseFieldPath(key).prefix;
    if (parent) prefixes.add(parent);
  }

  for (const prefix of Array.from(prefixes)) {
    for (const config of COMPOSITE_CONFIGS) {
      const memberKeys = config.memberFieldNames.map((leaf) =>
        prefix ? `${prefix}.${leaf}` : leaf,
      );
      const allInContent = memberKeys.every((k) => keySet.has(k));
      const allSelected = memberKeys.every((k) => selectedSet.has(k));
      if (!allInContent || !allSelected) continue;

      const compositeKey = buildReportCompositeFieldPath(prefix, config.referenceEntity);
      groups.push({ compositeKey, memberKeys, kind: config.referenceEntity, prefix });
      for (const mk of memberKeys) {
        keysToHide.add(mk);
      }
    }

    const coordMemberKeys = COORDINATE_MEMBER_FIELD_NAMES.map((leaf) =>
      prefix ? `${prefix}.${leaf}` : leaf,
    );
    const compositeCoordKey = buildReportCompositeFieldPath(prefix, COORDINATES_COMPOSITE_KIND);
    const allCoordInContent = coordMemberKeys.every((k) => keySet.has(k));
    const allCoordSelected =
      coordMemberKeys.every((k) => selectedSet.has(k)) ||
      selectedSet.has(compositeCoordKey) ||
      Array.from(selectedSet).some(
        (name) =>
          isReportCoordinatesCompositePath(name) &&
          (parseCompositePath(name)?.prefix ?? '') === prefix,
      );
    if (allCoordInContent && allCoordSelected) {
      groups.push({
        compositeKey: compositeCoordKey,
        memberKeys: coordMemberKeys,
        kind: COORDINATES_COMPOSITE_KIND,
        prefix,
      });
      for (const mk of coordMemberKeys) {
        keysToHide.add(mk);
      }
    }
  }

  const displayColumnKeys: string[] = [];
  const seenComposite = new Set<string>();

  for (const key of columnKeys) {
    if (keysToHide.has(key)) {
      const group = groups.find((g) => g.memberKeys.includes(key));
      if (group && !seenComposite.has(group.compositeKey)) {
        displayColumnKeys.push(group.compositeKey);
        seenComposite.add(group.compositeKey);
      }
      continue;
    }
    displayColumnKeys.push(key);
  }

  return { displayColumnKeys, groups };
}

function readRowValue(row: Record<string, unknown>, path: string): unknown {
  return row[path];
}

export function formatReportCompositeCellValue(
  group: CompositeColumnGroup,
  row: Record<string, unknown>,
): string {
  const read = (leaf: string) => {
    const key = group.prefix ? `${group.prefix}.${leaf}` : leaf;
    return readRowValue(row, key);
  };

  let display: string;

  switch (group.kind) {
    case 'User': {
      const person = {
        surname: read('surname'),
        firstName: read('firstName'),
        middleName: read('middleName'),
        email: read('email'),
      };
      const fio = Formatters.nameFormatter(
        {
          surname: isReportEmptyValue(person.surname)
            ? undefined
            : String(person.surname).trim() || undefined,
          firstName: isReportEmptyValue(person.firstName)
            ? undefined
            : String(person.firstName).trim() || undefined,
          middleName: isReportEmptyValue(person.middleName)
            ? undefined
            : String(person.middleName).trim() || undefined,
        },
        false,
      );
      const email = isReportEmptyValue(person.email) ? '' : String(person.email).trim();
      if (fio && fio !== '-' && email) display = `${fio} (${email})`;
      else if (fio && fio !== '-') display = fio;
      else display = email || REPORT_EMPTY_DISPLAY;
      break;
    }
    case 'MonitoringDevice': {
      const device = {
        name: read('name'),
        serialNumber: read('serialNumber'),
      };
      display =
        formatDeviceNameSerialLabel({
          name: isReportEmptyValue(device.name) ? '' : String(device.name),
          serialNumber: isReportEmptyValue(device.serialNumber)
            ? undefined
            : device.serialNumber,
        }) || REPORT_EMPTY_DISPLAY;
      break;
    }
    case 'Vehicle':
      display = formatReportCarDisplay({
        manufacturer: read('manufacturer') as string | undefined,
        model: read('model') as string | undefined,
        registrationNumber: read('registrationNumber') as string | undefined,
      });
      break;
    case COORDINATES_COMPOSITE_KIND:
      display = formatReportCoordinatesCompositeCellValue(group.prefix, row);
      break;
    default:
      display = REPORT_EMPTY_DISPLAY;
  }

  return finalizeReportCellDisplay(display);
}

export function isReportCompositeMemberField(leaf: string): boolean {
  return MEMBER_FIELDS_GLOBAL.has(leaf) || isReportCoordinateMemberField(leaf);
}

type ReportCompositeMemberBundle = {
  memberFieldNames: string[];
};

function bundleKeyForMembers(members: string[]): string {
  return members.join('\0');
}

/** Наборы полей, которые в UI склеиваются в одну составную колонку (User, Координаты, …). */
export function collectReportCompositeMemberBundles(fieldNames: string[]): ReportCompositeMemberBundle[] {
  const bundles = new Map<string, ReportCompositeMemberBundle>();

  for (const fieldName of fieldNames) {
    const parts = fieldName.split('.');
    const leaf = parts[parts.length - 1] ?? fieldName;
    const prefix = parts.length > 1 ? parts.slice(0, -1).join('.') : '';

    if (isReportCoordinateMemberField(leaf)) {
      const members = COORDINATE_MEMBER_FIELD_NAMES.map((member) =>
        prefix ? `${prefix}.${member}` : member,
      );
      bundles.set(bundleKeyForMembers(members), { memberFieldNames: members });
      continue;
    }

    for (const config of COMPOSITE_CONFIGS) {
      if (!config.memberFieldNames.includes(leaf)) continue;
      const members = config.memberFieldNames.map((member) =>
        prefix ? `${prefix}.${member}` : member,
      );
      bundles.set(bundleKeyForMembers(members), { memberFieldNames: members });
      break;
    }
  }

  return Array.from(bundles.values());
}

function isCompositeBundleRepresentedInGroupBy(
  bundle: ReportCompositeMemberBundle,
  groupSet: Set<string>,
): boolean {
  if (bundle.memberFieldNames.length > 1) {
    return bundle.memberFieldNames.every((member) => groupSet.has(member));
  }

  return bundle.memberFieldNames.some((member) => groupSet.has(member));
}

/**
 * При GROUP BY нельзя независимо агрегировать части составной колонки (max фамилии + max имени → «франкенштейн»).
 * Убираем членов bundle, если группировка не по этой сущности.
 */
export function stripUngroupedCompositeMemberFields(
  fields: ReportSelectedFieldPayload[],
  groupBy: string[] | undefined,
): ReportSelectedFieldPayload[] {
  if (!groupBy?.length) return fields;

  const groupSet = new Set(groupBy);
  const fieldNames = fields
    .map((field) => field.fieldName?.trim())
    .filter((name): name is string => Boolean(name));
  const removeSet = new Set<string>();

  for (const bundle of collectReportCompositeMemberBundles(fieldNames)) {
    if (isCompositeBundleRepresentedInGroupBy(bundle, groupSet)) continue;

    const presentMembers = bundle.memberFieldNames.filter((member) => fieldNames.includes(member));
    // Снимаем только если в отчёте реально раскрыта составная колонка (2+ поля bundle).
    // Одно поле вроде branch.name не должно удаляться из-за совпадения листа name с device.name.
    if (presentMembers.length < 2) continue;

    for (const member of presentMembers) {
      removeSet.add(member);
    }
  }

  if (!removeSet.size) return fields;
  return fields.filter((field) => !field.fieldName || !removeSet.has(field.fieldName));
}

/** Имя шага path / опции «Параметр сущности» для объединённого фильтра. */
export function buildReportCompositePropertyFieldName(kind: ReportEntityCompositeKind): string {
  return `${REPORT_COMPOSITE_SEGMENT}.${kind}`;
}

export function isReportCompositePropertyFieldName(fieldName: string): boolean {
  return fieldName.startsWith(`${REPORT_COMPOSITE_SEGMENT}.`);
}

export function parseCompositePropertyFieldName(
  fieldName: string,
): ReportCompositeKind | undefined {
  if (isReportCoordinatesCompositePropertyFieldName(fieldName)) {
    return COORDINATES_COMPOSITE_KIND;
  }
  if (!isReportCompositePropertyFieldName(fieldName)) return undefined;
  const kind = fieldName.slice(REPORT_COMPOSITE_SEGMENT.length + 1) as ReportEntityCompositeKind;
  return CONFIG_BY_ENTITY.has(kind) ? kind : undefined;
}

const DEFAULT_SYNTHETIC_FIELD_FLAGS: Pick<
  ReportFieldDefinition,
  'alias' | 'sortable' | 'groupable' | 'aggregation' | 'availableFunctions'
> = {
  alias: null,
  sortable: false,
  groupable: false,
  aggregation: null,
  availableFunctions: [],
};

function findEntityIdFieldDefinition(
  metadata: ReportEntityMetadata | null | undefined,
  kind: ReportEntityCompositeKind,
): ReportFieldDefinition | undefined {
  const idField = metadata?.fields?.find((f) => f.fieldName === 'id');
  if (idField) return idField;
  return {
    fieldName: 'id',
    label: 'ID',
    type: 'ENTITY',
    referenceEntity: kind,
    filterable: true,
    availableOperations: [{ code: 'eq', label: '=' }, { code: 'in', label: 'in' }],
    ...DEFAULT_SYNTHETIC_FIELD_FLAGS,
  };
}

/** Листовое поле для domain-list по id сущности (User, Vehicle, …). */
export function buildSyntheticCompositeDomainListField(
  kind: ReportEntityCompositeKind,
  metadata?: ReportEntityMetadata | null,
): ReportFieldDefinition {
  const template = findEntityIdFieldDefinition(metadata, kind);
  return {
    ...template,
    fieldName: 'id',
    referenceEntity: kind,
    type: 'ENTITY',
    filterable: true,
  };
}

function groupFilterableFieldsToCompositeOption(
  fields: ReportFieldDefinition[],
  entityName: string,
  t: TFunction,
): Values {
  const coordMembers = new Set<string>(COORDINATE_MEMBER_FIELD_NAMES);
  const kind = resolveCompositeKind(entityName);
  const config = kind ? CONFIG_BY_ENTITY.get(kind) : undefined;
  const entityMembers = config ? new Set(config.memberFieldNames) : new Set<string>();

  const options: Values = [];
  for (const f of fields) {
    if (entityMembers.has(f.fieldName) || coordMembers.has(f.fieldName)) continue;
    options.push({
      value: f.fieldName,
      label: (f.label ?? '').trim() || f.fieldName,
    });
  }

  if (config && fields.some((f) => entityMembers.has(f.fieldName))) {
    options.push({
      value: buildReportCompositePropertyFieldName(kind!),
      label: t(config.entityLabelKey),
    });
  }

  if (fields.some((f) => coordMembers.has(f.fieldName))) {
    options.push({
      value: buildReportCoordinatesCompositePropertyFieldName(),
      label: t('reports.composite.entityCoordinates'),
    });
  }

  return options;
}

/** «Поле результата» на корневой сущности (отчёт по пользователям и т.п.). */
export function buildReportOutputFieldOptions(
  metadata: ReportEntityMetadata,
  t: TFunction,
): Values {
  const filterable = metadata.fields.filter((f) => f.filterable);
  return groupFilterableFieldsToCompositeOption(filterable, metadata.entityName, t).sort(
    (a, b) => a.label.localeCompare(b.label, 'ru'),
  );
}

/** «Параметр сущности» в nested-фильтре. */
export function buildReferenceEntityPropertyOptionsWithComposite(
  tableMetadata: ReportEntityMetadata | null | undefined,
  t: TFunction,
): Values {
  const fields = (tableMetadata?.fields ?? []).filter((f) => f.filterable);
  const entityName = tableMetadata?.entityName ?? '';
  const options = groupFilterableFieldsToCompositeOption(fields, entityName, t);
  return options.sort((a, b) => a.label.localeCompare(b.label, 'ru'));
}

export function resolveReportOutputPrimaryField(
  primaryKey: string,
  fieldMap: Map<string, ReportFieldDefinition>,
  metadata: ReportEntityMetadata | null | undefined,
  t?: TFunction,
): ReportFieldDefinition | null {
  if (!primaryKey) return null;
  const direct = fieldMap.get(primaryKey);
  if (direct) return direct;
  if (!metadata) return null;

  if (isRootCoordinatesCompositeOutputFilter(primaryKey, metadata)) {
    const latField = metadata.fields.find((f) => f.fieldName === 'latitude');
    const synthetic = buildSyntheticCoordinatesFilterField(latField);
    return {
      ...synthetic,
      ...DEFAULT_SYNTHETIC_FIELD_FLAGS,
      fieldName: primaryKey,
      label: t ? t('reports.composite.entityCoordinates') : 'reports.composite.entityCoordinates',
      filterable: true,
      availableOperations: latField?.availableOperations ?? synthetic.availableOperations,
      availableFunctions: latField?.availableFunctions ?? synthetic.availableFunctions,
    };
  }

  const parsed = parseCompositePath(primaryKey);
  if (!parsed) return null;
  const rootKind = resolveCompositeKind(metadata.entityName);
  if (rootKind !== parsed.kind) return null;
  const config = CONFIG_BY_ENTITY.get(parsed.kind);
  if (!config) return null;
  const idTemplate = findEntityIdFieldDefinition(metadata, parsed.kind);
  return {
    ...idTemplate,
    ...DEFAULT_SYNTHETIC_FIELD_FLAGS,
    fieldName: primaryKey,
    label: t ? t(config.entityLabelKey) : config.entityLabelKey,
    filterable: true,
    referenceEntity: undefined,
    availableOperations: idTemplate.availableOperations ?? [],
    availableFunctions: idTemplate.availableFunctions ?? [],
  };
}

/** Отчёт по User/Vehicle/…: «Поле результата» = объединённая сущность, без nested ENTITY. */
export function isRootCompositeOutputFilter(
  primaryKey: string,
  metadata: ReportEntityMetadata | null | undefined,
): boolean {
  if (!primaryKey || !metadata) return false;
  const parsed = parseCompositePath(primaryKey);
  if (!parsed) return false;
  return resolveCompositeKind(metadata.entityName) === parsed.kind;
}

export function resolveCompositeFilterApiFieldName(
  entityName: string,
  primaryField: ReportFieldDefinition,
  nestedPath: string[],
): string {
  const rootKind = resolveCompositeKind(entityName);
  if (rootKind && isReportCompositeFieldPath(primaryField.fieldName)) {
    return 'id';
  }
  if (!nestedPath.length) return primaryField.fieldName;
  const last = nestedPath[nestedPath.length - 1];
  if (parseCompositePropertyFieldName(last)) {
    const base = primaryField.fieldName;
    return base.endsWith('.id') ? base : `${base}.id`;
  }
  return primaryField.fieldName;
}

/** Заменяет набор отдельных полей-членов одной объединённой колонкой в сохранённом выборе. */
export function normalizeCompositeTableFieldSelection(values: Values, options: Values): Values {
  let result: Values = [...values];
  for (const opt of options) {
    const compositePath = String(opt.value);
    if (!isReportCompositeFieldPath(compositePath)) continue;
    const members = expandCompositeFieldPath(compositePath);
    const hasComposite = result.some((v) => String(v.value) === compositePath);
    if (hasComposite) continue;
    const hasAllMembers = members.every((m) =>
      result.some((v) => String(v.value) === m),
    );
    if (!hasAllMembers) continue;
    result = result.filter((v) => !members.includes(String(v.value)));
    result.push(opt);
  }
  return result;
}
