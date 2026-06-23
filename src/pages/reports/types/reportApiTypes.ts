import type { Values } from '@shared/ui/search_multiple_select';

export type ReportEntityListItem = {
  entityName: string;
  label: string;
};

export type ReportFieldOperation = {
  code: string;
  label: string;
};

/** Полное описание поля из GET …/metadata (только для UI). */
export type ReportFieldDefinition = {
  fieldName: string;
  label: string;
  alias: string | null;
  type: string;
  referenceEntity?: string | null;
  filterable: boolean;
  sortable: boolean;
  groupable: boolean;
  /** false — поле не показывается в «Поля в отчёте» и не попадает в selectedFields по умолчанию. */
  selectable?: boolean;
  aggregation: string | null;
  availableOperations: ReportFieldOperation[];
  availableFunctions: ReportFieldOperation[];
  /** Справочник значений для ENUM (если бэкенд отдаёт в metadata). */
  allowedValues?: Array<
    | string
    | number
    | { value?: string | number; label?: string; code?: string; name?: string }
  > | null;
};

export type ReportSubscriptionEventType = {
  id: number;
  label: string;
  event?: string;
  level?: { id: number; label: string };
};

export type ReportGroupSubscription = {
  id: number;
  email?: string;
  eventType?: ReportSubscriptionEventType;
  isActive?: boolean;
};

export type ReportMetadataGroup = {
  email?: string;
  subscriptions?: ReportGroupSubscription[];
};

export type ReportEntityMetadata = {
  entityName: string;
  label: string;
  fields: ReportFieldDefinition[];
  groups?: ReportMetadataGroup[];
};

/** Элемент selectedFields в POST …/query (как в контракте бэкенда). */
export type ReportSelectedFieldPayload = {
  fieldName: string;
  alias?: string;
  aggregation?: string;
};

export type ReportLogicOperator = 'or' | 'and';

/** Элемент filters в POST …/query. */
export type ReportQueryFilter = {
  fieldName: string;
  operator: string;
  /** Всегда массив: одно значение — [x], диапазон — [from, to]. */
  values?: unknown[];
  group?: number;
};

export type ReportLogicConnect = {
  groupNumber: number;
  logicOperator: ReportLogicOperator;
};

/** Собранные поля и фильтры одной строки «поле результата». */
export type ReportQueryRowPayload = {
  selectedFields: ReportSelectedFieldPayload[];
  filters: ReportQueryFilter[];
};

/** Тело query в POST api/v1/reports/{entity}/query. */
export type ReportQueryRequest = {
  selectedFields: ReportSelectedFieldPayload[];
  filters: ReportQueryFilter[];
  groupBy?: string[];
  logicConnects?: ReportLogicConnect[];
};

/** Одна строка фильтров «поле результата» и зависимых контролов в UI. */
export type ReportOutputRow = {
  id: string;
  selectedOutputFields: Values;
  /** Поля для POST selectedFields (колонки отчёта). */
  reportTableFields: Values;
  filterSelections: ReportUiFilterSelections;
  nestedEntityFilterByField: ReportNestedEntityFilterByField;
};

export type ReportQueryPageable = {
  page: number;
  size: number;
  sort?: string[];
  /** Фильтр филиалов для суперадмина (query: all.branch.id.in=…). */
  branchIds?: number[];
};

export type ReportQueryResponse = {
  totalPages: number;
  totalElements: number;
  size: number;
  content: Record<string, unknown>[];
  number: number;
  first: boolean;
  last: boolean;
  empty: boolean;
};

export type ReportFilterControlDef = {
  id: string;
  fieldName: string;
  label: string;
  referenceEntity?: string;
};

export type ReportViewMode = 'table' | 'bar' | 'dashboard';

/** Совместимость со старыми значениями (pictogram, pie, line). */
export function normalizeReportViewMode(mode: string): ReportViewMode {
  if (mode === 'bar') return 'bar';
  if (mode === 'dashboard' || mode === 'pictogram') return 'dashboard';
  return 'table';
}

export type ReportUiFilterSelections = Record<string, Values>;

/** Фильтр по вложенной сущности: цепочка полей metadata и конечные значения. */
export type ReportNestedEntityFilterState = {
  /** fieldName на каждом уровне metadata (branch → office → …). */
  path: string[];
  values: Values;
  /** @deprecated Используйте path */
  attribute?: string | null;
};

export type ReportNestedEntityFilterByField = Record<string, ReportNestedEntityFilterState>;
