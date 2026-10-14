import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import ViewColumnOutlinedIcon from '@mui/icons-material/ViewColumnOutlined';
import { Box } from '@mui/material';

import { REPORT_QUERY_TRANSPORT_ERROR, executeReportQuery } from '@pages/reports/api/reportsApi';
import {
  buildGroupableColumnOptions,
  buildComposeGroupParams,
  buildComposeHavingConnects,
  buildComposeHavingParams,
  finalizeReportQueryBodyForGroupBy,
  parseComposeGroupRowsFromGroupBy,
} from '@pages/reports/lib/buildReportGroupParam';
import {
  buildComposeSortParams,
  isReportSortAllowedWithGroupBy,
  parseComposeSortRowsFromSortParams,
} from '@pages/reports/lib/buildReportSortParam';
import { buildReportQueryRequest } from '@pages/reports/lib/buildReportQueryRequest';
import {
  buildRootReportTableFieldOptions,
  collectReferenceEntitiesFromMetadata,
  findReportTableFieldDefinition,
  isReportTableFieldLabelAutoQualified,
  mergeAllReportTableFieldOptions,
} from '@pages/reports/lib/buildReportTableFieldOptions';
import {
  expandCompositeFieldPath,
  isReportCompositeFieldPath,
  normalizeCompositeTableFieldSelection,
} from '@pages/reports/lib/reportEntityCompositeFields';
import {
  buildReportTableFieldDisplayOptions,
  encodeReportIdentifierDisplayParam,
  encodeReportTableFieldFunctionParam,
  parseReportTableFieldDisplayParam,
} from '@pages/reports/lib/reportTableFieldDisplayParam';
import {
  isReportIdentifierAggregationCode,
  isReportIdentifierFieldPath,
  isRootReportIdentifierFieldPath,
} from '@pages/reports/lib/reportTableFieldIdentifier';
import { restoreReportComposeTableFieldsFromQuery } from '@pages/reports/lib/restoreReportComposeTableFields';
import {
  type ReportsComposeSnapshot,
  captureReportsComposeSnapshot,
  restoreReportsComposeSnapshot,
} from '@pages/reports/lib/reportsComposeSnapshot';
import { reportGenerationStore } from '@pages/reports/model/reportGenerationStore';
import { getPrimaryReportOutputRow, reportsStore } from '@pages/reports/model/reportsStore';
import { CHART_REPORT_PAGE_SIZE } from '@pages/reports/types/chartSpec';
import type {
  ReportLogicOperator,
  ReportQueryRequest,
} from '@pages/reports/types/reportApiTypes';
import { normalizeReportViewMode } from '@pages/reports/types/reportApiTypes';
import { Button } from '@shared/ui/button';
import { Popup } from '@shared/ui/popup';
import popupStyles from '@shared/ui/popup/Popup.module.scss';
import { appStore } from '@shared/model/app_store/AppStore';
import type { Values } from '@shared/ui/search_multiple_select';

import type { ReportComposeGroupRow } from '@pages/reports/types/reportComposeGroup';
import type { ReportComposeSortRow } from '@pages/reports/types/reportComposeSort';

import { ReportComposeForm } from './ReportComposeForm';
import composeStyles from './ReportComposeModal.module.scss';
import {
  ReportComposeBranchSelect,
  reportComposeBranchValuesToIds,
} from './ReportComposeBranchSelect';
import { ReportComposeGroupSection } from './ReportComposeGroupSection';
import { ReportComposeSection } from './ReportComposeSection';
import { ReportComposeSortSection } from './ReportComposeSortSection';
import { ReportTableFieldsTransfer } from './ReportTableFieldsTransfer';

export type ReportComposeModalMode = 'create' | 'edit';

type ReportComposeModalProps = {
  open: boolean;
  mode?: ReportComposeModalMode;
  onClose: () => void;
  onReportFormed?: () => void;
};

export function ReportComposeModal({
  open,
  mode = 'create',
  onClose,
  onReportFormed,
}: ReportComposeModalProps) {
  const { t } = useTranslation();
  const snapshotRef = useRef<ReportsComposeSnapshot | null>(null);
  const confirmedRef = useRef(false);

  const isGenerating = reportGenerationStore((s) => s.isGenerating);
  const editColumnHeaderLabels = reportGenerationStore(
    (s) => s.queryContext?.columnHeaderLabels,
  );
  const metadata = reportsStore((s) => s.metadata);
  const metadataLoading = reportsStore((s) => s.metadataLoading);
  const selectedEntityName = reportsStore((s) => s.selectedEntityName);
  const entities = reportsStore((s) => s.entities);
  const outputRows = reportsStore((s) => s.outputRows);
  const logicOperator = reportsStore((s) => s.logicOperator);
  const reportTableFieldsMetadataByRowId = reportsStore((s) => s.reportTableFieldsMetadataByRowId);
  const referenceEntityMetadataByName = reportsStore((s) => s.referenceEntityMetadataByName);
  const tableFieldDisplayParamByPath = reportsStore((s) => s.tableFieldDisplayParamByPath);
  const setTableFieldDisplayParam = reportsStore((s) => s.setTableFieldDisplayParam);
  const setTableFieldDisplayParamByPath = reportsStore((s) => s.setTableFieldDisplayParamByPath);
  const tableFieldHiddenByPath = reportsStore((s) => s.tableFieldHiddenByPath);
  const setTableFieldHidden = reportsStore((s) => s.setTableFieldHidden);
  const setTableFieldHiddenByPath = reportsStore((s) => s.setTableFieldHiddenByPath);
  const referenceEntityMetadataLoadingByName = reportsStore(
    (s) => s.referenceEntityMetadataLoadingByName,
  );
  const authId = appStore((s) => s.authId);
  const isSuperAdmin = Number(authId) === 1;

  const [tableFieldsSelection, setTableFieldsSelection] = useState<Values>([]);
  const [composeSortRows, setComposeSortRows] = useState<ReportComposeSortRow[]>([]);
  const [composeGroupRows, setComposeGroupRows] = useState<ReportComposeGroupRow[]>([]);
  const [composeHavingLogicOperator, setComposeHavingLogicOperator] =
    useState<ReportLogicOperator>('or');
  const [selectedBranchOffices, setSelectedBranchOffices] = useState<Values>([]);
  const prevComposeEntityRef = useRef<string | null>(null);

  useLayoutEffect(() => {
    if (!open) return;
    confirmedRef.current = false;
    snapshotRef.current = captureReportsComposeSnapshot();

    if (mode === 'create') {
      // Чтобы «Создать новый отчёт» открывался без черновых полей текущего отчёта.
      // При «Отмена» снимок будет восстановлен (handleClose).
      reportsStore.getState().setSelectedEntityName(null);
      reportsStore.getState().resetFilters();
      reportsStore.getState().setTableFieldDisplayParamByPath({});
      setTableFieldsSelection([]);
      setComposeSortRows([]);
      setComposeGroupRows([]);
      setComposeHavingLogicOperator('or');
      setSelectedBranchOffices([]);
      return;
    }

    const queryContext = reportGenerationStore.getState().queryContext;
    const queryBody = queryContext?.body;
    const primaryRow = getPrimaryReportOutputRow();
    // Источник истины при edit — selectedFields сформированного отчёта, не дефолтный состав.
    const fromQuery = restoreReportComposeTableFieldsFromQuery(
      queryBody?.selectedFields,
      queryContext?.columnHeaderLabels,
    );
    const fromStore =
      primaryRow.reportTableFields.length > 0 ? [...primaryRow.reportTableFields] : [];
    const tableFields = fromQuery.length > 0 ? fromQuery : fromStore;

    const savedBranchOffices = queryContext?.branchOffices;
    const savedBranchIds = queryContext?.branchIds;
    setTableFieldsSelection(tableFields);
    // Держим store в синхроне — иначе sync-эффект / повторное открытие видят пустой состав.
    const { setOutputRowReportTableFields, outputRows: rows } = reportsStore.getState();
    if (tableFields.length) {
      for (const row of rows) {
        setOutputRowReportTableFields(row.id, tableFields);
      }
    }
    setSelectedBranchOffices(
      savedBranchOffices?.length
        ? [...savedBranchOffices]
        : savedBranchIds?.length
          ? savedBranchIds.map((id) => ({ value: id, label: String(id) }))
          : [],
    );
    // Сортировка: сначала live store, иначе снимок из queryContext (store мог сброситься гридом).
    const savedSort =
      reportGenerationStore.getState().sort.length > 0
        ? reportGenerationStore.getState().sort
        : (queryContext?.sort ?? []);
    setComposeSortRows(parseComposeSortRowsFromSortParams(savedSort, tableFields));
    setComposeGroupRows(
      parseComposeGroupRowsFromGroupBy(queryBody?.groupBy, tableFields, queryBody?.having),
    );
    setComposeHavingLogicOperator(
      queryBody?.havingConnects?.[0]?.logicOperator === 'and' ? 'and' : 'or',
    );
    const restoredDisplay: Record<string, string> = {};
    for (const field of queryBody?.selectedFields ?? []) {
      const encoded = encodeReportTableFieldFunctionParam(field.aggregation);
      if (!encoded || !field.fieldName) continue;
      restoredDisplay[field.fieldName] = encoded;
    }
    // Идентификатор: всегда fn:count (без «не выбрана» / countDistinct).
    const identifierCount = encodeReportIdentifierDisplayParam();
    for (const field of tableFields) {
      const key = String(field.value);
      if (isReportIdentifierFieldPath(key)) {
        restoredDisplay[key] = identifierCount;
      }
    }
    reportsStore.getState().setTableFieldDisplayParamByPath(restoredDisplay);
    const restoredHidden: Record<string, boolean> = {};
    for (const key of queryContext?.hiddenColumnKeys ?? []) {
      if (key) restoredHidden[key] = true;
    }
    for (const field of tableFields) {
      const key = String(field.value);
      if (isReportIdentifierFieldPath(key)) {
        restoredHidden[key] = true;
      }
    }
    reportsStore.getState().setTableFieldHiddenByPath(restoredHidden);
  }, [open, mode]);

  const handleClose = useCallback(() => {
    if (!confirmedRef.current && snapshotRef.current) {
      restoreReportsComposeSnapshot(snapshotRef.current);
    }
    snapshotRef.current = null;
    onClose();
  }, [onClose]);

  const nestedReferenceMetadataCacheKey = useMemo(() => {
    if (!metadata) return '';
    return collectReferenceEntitiesFromMetadata(metadata)
      .map((ref) => {
        const nested = referenceEntityMetadataByName[ref];
        const loading = referenceEntityMetadataLoadingByName[ref];
        return `${ref}:${loading ? 'loading' : (nested?.fields?.length ?? 0)}`;
      })
      .join('|');
  }, [metadata, referenceEntityMetadataByName, referenceEntityMetadataLoadingByName]);

  const tableFieldsDialogOptions = useMemo((): Values => {
    if (!metadata) return [];
    const fieldMap = new Map(metadata.fields.map((f) => [f.fieldName, f]));
    const activeRows = outputRows.filter((row) => row.selectedOutputFields.length > 0);
    return mergeAllReportTableFieldOptions(
      metadata,
      activeRows,
      fieldMap,
      reportTableFieldsMetadataByRowId,
      referenceEntityMetadataByName,
      entities,
      t,
    );
  }, [
    metadata,
    outputRows,
    reportTableFieldsMetadataByRowId,
    referenceEntityMetadataByName,
    entities,
    nestedReferenceMetadataCacheKey,
  ]);

  const tableFieldsInitialSelection = useMemo((): Values => {
    const primaryRow = getPrimaryReportOutputRow();
    return primaryRow.reportTableFields.length > 0 ? primaryRow.reportTableFields : [];
  }, [outputRows, open]);

  const canFormReport = useMemo(
    () => Boolean(selectedEntityName && metadata && !metadataLoading),
    [selectedEntityName, metadata, metadataLoading],
  );

  const tableFieldsOptionsKey = useMemo(
    () => tableFieldsDialogOptions.map((o) => String(o.value)).join('\0'),
    [tableFieldsDialogOptions],
  );

  const tableFieldsDialogOptionsRef = useRef(tableFieldsDialogOptions);
  tableFieldsDialogOptionsRef.current = tableFieldsDialogOptions;

  const defaultRootTableFields = useMemo(() => {
    if (!metadata) return [];
    return buildRootReportTableFieldOptions(metadata, outputRows, entities, t);
  }, [metadata, outputRows, entities, t]);

  const showColumnsSection =
    defaultRootTableFields.length > 0 || tableFieldsDialogOptions.length > 0;

  const sortColumnOptions = useMemo(() => {
    const selected =
      tableFieldsSelection.length > 0
        ? tableFieldsSelection
        : tableFieldsInitialSelection.length > 0
          ? tableFieldsInitialSelection
          : defaultRootTableFields;
    return Array.from(
      new Map(selected.map((item) => [String(item.value), item])).values(),
    ).filter((item) => !isReportIdentifierFieldPath(String(item.value)));
  }, [tableFieldsSelection, tableFieldsInitialSelection, defaultRootTableFields]);

  const groupColumnOptions = useMemo(() => {
    if (!metadata) return [];
    const fieldMap = new Map(metadata.fields.map((f) => [f.fieldName, f]));
    const activeRows = outputRows.filter((row) => row.selectedOutputFields.length > 0);
    const base = buildGroupableColumnOptions(
      sortColumnOptions,
      metadata,
      activeRows,
      fieldMap,
      reportTableFieldsMetadataByRowId,
      referenceEntityMetadataByName,
    );
    // Поля уже выбранной группировки (edit) — с русскими подписями, даже если
    // временно нет в отфильтрованном списке groupable options.
    const byKey = new Map(base.map((o) => [String(o.value), o]));
    for (const row of composeGroupRows) {
      const key = row.columnKey.trim();
      if (!key || byKey.has(key)) continue;
      const fromSort = sortColumnOptions.find((o) => String(o.value) === key);
      byKey.set(key, {
        value: key,
        label:
          (fromSort?.label != null && String(fromSort.label).trim()) ||
          (editColumnHeaderLabels?.[key] ?? '').trim() ||
          key,
      });
    }
    return Array.from(byKey.values());
  }, [
    sortColumnOptions,
    metadata,
    outputRows,
    reportTableFieldsMetadataByRowId,
    referenceEntityMetadataByName,
    composeGroupRows,
    editColumnHeaderLabels,
  ]);

  const composeGroupBy = useMemo(
    () => buildComposeGroupParams(composeGroupRows),
    [composeGroupRows],
  );

  const sortColumnOptionsForUi = useMemo(() => {
    if (!composeGroupBy.length) return sortColumnOptions;
    return sortColumnOptions.filter((option) =>
      isReportSortAllowedWithGroupBy(String(option.value), composeGroupBy),
    );
  }, [sortColumnOptions, composeGroupBy]);

  useEffect(() => {
    if (!open || !composeGroupBy.length) return;
    setComposeSortRows((prev) => {
      const next = prev.filter((row) =>
        isReportSortAllowedWithGroupBy(row.columnKey, composeGroupBy),
      );
      return next.length === prev.length ? prev : next;
    });
  }, [open, composeGroupBy]);

  /** Синхронизация «Текущий состав»: по умолчанию только поля сущности отчёта;
   *  вложенные колонки не добавляются автоматически (только в «Доступные»).
   *  Смена сущности в create — полный сброс состава под новую metadata. */
  useEffect(() => {
    if (!open) {
      prevComposeEntityRef.current = null;
      return;
    }

    const entityChanged =
      Boolean(selectedEntityName) &&
      prevComposeEntityRef.current != null &&
      prevComposeEntityRef.current !== selectedEntityName;
    if (selectedEntityName) {
      prevComposeEntityRef.current = selectedEntityName;
    }

    // Смена сущности (create или подтверждённая в edit) — как новый отчёт.
    if (entityChanged) {
      setComposeSortRows([]);
      setComposeGroupRows([]);
      setComposeHavingLogicOperator('or');
      const nextDefaults = defaultRootTableFields.length ? [...defaultRootTableFields] : [];
      setTableFieldsSelection(nextDefaults);
      const identifierCount = encodeReportIdentifierDisplayParam();
      const display: Record<string, string> = {};
      const hidden: Record<string, boolean> = {};
      for (const item of nextDefaults) {
        const key = String(item.value);
        if (isReportIdentifierFieldPath(key)) {
          hidden[key] = true;
          display[key] = identifierCount;
        }
      }
      setTableFieldDisplayParamByPath(display);
      setTableFieldHiddenByPath(hidden);
      return;
    }

    const currentOptions = tableFieldsDialogOptionsRef.current;
    setTableFieldsSelection((prev) => {
      // На части сущностей options может кратко стать пустым во время перерасчёта metadata.
      if (!currentOptions.length) {
        if (!defaultRootTableFields.length) {
          return mode === 'edit' ? prev : [];
        }
        return prev;
      }
      const optionByKey = new Map(
        [...defaultRootTableFields, ...currentOptions].map((o) => [String(o.value), o]),
      );
      // Пустой состав: после смены сущности / create — дефолты; при первом открытии edit
      // состав уже восстановлен в useLayoutEffect (prev не пуст).
      if (prev.length === 0) {
        return defaultRootTableFields.length ? [...defaultRootTableFields] : prev;
      }

      // create: только поля текущей сущности; edit — сохраняем пути, пока грузится nested.
      const source =
        mode === 'create'
          ? prev.filter((p) => optionByKey.has(String(p.value)))
          : prev;
      if (mode === 'create' && source.length === 0 && defaultRootTableFields.length) {
        return [...defaultRootTableFields];
      }

      let remapped = source.map((p) => {
        const key = String(p.value);
        const opt = optionByKey.get(key);
        const prevLabel = (p.label ?? '').trim();
        const optLabel = (opt?.label ?? '').trim();
        // Алиас с «карандаша» не затираем дефолтной подписью options.
        const keepCustomAlias =
          Boolean(prevLabel) &&
          prevLabel !== key &&
          prevLabel !== optLabel &&
          !isReportTableFieldLabelAutoQualified(prevLabel);
        return {
          value: key,
          label: keepCustomAlias ? prevLabel : optLabel || prevLabel || key,
        };
      });

      // Корневой id всегда в «Текущем составе».
      if (
        optionByKey.has('id') &&
        !remapped.some((item) => isRootReportIdentifierFieldPath(String(item.value)))
      ) {
        const idOpt = optionByKey.get('id')!;
        remapped = [{ value: 'id', label: idOpt.label ?? 'id' }, ...remapped];
      }

      const deduped = Array.from(
        new Map(remapped.map((item) => [String(item.value), item])).values(),
      );
      const normalized = normalizeCompositeTableFieldSelection(deduped, currentOptions);
      const unchanged =
        normalized.length === prev.length &&
        normalized.every(
          (item, index) =>
            item.value === prev[index]?.value && item.label === prev[index]?.label,
        );
      return unchanged ? prev : normalized;
    });
  }, [
    open,
    mode,
    selectedEntityName,
    tableFieldsOptionsKey,
    defaultRootTableFields,
    setTableFieldDisplayParamByPath,
    setTableFieldHiddenByPath,
  ]);

  const loadAllReferenceEntityMetadataForReport = reportsStore(
    (s) => s.loadAllReferenceEntityMetadataForReport,
  );

  const ensureTableFieldsMetadataLoaded = useCallback(async () => {
    const { metadata: entityMetadata } = reportsStore.getState();
    if (!entityMetadata) return false;
    await loadAllReferenceEntityMetadataForReport(entityMetadata);
    return true;
  }, [loadAllReferenceEntityMetadataForReport]);

  const resolveComposeTableFieldsSelection = useCallback((): Values => {
    const selectedRaw =
      tableFieldsSelection.length > 0
        ? tableFieldsSelection
        : tableFieldsInitialSelection.length > 0
          ? tableFieldsInitialSelection
          : defaultRootTableFields;
    return Array.from(
      new Map(selectedRaw.map((item) => [String(item.value), item])).values(),
    );
  }, [tableFieldsSelection, tableFieldsInitialSelection, defaultRootTableFields]);

  const buildCurrentReportBody = useCallback((): {
    entityName: string;
    body: ReportQueryRequest;
  } | null => {
    const {
      selectedEntityName: entityName,
      metadata: entityMetadata,
      logicOperator: currentLogicOperator,
      reportTableFieldsMetadataByRowId: tableMetadataByRowId,
      referenceEntityMetadataByName: nestedMetadataByName,
    } = reportsStore.getState();

    if (!entityName) return null;

    const emptyBody: ReportQueryRequest = { selectedFields: [], filters: [] };
    const body = entityMetadata
      ? buildReportQueryRequest({
          metadata: entityMetadata,
          outputRows: reportsStore.getState().outputRows,
          logicOperator: currentLogicOperator,
          reportTableFieldsMetadataByRowId: tableMetadataByRowId,
          referenceEntityMetadataByName: nestedMetadataByName,
          tableFieldDisplayParamByPath: reportsStore.getState().tableFieldDisplayParamByPath,
          fallbackReportTableFields: resolveComposeTableFieldsSelection(),
        })
      : emptyBody;

    return { entityName, body };
  }, [resolveComposeTableFieldsSelection]);

  const saveTableFieldsSelectionToStore = useCallback(() => {
    const selected = resolveComposeTableFieldsSelection();
    if (!selected.length) return;
    const { setOutputRowReportTableFields: setTableFields, outputRows } = reportsStore.getState();
    for (const row of outputRows) {
      setTableFields(row.id, selected);
    }
  }, [resolveComposeTableFieldsSelection]);

  const getTableFieldDisplayOptions = useCallback(
    (fieldPath: string): Values => {
      if (!metadata) return [];
      const fieldMap = new Map(metadata.fields.map((f) => [f.fieldName, f]));
      const paths = isReportCompositeFieldPath(fieldPath)
        ? expandCompositeFieldPath(fieldPath)
        : [fieldPath];
      const lookupPath = paths.find((p) => !isReportCompositeFieldPath(p)) ?? fieldPath;
      const fieldDef = findReportTableFieldDefinition(
        lookupPath,
        metadata,
        outputRows,
        fieldMap,
        reportTableFieldsMetadataByRowId,
        referenceEntityMetadataByName,
      );
      return buildReportTableFieldDisplayOptions(fieldDef, fieldPath);
    },
    [metadata, outputRows, reportTableFieldsMetadataByRowId, referenceEntityMetadataByName],
  );

  const handleTableFieldDisplayParamChange = useCallback(
    (fieldPath: string, encoded: string) => {
      // Идентификатор: агрегация зафиксирована как Количество.
      if (isReportIdentifierFieldPath(fieldPath)) {
        setTableFieldDisplayParam(fieldPath, encodeReportIdentifierDisplayParam());
        return;
      }
      setTableFieldDisplayParam(fieldPath, encoded);
    },
    [setTableFieldDisplayParam],
  );

  const handleTableFieldsSelectionChange = useCallback(
    (next: Values) => {
      let selection = next;
      const idOpt =
        defaultRootTableFields.find((item) => isRootReportIdentifierFieldPath(String(item.value))) ??
        tableFieldsDialogOptions.find((item) =>
          isRootReportIdentifierFieldPath(String(item.value)),
        );
      if (
        idOpt &&
        !selection.some((item) => isRootReportIdentifierFieldPath(String(item.value)))
      ) {
        selection = [idOpt, ...selection];
      }
      setTableFieldsSelection(selection);

      const prevHidden = reportsStore.getState().tableFieldHiddenByPath;
      const allowed = new Set(selection.map((item) => String(item.value)));
      const hidden: Record<string, boolean> = {};
      for (const key of allowed) {
        if (prevHidden[key] !== undefined) {
          hidden[key] = prevHidden[key]!;
        } else if (isReportIdentifierFieldPath(key)) {
          hidden[key] = true;
        }
      }
      setTableFieldHiddenByPath(hidden);
    },
    [defaultRootTableFields, tableFieldsDialogOptions, setTableFieldHiddenByPath],
  );

  const handleTableFieldVisibilityChange = useCallback(
    (fieldPath: string, visible: boolean) => {
      // Идентификатор никогда не показывается в гриде — глаз всегда «закрыт».
      if (isReportIdentifierFieldPath(fieldPath)) {
        setTableFieldHidden(fieldPath, true);
        return;
      }
      setTableFieldHidden(fieldPath, !visible);
    },
    [setTableFieldHidden],
  );

  useEffect(() => {
    const allowed = new Set(tableFieldsSelection.map((item) => String(item.value)));
    const current = reportsStore.getState().tableFieldDisplayParamByPath;
    const identifierCount = encodeReportIdentifierDisplayParam();
    const next: Record<string, string> = {};
    for (const [path, encoded] of Object.entries(current)) {
      if (
        allowed.has(path) ||
        [...allowed].some((key) => path === key || path.startsWith(`${key}.`))
      ) {
        next[path] = encoded;
      }
    }
    let displayChanged = Object.keys(next).length !== Object.keys(current).length;
    for (const key of allowed) {
      if (!isReportIdentifierFieldPath(key)) continue;
      const parsed = parseReportTableFieldDisplayParam(next[key]);
      const code = parsed?.code ?? '';
      if (!isReportIdentifierAggregationCode(code)) {
        next[key] = identifierCount;
        displayChanged = true;
      }
    }
    if (displayChanged) {
      setTableFieldDisplayParamByPath(next);
    }

    // Идентификаторы по умолчанию скрыты в гриде; прочие ключи вне состава убираем.
    const prevHidden = reportsStore.getState().tableFieldHiddenByPath;
    const hidden: Record<string, boolean> = {};
    let hiddenChanged = false;
    for (const key of allowed) {
      if (prevHidden[key] !== undefined) {
        hidden[key] = isReportIdentifierFieldPath(key) ? true : prevHidden[key]!;
      } else if (isReportIdentifierFieldPath(key)) {
        hidden[key] = true;
      } else {
        continue;
      }
      if (hidden[key] !== prevHidden[key]) hiddenChanged = true;
    }
    for (const key of Object.keys(prevHidden)) {
      if (!allowed.has(key)) {
        hiddenChanged = true;
        break;
      }
    }
    if (hiddenChanged || Object.keys(hidden).length !== Object.keys(prevHidden).length) {
      setTableFieldHiddenByPath(hidden);
    }
  }, [tableFieldsSelection, setTableFieldDisplayParamByPath, setTableFieldHiddenByPath]);

  const ensureSelectedFieldsInBody = useCallback((body: ReportQueryRequest) => body, []);

  const reportQueryErrorMessage = useCallback(
    (e: unknown) => {
      if (e instanceof Error && e.message === REPORT_QUERY_TRANSPORT_ERROR) {
        return t('reports.queryNetworkError');
      }
      return e instanceof Error ? e.message : t('reports.loadError');
    },
    [t],
  );

  const executeReportLoad = useCallback(async (): Promise<boolean> => {
    saveTableFieldsSelectionToStore();

    const ctx = buildCurrentReportBody();
    if (!ctx) return false;
    const { entityName, body: rawBody } = ctx;
    const body = ensureSelectedFieldsInBody(rawBody);

    const groupBy = composeGroupBy;
    const columnLabelByKey = new Map(
      groupColumnOptions.map((option) => [
        String(option.value),
        String(option.label ?? option.value),
      ]),
    );
    const {
      metadata: entityMetadata,
      outputRows: currentOutputRows,
      reportTableFieldsMetadataByRowId: tableMetadataByRowId,
      referenceEntityMetadataByName: nestedMetadataByName,
    } = reportsStore.getState();
    const havingFieldMap = entityMetadata
      ? new Map(entityMetadata.fields.map((field) => [field.fieldName, field]))
      : null;
    const having = buildComposeHavingParams(composeGroupRows, columnLabelByKey, (columnKey) => {
      if (!entityMetadata || !havingFieldMap) return null;
      return (
        findReportTableFieldDefinition(
          columnKey,
          entityMetadata,
          currentOutputRows,
          havingFieldMap,
          tableMetadataByRowId,
          nestedMetadataByName,
        ) ?? null
      );
    });
    const havingConnects = having.length
      ? buildComposeHavingConnects(composeGroupRows, composeHavingLogicOperator)
      : [];
    const sortParams = buildComposeSortParams(composeSortRows, groupBy.length ? groupBy : undefined);
    const bodyWithGroup = finalizeReportQueryBodyForGroupBy(
      {
        ...body,
        ...(groupBy.length ? { groupBy } : {}),
        ...(having.length ? { having } : {}),
        ...(havingConnects.length ? { havingConnects } : {}),
      },
      groupBy.length && entityMetadata
        ? {
            metadata: entityMetadata,
            outputRows: currentOutputRows,
            fieldMap: new Map(entityMetadata.fields.map((f) => [f.fieldName, f])),
            tableMetadataByRowId: tableMetadataByRowId,
            referenceEntityMetadataByName: nestedMetadataByName,
          }
        : undefined,
    );
    const { pagination, setQueryContext, setPagination, setSort } =
      reportGenerationStore.getState();
    const branchIds = isSuperAdmin ? reportComposeBranchValuesToIds(selectedBranchOffices) : [];
    reportGenerationStore.getState().start();
    setPagination({ page: 0 });
    setSort(sortParams);

    try {
      const hiddenFromUi = reportsStore.getState().tableFieldHiddenByPath;
      const hiddenColumnKeys = Array.from(
        new Set([
          ...Object.entries(hiddenFromUi)
            .filter(([, hidden]) => hidden)
            .map(([key]) => key),
          ...(bodyWithGroup.selectedFields ?? [])
            .map((field) => field.fieldName)
            .filter((name) => isReportIdentifierFieldPath(name)),
        ]),
      );
      setQueryContext({
        entityName,
        body: bodyWithGroup,
        hiddenColumnKeys,
        branchIds: branchIds.length ? branchIds : undefined,
        branchOffices: selectedBranchOffices.length ? selectedBranchOffices : undefined,
        sort: sortParams,
        chartSpec: reportsStore.getState().chartSpec,
      });

      const viewMode = normalizeReportViewMode(reportsStore.getState().viewMode);
      const fetchSize =
        viewMode === 'chart' ? CHART_REPORT_PAGE_SIZE : pagination.pageSize;

      const result = await executeReportQuery(entityName, bodyWithGroup, {
        page: 0,
        size: fetchSize,
        sort: sortParams,
        branchIds: branchIds.length ? branchIds : undefined,
      });
      reportGenerationStore.getState().completeSuccess(result);
      onReportFormed?.();
      return true;
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') {
        reportGenerationStore.getState().finishCancelled();
        return false;
      }
      reportGenerationStore.getState().completeError(reportQueryErrorMessage(e));
      return false;
    }
  }, [
    buildCurrentReportBody,
    saveTableFieldsSelectionToStore,
    ensureSelectedFieldsInBody,
    composeSortRows,
    composeGroupBy,
    composeGroupRows,
    composeHavingLogicOperator,
    groupColumnOptions,
    onReportFormed,
    reportQueryErrorMessage,
    isSuperAdmin,
    selectedBranchOffices,
  ]);

  const handleFormReport = useCallback(async () => {
    if (reportGenerationStore.getState().isGenerating) return;

    await ensureTableFieldsMetadataLoaded();
    saveTableFieldsSelectionToStore();

    const ok = await executeReportLoad();
    if (!ok) {
      // Ошибка бэка / отмена: модалку не закрываем, параметры остаются для правки.
      return;
    }

    confirmedRef.current = true;
    snapshotRef.current = null;
    onClose();
  }, [
    ensureTableFieldsMetadataLoaded,
    saveTableFieldsSelectionToStore,
    executeReportLoad,
    onClose,
  ]);

  useEffect(() => {
    if (!open || !metadata) return;
    void ensureTableFieldsMetadataLoaded();
  }, [open, metadata, outputRows, ensureTableFieldsMetadataLoaded]);

  return (
    <Popup
      isOpen={open}
      headerTitle={
        mode === 'edit' ? t('reports.composeModalEditTitle') : t('reports.composeModalTitle')
      }
      toggleModal={handleClose}
      onCloseModal={handleClose}
      closeonClickSpace={false}
      dragResize={{
        defaultWidth: 1580,
        defaultHeight: window.innerHeight - 24,
        minWidth: 720,
        minHeight: 420,
      }}
      styles={{
        size: `${popupStyles.size} ${composeStyles.composeModalSize}`,
        substr: `${popupStyles.substr} ${composeStyles.composeModalPaper}`,
      }}
      body={
        <Box className={composeStyles.composeBody}>
          <div className={composeStyles.composeMainGrid}>
            <ReportComposeForm
              part="entity"
              confirmEntityChange={mode === 'edit'}
              onAfterEntityChange={() => {
                setComposeSortRows([]);
                setComposeGroupRows([]);
                setComposeHavingLogicOperator('or');
                reportGenerationStore.getState().clearResults();
              }}
            />
            {showColumnsSection ? (
              <div className={composeStyles.composeColumnsSlot}>
                <ReportComposeSection
                  className={composeStyles.composeColumnsSection}
                  icon={ViewColumnOutlinedIcon}
                  iconTone="violet"
                  title={t('reports.composeSectionColumns')}>
                  <ReportTableFieldsTransfer
                    options={tableFieldsDialogOptions}
                    value={tableFieldsSelection}
                    onChange={handleTableFieldsSelectionChange}
                    displayParamByKey={tableFieldDisplayParamByPath}
                    getDisplayOptions={getTableFieldDisplayOptions}
                    onDisplayParamChange={handleTableFieldDisplayParamChange}
                    hiddenByKey={tableFieldHiddenByPath}
                    onVisibilityChange={handleTableFieldVisibilityChange}
                    lockedChosenKeys={['id']}
                  />
                </ReportComposeSection>
              </div>
            ) : null}
            <ReportComposeForm part="filters" />
            {showColumnsSection && groupColumnOptions.length > 0 ? (
              <div className={composeStyles.sortSectionSlot}>
                <ReportComposeGroupSection
                  columnOptions={groupColumnOptions}
                  groupRows={composeGroupRows}
                  onChange={setComposeGroupRows}
                  logicOperator={composeHavingLogicOperator}
                  onLogicOperatorChange={setComposeHavingLogicOperator}
                  entityMetadata={metadata}
                  outputRows={outputRows}
                  tableMetadataByRowId={reportTableFieldsMetadataByRowId}
                  referenceEntityMetadataByName={referenceEntityMetadataByName}
                  columnHeaderLabels={editColumnHeaderLabels}
                  branchIds={
                    isSuperAdmin
                      ? reportComposeBranchValuesToIds(selectedBranchOffices)
                      : []
                  }
                />
              </div>
            ) : null}
            {showColumnsSection && sortColumnOptionsForUi.length > 0 ? (
              <div className={composeStyles.sortSectionSlot}>
                <ReportComposeSortSection
                  columnOptions={sortColumnOptionsForUi}
                  sortRows={composeSortRows}
                  onChange={setComposeSortRows}
                />
              </div>
            ) : null}
          </div>
        </Box>
      }
      buttons={[
        ...(isSuperAdmin
          ? [
              <ReportComposeBranchSelect
                key="branch"
                value={selectedBranchOffices}
                onChange={setSelectedBranchOffices}
              />,
            ]
          : []),
        <div key="actions" className={composeStyles.composeFooterButtons}>
          <Button
            disabled={!canFormReport || isGenerating}
            onClick={() => void handleFormReport()}>
            {t('reports.formReport')}
          </Button>
          <Button onClick={handleClose}>{t('common.cancel')}</Button>
        </div>,
      ]}
    />
  );
}
