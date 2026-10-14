import { buildReportTableFieldDisplayOptions } from './reportTableFieldDisplayParam';
import {
  buildRootReportTableFieldOptions,
  findReportTableFieldDefinition,
  mergeAllReportTableFieldOptions,
} from './buildReportTableFieldOptions';

import type { TFunction } from 'i18next';

import type { ReportAiComposeDraft } from '../types/reportAiComposeTypes';
import type {
  ReportEntityListItem,
  ReportEntityMetadata,
  ReportFieldDefinition,
  ReportOutputRow,
  ReportQueryFilter,
  ReportSelectedFieldPayload,
} from '../types/reportApiTypes';

export type ReportAiWizardStep =
  | 'columns'
  | 'aggregations'
  | 'filters'
  | 'grouping'
  | 'sorting'
  | 'confirm';

export type ReportAiWizardMessage = {
  id: string;
  role: 'assistant' | 'user' | 'system';
  text: string;
};

export type ReportAiWizardColumnOption = {
  path: string;
  label: string;
};

export type ReportAiWizardSession = {
  step: ReportAiWizardStep;
  messages: ReportAiWizardMessage[];
  /** Базовый черновик после NL (фильтры/resolve уже могут быть). */
  baseDraft: ReportAiComposeDraft;
  /** Текущий состав таблицы (paths). */
  selectedPaths: string[];
  aggregationByPath: Record<string, string>;
  /** Индекс поля на шаге aggregations. */
  aggregationIndex: number;
  groupByPaths: string[];
  sortPaths: string[];
  /** Пользователь подтвердил фильтры из NL / свои. */
  filtersAccepted: boolean;
  customFiltersNote: string;
  availableColumns: ReportAiWizardColumnOption[];
  labelByPath: Record<string, string>;
  functionsByPath: Record<string, Array<{ code: string; label: string }>>;
  groupablePaths: string[];
  sortablePaths: string[];
  done: boolean;
};

function msg(role: ReportAiWizardMessage['role'], text: string): ReportAiWizardMessage {
  return {
    id: `m-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    role,
    text,
  };
}

function listBullet(items: string[], empty: string): string {
  if (!items.length) return empty;
  return items.map((x, i) => `${i + 1}. ${x}`).join('\n');
}

function normalizeMatchKey(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .replace(/[«»"'`]/g, '')
    .replace(/\s+/g, ' ');
}

function findColumnByUserText(
  text: string,
  columns: ReportAiWizardColumnOption[],
): ReportAiWizardColumnOption | undefined {
  const key = normalizeMatchKey(text);
  if (!key) return undefined;
  const exact = columns.find(
    (c) => normalizeMatchKey(c.path) === key || normalizeMatchKey(c.label) === key,
  );
  if (exact) return exact;
  return columns.find(
    (c) =>
      normalizeMatchKey(c.label).includes(key) ||
      normalizeMatchKey(c.path).includes(key) ||
      key.includes(normalizeMatchKey(c.label)),
  );
}

function parseKeepAll(text: string): boolean {
  return /^(ок|далее|дальше|оставить|как есть|без изменений|всё ок|все ок|yes|ok|next)\b/i.test(
    text.trim(),
  ) || /оставить\s+(как\s+есть|вс[её])/i.test(text);
}

function parseSkip(text: string): boolean {
  return /^(пропустить|скип|skip|нет|без\s+фильтр|без\s+групп|не\s+нужн)/i.test(text.trim());
}

function parseNoneAggregation(text: string): boolean {
  return /^(нет|не\s+нужн|без|none|не\s+выбран|пропустить)/i.test(text.trim());
}

/** Собирает опции колонок как в модалке «Доступные / Текущий состав». */
export function buildWizardColumnCatalog(params: {
  metadata: ReportEntityMetadata;
  entities: ReportEntityListItem[];
  outputRows: ReportOutputRow[];
  tableMetadataByRowId: Record<string, ReportEntityMetadata | null>;
  referenceEntityMetadataByName: Record<string, ReportEntityMetadata | null>;
  t: TFunction;
}): {
  availableColumns: ReportAiWizardColumnOption[];
  labelByPath: Record<string, string>;
  functionsByPath: Record<string, Array<{ code: string; label: string }>>;
  groupablePaths: string[];
  sortablePaths: string[];
  defaultRootPaths: string[];
} {
  const fieldMap = new Map(params.metadata.fields.map((f) => [f.fieldName, f]));
  const allOptions = mergeAllReportTableFieldOptions(
    params.metadata,
    params.outputRows,
    fieldMap,
    params.tableMetadataByRowId,
    params.referenceEntityMetadataByName,
    params.entities,
    params.t,
  );
  const rootDefaults = buildRootReportTableFieldOptions(
    params.metadata,
    params.outputRows,
    params.entities,
    params.t,
  );

  const availableColumns: ReportAiWizardColumnOption[] = allOptions.map((o) => ({
    path: String(o.value),
    label: String(o.label ?? o.value),
  }));
  const labelByPath: Record<string, string> = {};
  for (const c of availableColumns) labelByPath[c.path] = c.label;

  const functionsByPath: Record<string, Array<{ code: string; label: string }>> = {};
  const groupablePaths: string[] = [];
  const sortablePaths: string[] = [];

  for (const col of availableColumns) {
    const def = findReportTableFieldDefinition(
      col.path,
      params.metadata,
      params.outputRows,
      fieldMap,
      params.tableMetadataByRowId,
      params.referenceEntityMetadataByName,
    );
    const fnOpts = buildReportTableFieldDisplayOptions(def ?? undefined, col.path);
    if (fnOpts.length) {
      functionsByPath[col.path] = fnOpts.map((o) => ({
        code: String(o.value).replace(/^fn:/, ''),
        label: String(o.label ?? o.value),
      }));
    }
    if (def?.groupable) groupablePaths.push(col.path);
    if (def?.sortable) sortablePaths.push(col.path);
  }

  return {
    availableColumns,
    labelByPath,
    functionsByPath,
    groupablePaths,
    sortablePaths,
    defaultRootPaths: rootDefaults.map((o) => String(o.value)),
  };
}

function columnsPrompt(session: ReportAiWizardSession): string {
  const selected = session.selectedPaths.map(
    (p) => session.labelByPath[p] ?? p,
  );
  const selectedSet = new Set(session.selectedPaths);
  const available = session.availableColumns
    .filter((c) => !selectedSet.has(c.path))
    .slice(0, 40)
    .map((c) => c.label);

  return [
    'Шаг 1/5 — Состав колонок таблицы («Текущий состав»).',
    '',
    'Сейчас в отчёте выбраны поля:',
    listBullet(selected, '(пусто)'),
    '',
    'Ненужные можно удалить. Можно добавить из доступных колонок:',
    listBullet(available, '(других selectable-полей нет)'),
    '',
    'Напишите, например:',
    '• «оставить как есть» или «далее»;',
    '• «удали Широта, добавь Время события»;',
    '• перечислите итоговый список через запятую.',
  ].join('\n');
}

function aggregationPrompt(session: ReportAiWizardSession): string {
  const path = session.selectedPaths[session.aggregationIndex];
  const label = session.labelByPath[path] ?? path;
  const fns = session.functionsByPath[path] ?? [];
  const n = session.aggregationIndex + 1;
  const total = session.selectedPaths.length;

  if (!fns.length) {
    return [
      `Шаг 2/5 — Агрегация для поля ${n}/${total}: «${label}».`,
      '',
      'Для этого поля в metadata нет availableFunctions — агрегацию указать нельзя.',
      'Напишите «далее» или «пропустить».',
    ].join('\n');
  }

  return [
    `Шаг 2/5 — Агрегация для поля ${n}/${total}: «${label}».`,
    '',
    'Доступные функции (как в выпадающем списке «Текущего состава»):',
    listBullet(
      fns.map((f) => `${f.label} (${f.code})`),
      '(нет)',
    ),
    '',
    'Выберите функцию по названию/коду или напишите «нет» / «не выбрана», если агрегация не нужна.',
  ].join('\n');
}

function filtersPrompt(session: ReportAiWizardSession): string {
  const filters = session.baseDraft.filters ?? [];
  const lines = filters.length
    ? filters.map((f) => {
        const vals = Array.isArray(f.values) ? f.values.map(String).join(', ') : '';
        return `${f.fieldName} ${f.operator}${vals ? ` [${vals}]` : ''}`;
      })
    : [];

  return [
    'Шаг 3/5 — Фильтрация.',
    '',
    'По вашему текстовому запросу предложены фильтры:',
    listBullet(lines, '(фильтры пока не заданы)'),
    '',
    session.baseDraft.explanation
      ? `Контекст запроса: ${session.baseDraft.explanation}`
      : '',
    '',
    'Напишите «оставить» / «далее», чтобы принять эти фильтры,',
    '«без фильтров» — очистить,',
    'или опишите изменения (например: «убери филиал», «только тестирование не пройдено»).',
  ]
    .filter(Boolean)
    .join('\n');
}

function groupingPrompt(session: ReportAiWizardSession): string {
  const groupable = session.groupablePaths
    .slice(0, 30)
    .map((p) => session.labelByPath[p] ?? p);
  const suggested = (session.baseDraft.groupBy ?? []).map(
    (p) => session.labelByPath[p] ?? p,
  );

  return [
    'Шаг 4/5 — Группировка.',
    '',
    '⚠️ Важно: если задана группировка, то каждое поле из «Текущего состава таблицы»,',
    'которое НЕ входит в groupBy, должно иметь явную агрегирующую функцию',
    '(иначе бэкенд вернёт ошибку SQL / 409).',
    'Поля из groupBy обычно без aggregation в selectedFields.',
    '',
    suggested.length
      ? `Предложено из запроса:\n${listBullet(suggested, '')}`
      : 'Группировка из запроса не предложена.',
    '',
    'Доступные groupable-поля:',
    listBullet(groupable, '(нет)'),
    '',
    'Напишите «без группировки» / «пропустить», «оставить» (принять предложенное),',
    'или перечислите поля группировки через запятую.',
  ].join('\n');
}

function sortingPrompt(session: ReportAiWizardSession): string {
  const sortable = session.sortablePaths
    .slice(0, 25)
    .map((p) => session.labelByPath[p] ?? p);
  const current = (session.baseDraft.sort ?? []).join('; ');

  return [
    'Шаг 5/5 — Сортировка.',
    '',
    current ? `Из запроса: ${current}` : 'Сортировка не задана.',
    '',
    'Доступные sortable-поля:',
    listBullet(sortable, '(нет)'),
    '',
    'Примеры ответа: «по широте по возрастанию», «timestamp DESC», «без сортировки», «далее».',
    'Если выбран режим графика — сортировка списка может быть проигнорирована.',
  ].join('\n');
}

function confirmPrompt(session: ReportAiWizardSession): string {
  const fields = session.selectedPaths.map((p) => {
    const label = session.labelByPath[p] ?? p;
    const agg = session.aggregationByPath[p];
    return agg ? `${label} [${agg}]` : label;
  });
  const groups = session.groupByPaths.map((p) => session.labelByPath[p] ?? p);
  const missingAgg = session.groupByPaths.length
    ? session.selectedPaths.filter(
        (p) => !session.groupByPaths.includes(p) && !session.aggregationByPath[p],
      )
    : [];

  const warn =
    missingAgg.length > 0
      ? [
          '',
          '⚠️ Внимание: при группировке у этих полей состава нет aggregation — укажите функцию или уберите поле из состава / добавьте в groupBy:',
          listBullet(
            missingAgg.map((p) => session.labelByPath[p] ?? p),
            '',
          ),
        ].join('\n')
      : '';

  return [
    'Черновик готов. Проверьте сводку:',
    '',
    `Сущность: ${session.baseDraft.entityName}`,
    `Вид: ${session.baseDraft.viewMode}`,
    '',
    'Колонки:',
    listBullet(fields, '(пусто)'),
    '',
    'Группировка:',
    listBullet(groups, '(нет)'),
    '',
    `Фильтры: ${session.filtersAccepted ? (session.baseDraft.filters?.length ?? 0) : 0} шт.`,
    session.sortPaths.length
      ? `Сортировка: ${session.sortPaths.join('; ')}`
      : 'Сортировка: нет',
    warn,
    '',
    'Можно сформировать отчёт или открыть редактор для тонкой настройки.',
  ].join('\n');
}

function pushAssistant(session: ReportAiWizardSession, text: string): ReportAiWizardSession {
  return {
    ...session,
    messages: [...session.messages, msg('assistant', text)],
  };
}

export function createReportAiWizardSession(params: {
  draft: ReportAiComposeDraft;
  catalog: ReturnType<typeof buildWizardColumnCatalog>;
  introNote?: string;
}): ReportAiWizardSession {
  const { draft, catalog } = params;
  const selectedFromDraft = (draft.selectedFields ?? []).map((f) => f.fieldName);
  const selectedPaths =
    selectedFromDraft.length > 0
      ? selectedFromDraft.filter((p) =>
          catalog.availableColumns.some((c) => c.path === p),
        )
      : [...catalog.defaultRootPaths];

  // если draft paths не в available (ещё не подгрузились nested) — оставляем как есть
  const finalSelected =
    selectedPaths.length > 0
      ? selectedPaths
      : selectedFromDraft.length
        ? selectedFromDraft
        : catalog.defaultRootPaths.slice(0, 4);

  const aggregationByPath: Record<string, string> = {};
  for (const f of draft.selectedFields ?? []) {
    if (f.aggregation) aggregationByPath[f.fieldName] = f.aggregation;
  }

  let session: ReportAiWizardSession = {
    step: 'columns',
    messages: [],
    baseDraft: draft,
    selectedPaths: finalSelected,
    aggregationByPath,
    aggregationIndex: 0,
    groupByPaths: [...(draft.groupBy ?? [])],
    sortPaths: [...(draft.sort ?? [])],
    filtersAccepted: true,
    customFiltersNote: '',
    availableColumns: catalog.availableColumns,
    labelByPath: {
      ...catalog.labelByPath,
      ...Object.fromEntries(finalSelected.map((p) => [p, catalog.labelByPath[p] ?? p])),
    },
    functionsByPath: catalog.functionsByPath,
    groupablePaths: catalog.groupablePaths,
    sortablePaths: catalog.sortablePaths,
    done: false,
  };

  const intro = [
    params.introNote,
    `Понял запрос: ${draft.explanation || draft.entityName}.`,
    'Дальше заполним отчёт по шагам — как в редакторе: состав → агрегации → фильтры → группировка → сортировка.',
  ]
    .filter(Boolean)
    .join('\n\n');

  session = pushAssistant(session, intro);
  session = pushAssistant(session, columnsPrompt(session));
  return session;
}

function applyColumnsReply(
  session: ReportAiWizardSession,
  text: string,
): ReportAiWizardSession {
  let selected = [...session.selectedPaths];

  if (!parseKeepAll(text)) {
    const removeMatches = text.matchAll(/удал\w*\s+(.+?)(?=;|,|добав|$)/gi);
    for (const m of removeMatches) {
      const col = findColumnByUserText(m[1], session.availableColumns);
      if (col) selected = selected.filter((p) => p !== col.path);
    }
    const addMatches = text.matchAll(/добав\w*\s+(.+?)(?=;|,|удал|$)/gi);
    for (const m of addMatches) {
      const parts = m[1].split(/,| и /);
      for (const part of parts) {
        const col = findColumnByUserText(part, [
          ...session.availableColumns,
          ...selected.map((p) => ({
            path: p,
            label: session.labelByPath[p] ?? p,
          })),
        ]);
        if (col && !selected.includes(col.path)) selected.push(col.path);
      }
    }

    // «только A, B, C»
    if (/^только\b/i.test(text.trim()) || (!/удал|добав/i.test(text) && text.includes(','))) {
      const raw = text.replace(/^только\s+/i, '');
      const parts = raw.split(/,|;| и /).map((s) => s.trim()).filter(Boolean);
      if (parts.length >= 1 && !parseKeepAll(text)) {
        const next: string[] = [];
        for (const part of parts) {
          if (/далее|оставить|ок/i.test(part)) continue;
          const col = findColumnByUserText(part, session.availableColumns);
          if (col && !next.includes(col.path)) next.push(col.path);
        }
        if (next.length) selected = next;
      }
    }
  }

  if (!selected.length) {
    return pushAssistant(
      { ...session, messages: [...session.messages, msg('user', text)] },
      'Нужно хотя бы одно поле в составе. Уточните список или напишите «оставить как есть».',
    );
  }

  let next: ReportAiWizardSession = {
    ...session,
    selectedPaths: selected,
    messages: [...session.messages, msg('user', text)],
    step: 'aggregations',
    aggregationIndex: 0,
  };
  next = pushAssistant(
    next,
    `Принял состав (${selected.length}):\n${listBullet(
      selected.map((p) => session.labelByPath[p] ?? p),
      '',
    )}`,
  );
  next = pushAssistant(next, aggregationPrompt(next));
  return next;
}

function applyAggregationReply(
  session: ReportAiWizardSession,
  text: string,
): ReportAiWizardSession {
  const path = session.selectedPaths[session.aggregationIndex];
  const fns = session.functionsByPath[path] ?? [];
  const aggregationByPath = { ...session.aggregationByPath };

  if (path && fns.length && !parseNoneAggregation(text) && !parseKeepAll(text)) {
    const key = normalizeMatchKey(text);
    const hit =
      fns.find((f) => normalizeMatchKey(f.code) === key || normalizeMatchKey(f.label) === key) ||
      fns.find(
        (f) =>
          normalizeMatchKey(f.label).includes(key) || normalizeMatchKey(f.code).includes(key),
      );
    if (hit) {
      aggregationByPath[path] = hit.code;
    } else if (!parseSkip(text)) {
      return pushAssistant(
        { ...session, messages: [...session.messages, msg('user', text)] },
        `Не распознал функцию «${text}». Выберите из списка или напишите «нет».`,
      );
    } else {
      delete aggregationByPath[path];
    }
  } else if (path && (parseNoneAggregation(text) || parseSkip(text))) {
    delete aggregationByPath[path];
  }

  const nextIndex = session.aggregationIndex + 1;
  let next: ReportAiWizardSession = {
    ...session,
    aggregationByPath,
    messages: [...session.messages, msg('user', text)],
    aggregationIndex: nextIndex,
  };

  if (nextIndex < session.selectedPaths.length) {
    next = pushAssistant(next, aggregationPrompt(next));
    return next;
  }

  next = { ...next, step: 'filters' };
  next = pushAssistant(next, filtersPrompt(next));
  return next;
}

function applyFiltersReply(
  session: ReportAiWizardSession,
  text: string,
): ReportAiWizardSession {
  let baseDraft = session.baseDraft;
  let filtersAccepted = session.filtersAccepted;
  let customFiltersNote = session.customFiltersNote;

  if (parseSkip(text) || /без\s+фильтр/i.test(text)) {
    baseDraft = { ...baseDraft, filters: [] };
    filtersAccepted = true;
    customFiltersNote = '';
  } else if (parseKeepAll(text) || /оставить|принять/i.test(text)) {
    filtersAccepted = true;
  } else {
    filtersAccepted = true;
    customFiltersNote = text.trim();
    // мягко: сохраняем note в explanation; фильтры NL оставляем, пользователь уточнит в редакторе
    baseDraft = {
      ...baseDraft,
      explanation: `${baseDraft.explanation}; уточнение фильтров: ${text.trim()}`,
    };
  }

  let next: ReportAiWizardSession = {
    ...session,
    baseDraft,
    filtersAccepted,
    customFiltersNote,
    messages: [...session.messages, msg('user', text)],
    step: 'grouping',
  };
  next = pushAssistant(next, groupingPrompt(next));
  return next;
}

function applyGroupingReply(
  session: ReportAiWizardSession,
  text: string,
): ReportAiWizardSession {
  let groupByPaths = [...session.groupByPaths];

  if (parseSkip(text) || /без\s+групп/i.test(text)) {
    groupByPaths = [];
  } else if (!(parseKeepAll(text) || /оставить|принять/i.test(text))) {
    const parts = text.split(/,|;| и /).map((s) => s.trim()).filter(Boolean);
    const next: string[] = [];
    for (const part of parts) {
      const col = findColumnByUserText(part, session.availableColumns);
      if (col && session.groupablePaths.includes(col.path) && !next.includes(col.path)) {
        next.push(col.path);
      }
    }
    if (next.length) groupByPaths = next;
  }

  // авто-предупреждение: поля вне groupBy без agg
  const missingAgg = groupByPaths.length
    ? session.selectedPaths.filter((p) => !groupByPaths.includes(p) && !session.aggregationByPath[p])
    : [];

  let next: ReportAiWizardSession = {
    ...session,
    groupByPaths,
    messages: [...session.messages, msg('user', text)],
    step: 'sorting',
  };

  if (groupByPaths.length && missingAgg.length) {
    next = pushAssistant(
      next,
      [
        '⚠️ При такой группировке бэкенд потребует aggregation для полей состава вне groupBy:',
        listBullet(
          missingAgg.map((p) => session.labelByPath[p] ?? p),
          '',
        ),
        'Можно вернуться позже в редакторе и выбрать функцию у этих полей, либо добавить их в группировку.',
      ].join('\n'),
    );
  }

  next = pushAssistant(next, sortingPrompt(next));
  return next;
}

function applySortingReply(
  session: ReportAiWizardSession,
  text: string,
): ReportAiWizardSession {
  let sortPaths = [...session.sortPaths];

  if (parseSkip(text) || /без\s+сорт/i.test(text)) {
    sortPaths = [];
  } else if (!(parseKeepAll(text) || /далее/i.test(text.trim()))) {
    const asc = /возр|asc/i.test(text);
    const desc = /убыв|desc/i.test(text);
    const col =
      findColumnByUserText(text.replace(/по\s+/i, ''), session.availableColumns) ||
      (/широт|latitude/i.test(text)
        ? session.availableColumns.find((c) => c.path === 'latitude' || c.path.endsWith('.latitude'))
        : undefined);
    if (col) {
      const dir = desc && !asc ? 'DESC' : 'ASC';
      sortPaths = [`${col.path},${dir}`];
    } else if (/,[ ]*(ASC|DESC)\b/i.test(text)) {
      sortPaths = [text.trim()];
    }
  }

  let next: ReportAiWizardSession = {
    ...session,
    sortPaths,
    messages: [...session.messages, msg('user', text)],
    step: 'confirm',
    done: true,
  };
  next = pushAssistant(next, confirmPrompt(next));
  return next;
}

/** Обработка ответа пользователя на текущем шаге. */
export function advanceReportAiWizard(
  session: ReportAiWizardSession,
  userText: string,
): ReportAiWizardSession {
  const text = userText.trim();
  if (!text || session.done && session.step === 'confirm') {
    return session;
  }

  switch (session.step) {
    case 'columns':
      return applyColumnsReply(session, text);
    case 'aggregations':
      return applyAggregationReply(session, text);
    case 'filters':
      return applyFiltersReply(session, text);
    case 'grouping':
      return applyGroupingReply(session, text);
    case 'sorting':
      return applySortingReply(session, text);
    case 'confirm':
    default:
      return {
        ...session,
        messages: [
          ...session.messages,
          msg('user', text),
          msg('assistant', 'Черновик уже собран — нажмите «Сформировать» или «Открыть в редакторе».'),
        ],
      };
  }
}

/** Собирает итоговый ReportAiComposeDraft из сессии мастера. */
export function wizardSessionToDraft(session: ReportAiWizardSession): ReportAiComposeDraft {
  const selectedFields: ReportSelectedFieldPayload[] = session.selectedPaths.map((path) => {
    const aggregation = session.aggregationByPath[path];
    return aggregation ? { fieldName: path, aggregation } : { fieldName: path };
  });

  // поля в groupBy — без aggregation в selectedFields (как требует finalize groupBy)
  const groupSet = new Set(session.groupByPaths);
  const normalizedFields = selectedFields.map((f) => {
    if (groupSet.has(f.fieldName) && f.aggregation) {
      const { aggregation: _a, ...rest } = f;
      return rest;
    }
    return f;
  });

  const filters: ReportQueryFilter[] = session.filtersAccepted
    ? [...(session.baseDraft.filters ?? [])]
    : [];

  return {
    ...session.baseDraft,
    selectedFields: normalizedFields,
    filters,
    groupBy: session.groupByPaths.length ? session.groupByPaths : undefined,
    sort: session.sortPaths.length ? session.sortPaths : undefined,
    explanation: [
      session.baseDraft.explanation,
      session.customFiltersNote ? `Фильтры: ${session.customFiltersNote}` : '',
    ]
      .filter(Boolean)
      .join('; '),
  };
}

export function getWizardQuickReplies(session: ReportAiWizardSession): string[] {
  switch (session.step) {
    case 'columns':
      return ['оставить как есть', 'далее'];
    case 'aggregations': {
      const path = session.selectedPaths[session.aggregationIndex];
      const fns = (session.functionsByPath[path] ?? []).slice(0, 4).map((f) => f.label);
      return [...fns, 'нет', 'далее'];
    }
    case 'filters':
      return ['оставить', 'без фильтров', 'далее'];
    case 'grouping':
      return ['без группировки', 'оставить', 'далее'];
    case 'sorting':
      return ['без сортировки', 'далее'];
    case 'confirm':
      return [];
    default:
      return ['далее'];
  }
}

/** @deprecated helper export for tests */
export function resolveFieldDefForWizardPath(
  path: string,
  metadata: ReportEntityMetadata,
  outputRows: ReportOutputRow[],
  tableMetadataByRowId: Record<string, ReportEntityMetadata | null>,
  referenceEntityMetadataByName: Record<string, ReportEntityMetadata | null>,
): ReportFieldDefinition | undefined {
  const fieldMap = new Map(metadata.fields.map((f) => [f.fieldName, f]));
  return (
    findReportTableFieldDefinition(
      path,
      metadata,
      outputRows,
      fieldMap,
      tableMetadataByRowId,
      referenceEntityMetadataByName,
    ) ?? undefined
  );
}
