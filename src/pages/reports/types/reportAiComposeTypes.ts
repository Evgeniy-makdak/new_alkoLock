import type { ReportChartSpec } from './chartSpec';
import type {
  ReportHavingFilter,
  ReportLogicConnect,
  ReportQueryFilter,
  ReportSelectedFieldPayload,
  ReportViewMode,
} from './reportApiTypes';

/** Относительный период — резолвится на клиенте в ISO, модель не задаёт абсолютные даты. */
export type ReportAiRelativeDateRange =
  | 'previous_quarter'
  | 'previous_month'
  | 'previous_week'
  | 'current_month'
  | 'current_year'
  | 'last_7_days'
  | 'last_30_days';

/** Упоминание справочника для резолва id по подписи/номеру. */
export type ReportAiResolveHint = {
  /** Поле фильтра, куда подставить id (например branch.id, device.id). */
  fieldName: string;
  kind:
    | 'branch'
    | 'device'
    | 'vehicle'
    | 'vehicleMake'
    | 'vehicleModel'
    | 'user'
    | 'eventType';
  /** Текст из NL («основной филиал», «7777777», «Жигули, Москвич»). */
  query: string;
};

/**
 * Черновик отчёта от LLM / локального парсера.
 * После validate+resolve превращается в POST …/query + chart/view.
 */
export type ReportAiComposeDraft = {
  entityName: string;
  selectedFields: ReportSelectedFieldPayload[];
  filters: ReportQueryFilter[];
  groupBy?: string[];
  having?: ReportHavingFilter[];
  havingConnects?: ReportLogicConnect[];
  logicConnects?: ReportLogicConnect[];
  /** Query sort params: field,ASC|DESC */
  sort?: string[];
  viewMode: ReportViewMode;
  chartSpec?: Partial<ReportChartSpec> | null;
  /** Человекочитаемое «что понял» для UI подтверждения. */
  explanation: string;
  /** Что проигнорировано из NL (конфликт chart+sort и т.п.). */
  ignoredHints?: string[];
  /** Относительные даты → filters с ISO after resolve. */
  relativeDateRanges?: Array<{
    fieldName: string;
    range: ReportAiRelativeDateRange;
    operator?: string;
  }>;
  /** Резолв филиалов/устройств/событий по тексту. */
  resolveHints?: ReportAiResolveHint[];
};

export type ReportAiComposeRequest = {
  userText: string;
  /** Сжатый каталог metadata + сущности (собирает клиент). */
  context: ReportAiPromptContext;
};

export type ReportAiPromptEntityField = {
  fieldName: string;
  label: string;
  type: string;
  filterable: boolean;
  groupable: boolean;
  selectable: boolean;
  sortable: boolean;
  referenceEntity?: string | null;
  availableOperations?: string[];
  availableFunctions?: string[];
  allowedValues?: Array<string | number>;
};

export type ReportAiPromptEntity = {
  entityName: string;
  label: string;
  fields: ReportAiPromptEntityField[];
};

export type ReportAiPromptContext = {
  entities: Array<{ entityName: string; label: string }>;
  /** Metadata выбранной/всех основных сущностей (сжатая). */
  metadataByEntity: Record<string, ReportAiPromptEntity>;
  /** Краткие справочники для резолва (имена филиалов, типы событий, марки ТС и т.п.). */
  catalogs?: {
    branches?: Array<{ id: number | string; name: string }>;
    eventTypes?: Array<{ id: number | string; label: string; event?: string }>;
    /** Уникальные значения manufacturer из справочника ТС. */
    vehicleMakes?: string[];
    /** Уникальные значения model из справочника ТС. */
    vehicleModels?: string[];
    users?: Array<{ id: number | string; name: string }>;
    devices?: Array<{ id: number | string; serialNumber: string; name?: string }>;
  };
  locale: string;
  nowIso: string;
};

export type ReportAiComposeResponse = {
  draft: ReportAiComposeDraft;
  /** Сырой ответ модели (для отладки). */
  rawModelText?: string;
  source: 'gemini' | 'openrouter' | 'local_fallback';
};

export type ReportAiValidatedCompose = {
  draft: ReportAiComposeDraft;
  warnings: string[];
};
