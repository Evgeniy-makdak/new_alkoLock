import type { Values } from '@shared/ui/search_multiple_select';

export type ReportEntityListItem = {
  entityName: string;
  label: string;
};

export type ReportFieldOperation = {
  code: string;
  label: string;
  /**
   * Сколько значений UI допускает для оператора (из metadata):
   * 1 — один выбор; 0 — без контрола значения; -1 — мультисписок;
   * 2 — between (два контрола).
   */
  numberParameter?: number | null;
};

/** Блок having из GET …/metadata (availableHaving у поля). */
export type ReportAvailableHaving = {
  functions?: ReportFieldOperation[] | null;
  modes?: ReportFieldOperation[] | null;
  availableHavingOperations?: ReportFieldOperation[] | null;
  type?: string | null;
};

/** Полное описание поля из GET …/metadata (только для UI). */
export type ReportFieldDefinition = {
  fieldName: string;
  label: string;
  alias: string | null;
  type: string;
  referenceEntity?: string | null;
  /** Физическая таблица (events, users, …) — справочно из metadata. */
  tableName?: string | null;
  /** Имя колонки в таблице (id, timestamp, …) — справочно из metadata. */
  fieldNameInTable?: string | null;
  filterable: boolean;
  sortable: boolean;
  groupable: boolean;
  /** false — поле не показывается в «Поля в отчёте» и не попадает в selectedFields по умолчанию. */
  selectable?: boolean;
  /**
   * true — по умолчанию в «Текущий состав таблицы»;
   * иначе (при selectable) — в «Доступные колонки».
   */
  defaultSelected?: boolean;
  aggregation: string | null;
  availableOperations: ReportFieldOperation[];
  availableFunctions: ReportFieldOperation[];
  /** Параметры UI/операций для блока «Группировка» → having. */
  availableHaving?: ReportAvailableHaving | null;
  /**
   * Форматы DATETIME для select/groupBy (minute|hour|day|month|year).
   * Если массив непустой — в «Группировке» показываем контрол формата.
   */
  availableDateTimeFormatters?: ReportFieldOperation[] | null;
  /**
   * true — значение фильтра только из справочника/дефолтного списка (без произвольной подстроки);
   * false — допускается любой ввод.
   * Источник истины с бэка (GET …/metadata); операторы бэк уже режет в availableOperations.
   */
  onlyDefaultValue?: boolean | null;
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
  /**
   * Пользовательская подпись поля из «Текущего состава таблицы».
   * Бэкенд использует её в тексте ошибок валидации (группировка/агрегация),
   * чтобы не показывать технические fieldName.
   */
  label?: string;
  alias?: string;
  aggregation?: string;
  /**
   * Формат DATETIME в select (из availableDateTimeFormatters.code):
   * minute | hour | day | month | year.
   */
  dateTimeFormat?: string;
  /** Часовой пояс (опционально, контракт бэка). */
  timeZone?: string;
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

/** Элемент having в POST …/query (условия после GROUP BY). */
export type ReportHavingFilter = {
  fieldName: string;
  operator?: string;
  aggregation?: string;
  havingMode?: string;
  topN?: number;
  values?: unknown[];
  group?: number;
  displayName?: string;
  /** Тип значения having (из availableHaving.type / field.type), напр. LONG. */
  type?: string;
};

export type ReportHavingGroupConnection = {
  leftGroup: number;
  rightGroup: number;
  logicOperator: string;
};

/** Собранные поля и фильтры одной строки «поле результата». */
export type ReportQueryRowPayload = {
  selectedFields: ReportSelectedFieldPayload[];
  filters: ReportQueryFilter[];
};

/**
 * Элемент groupBy в POST …/query (ReportDto$GroupBy).
 * alias — как в selectedFields (переименование / клон); dateTimeFormat/timeZone — DATETIME.
 */
export type ReportGroupByField = {
  fieldName: string;
  alias?: string;
  dateTimeFormat?: string;
  timeZone?: string;
};

/** fieldName из groupBy (объекты контракта или legacy-строки). */
export function resolveReportGroupByFieldNames(
  groupBy: Array<string | ReportGroupByField> | undefined | null,
): string[] {
  if (!groupBy?.length) return [];
  const names: string[] = [];
  for (const item of groupBy) {
    const name =
      typeof item === 'string'
        ? item.trim()
        : String((item as ReportGroupByField)?.fieldName ?? '').trim();
    if (name) names.push(name);
  }
  return names;
}

/** Нормализация groupBy к объектам контракта (legacy string[] → { fieldName }). */
export function normalizeReportGroupByFields(
  groupBy: Array<string | ReportGroupByField> | undefined | null,
): ReportGroupByField[] {
  if (!groupBy?.length) return [];
  const result: ReportGroupByField[] = [];
  for (const item of groupBy) {
    if (typeof item === 'string') {
      const fieldName = item.trim();
      if (fieldName) result.push({ fieldName });
      continue;
    }
    const fieldName = String(item?.fieldName ?? '').trim();
    if (!fieldName) continue;
    const entry: ReportGroupByField = { fieldName };
    const alias = String(item?.alias ?? '').trim();
    if (alias) entry.alias = alias;
    const dateTimeFormat = String(item?.dateTimeFormat ?? '').trim();
    if (dateTimeFormat) entry.dateTimeFormat = dateTimeFormat;
    const timeZone = String(item?.timeZone ?? '').trim();
    if (timeZone) entry.timeZone = timeZone;
    result.push(entry);
  }
  return result;
}

/** Тело query в POST api/v1/reports/{entity}/query. */
export type ReportQueryRequest = {
  selectedFields: ReportSelectedFieldPayload[];
  filters: ReportQueryFilter[];
  groupBy?: ReportGroupByField[];
  having?: ReportHavingFilter[];
  havingConnects?: ReportLogicConnect[];
  havingGroupConnections?: ReportHavingGroupConnection[];
  logicConnects?: ReportLogicConnect[];
  groupConnections?: ReportHavingGroupConnection[];
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

export type ReportViewMode = 'table' | 'chart';

/**
 * Совместимость со старыми значениями (bar, dashboard, pictogram, pie, line).
 * Всё графическое → 'chart'; таблица и неизвестное → 'table'.
 */
export function normalizeReportViewMode(mode: string): ReportViewMode {
  if (
    mode === 'chart' ||
    mode === 'bar' ||
    mode === 'dashboard' ||
    mode === 'pictogram' ||
    mode === 'pie' ||
    mode === 'line'
  ) {
    return 'chart';
  }
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
