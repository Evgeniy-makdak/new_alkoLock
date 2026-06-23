import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import ViewColumnOutlinedIcon from '@mui/icons-material/ViewColumnOutlined';
import { Box } from '@mui/material';

import { REPORT_QUERY_TRANSPORT_ERROR, executeReportQuery } from '@pages/reports/api/reportsApi';
import {
  buildGroupableColumnOptions,
  buildComposeGroupParams,
  finalizeReportQueryBodyForGroupBy,
  parseComposeGroupRowsFromGroupBy,
} from '@pages/reports/lib/buildReportGroupParam';
import { buildComposeFilterConfigurationKey } from '@pages/reports/lib/buildComposeFilterConfigurationKey';
import {
  buildComposeSortParams,
  isReportSortAllowedWithGroupBy,
  parseComposeSortRowsFromSortParams,
} from '@pages/reports/lib/buildReportSortParam';
import { buildReportQueryRequest } from '@pages/reports/lib/buildReportQueryRequest';
import {
  buildRootReportTableFieldOptions,
  collectReferenceEntitiesFromMetadata,
  mergeAllReportTableFieldOptions,
} from '@pages/reports/lib/buildReportTableFieldOptions';
import { normalizeCompositeTableFieldSelection } from '@pages/reports/lib/reportEntityCompositeFields';
import {
  type ReportsComposeSnapshot,
  captureReportsComposeSnapshot,
  restoreReportsComposeSnapshot,
} from '@pages/reports/lib/reportsComposeSnapshot';
import { reportGenerationStore } from '@pages/reports/model/reportGenerationStore';
import { getPrimaryReportOutputRow, reportsStore } from '@pages/reports/model/reportsStore';
import type { ReportQueryRequest } from '@pages/reports/types/reportApiTypes';
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
  const metadata = reportsStore((s) => s.metadata);
  const metadataLoading = reportsStore((s) => s.metadataLoading);
  const selectedEntityName = reportsStore((s) => s.selectedEntityName);
  const entities = reportsStore((s) => s.entities);
  const outputRows = reportsStore((s) => s.outputRows);
  const logicOperator = reportsStore((s) => s.logicOperator);
  const reportTableFieldsMetadataByRowId = reportsStore((s) => s.reportTableFieldsMetadataByRowId);
  const referenceEntityMetadataByName = reportsStore((s) => s.referenceEntityMetadataByName);
  const referenceEntityMetadataLoadingByName = reportsStore(
    (s) => s.referenceEntityMetadataLoadingByName,
  );
  const authId = appStore((s) => s.authId);
  const isSuperAdmin = Number(authId) === 1;

  const [tableFieldsSelection, setTableFieldsSelection] = useState<Values>([]);
  const [composeSortRows, setComposeSortRows] = useState<ReportComposeSortRow[]>([]);
  const [composeGroupRows, setComposeGroupRows] = useState<ReportComposeGroupRow[]>([]);
  const [selectedBranchOffices, setSelectedBranchOffices] = useState<Values>([]);
  const filterConfigurationKeyRef = useRef<string | null>(null);

  const filterConfigurationKey = useMemo(
    () =>
      buildComposeFilterConfigurationKey({
        selectedEntityName,
        logicOperator,
        outputRows,
      }),
    [selectedEntityName, logicOperator, outputRows],
  );

  useLayoutEffect(() => {
    if (!open) return;
    confirmedRef.current = false;
    snapshotRef.current = captureReportsComposeSnapshot();

    if (mode === 'create') {
      // Чтобы «Создать новый отчёт» открывался без черновых полей текущего отчёта.
      // При «Отмена» снимок будет восстановлен (handleClose).
      reportsStore.getState().setSelectedEntityName(null);
      reportsStore.getState().resetFilters();
      setTableFieldsSelection([]);
      setComposeSortRows([]);
      setComposeGroupRows([]);
      setSelectedBranchOffices([]);
      return;
    }

    const primaryRow = getPrimaryReportOutputRow();
    const tableFields =
      primaryRow.reportTableFields.length > 0 ? [...primaryRow.reportTableFields] : [];
    const queryBody = reportGenerationStore.getState().queryContext?.body;
    const savedBranchOffices = reportGenerationStore.getState().queryContext?.branchOffices;
    const savedBranchIds = reportGenerationStore.getState().queryContext?.branchIds;
    setTableFieldsSelection(tableFields);
    setSelectedBranchOffices(
      savedBranchOffices?.length
        ? [...savedBranchOffices]
        : savedBranchIds?.length
          ? savedBranchIds.map((id) => ({ value: id, label: String(id) }))
          : [],
    );
    setComposeSortRows(
      parseComposeSortRowsFromSortParams(reportGenerationStore.getState().sort, tableFields),
    );
    setComposeGroupRows(parseComposeGroupRowsFromGroupBy(queryBody?.groupBy, tableFields));
    filterConfigurationKeyRef.current = buildComposeFilterConfigurationKey({
      selectedEntityName: reportsStore.getState().selectedEntityName,
      logicOperator: reportsStore.getState().logicOperator,
      outputRows: reportsStore.getState().outputRows,
    });
  }, [open, mode]);

  useEffect(() => {
    if (!open) {
      filterConfigurationKeyRef.current = null;
      return;
    }

    if (filterConfigurationKeyRef.current === null) {
      filterConfigurationKeyRef.current = filterConfigurationKey;
      return;
    }

    if (filterConfigurationKeyRef.current === filterConfigurationKey) return;

    filterConfigurationKeyRef.current = filterConfigurationKey;
    setComposeSortRows([]);
    setComposeGroupRows([]);
  }, [open, filterConfigurationKey]);

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

  const showColumnsSection = tableFieldsDialogOptions.length > 0;

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

  const sortColumnOptions = useMemo(() => {
    const selected =
      tableFieldsSelection.length > 0
        ? tableFieldsSelection
        : tableFieldsInitialSelection.length > 0
          ? tableFieldsInitialSelection
          : defaultRootTableFields;
    return Array.from(new Map(selected.map((item) => [String(item.value), item])).values());
  }, [tableFieldsSelection, tableFieldsInitialSelection, defaultRootTableFields]);

  const groupColumnOptions = useMemo(() => {
    if (!metadata) return [];
    const fieldMap = new Map(metadata.fields.map((f) => [f.fieldName, f]));
    const activeRows = outputRows.filter((row) => row.selectedOutputFields.length > 0);
    return buildGroupableColumnOptions(
      sortColumnOptions,
      metadata,
      activeRows,
      fieldMap,
      reportTableFieldsMetadataByRowId,
      referenceEntityMetadataByName,
    );
  }, [
    sortColumnOptions,
    metadata,
    outputRows,
    reportTableFieldsMetadataByRowId,
    referenceEntityMetadataByName,
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
   *  вложенные колонки не добавляются автоматически (только в «Доступные»). */
  useEffect(() => {
    if (!open) return;
    const currentOptions = tableFieldsDialogOptionsRef.current;
    setTableFieldsSelection((prev) => {
      // На части сущностей options может кратко стать пустым во время перерасчёта metadata.
      // Не затираем уже отображённый «Текущий состав» в этот момент.
      if (!currentOptions.length) {
        return prev;
      }
      const optionByKey = new Map(
        [...defaultRootTableFields, ...currentOptions].map((o) => [String(o.value), o]),
      );
      if (prev.length === 0) {
        return defaultRootTableFields.length ? [...defaultRootTableFields] : [];
      }
      const remapped = prev
        .filter((p) => optionByKey.has(String(p.value)))
        .map((p) => {
          const key = String(p.value);
          const opt = optionByKey.get(key);
          return { value: key, label: opt?.label ?? p.label };
        });
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
  }, [open, tableFieldsOptionsKey, defaultRootTableFields]);

  const loadAllReferenceEntityMetadataForReport = reportsStore(
    (s) => s.loadAllReferenceEntityMetadataForReport,
  );

  const ensureTableFieldsMetadataLoaded = useCallback(async () => {
    const { metadata: entityMetadata } = reportsStore.getState();
    if (!entityMetadata) return false;
    await loadAllReferenceEntityMetadataForReport(entityMetadata);
    return true;
  }, [loadAllReferenceEntityMetadataForReport]);

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
        })
      : emptyBody;

    return { entityName, body };
  }, []);

  const saveTableFieldsSelectionToStore = useCallback(() => {
    const selectedRaw =
      tableFieldsSelection.length > 0
        ? tableFieldsSelection
        : tableFieldsInitialSelection.length > 0
          ? tableFieldsInitialSelection
          : defaultRootTableFields;
    const selected = Array.from(
      new Map(selectedRaw.map((item) => [String(item.value), item])).values(),
    );
    if (!selected.length) return;
    const { setOutputRowReportTableFields: setTableFields, outputRows } = reportsStore.getState();
    for (const row of outputRows) {
      setTableFields(row.id, selected);
    }
  }, [tableFieldsSelection, tableFieldsInitialSelection, defaultRootTableFields]);

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

  const executeReportLoad = useCallback(async () => {
    saveTableFieldsSelectionToStore();

    const ctx = buildCurrentReportBody();
    if (!ctx) return;
    const { entityName, body: rawBody } = ctx;
    const body = ensureSelectedFieldsInBody(rawBody);

    const groupBy = composeGroupBy;
    const sortParams = buildComposeSortParams(composeSortRows, groupBy.length ? groupBy : undefined);
    const {
      metadata: entityMetadata,
      outputRows: currentOutputRows,
      reportTableFieldsMetadataByRowId: tableMetadataByRowId,
      referenceEntityMetadataByName: nestedMetadataByName,
    } = reportsStore.getState();
    const bodyWithGroup = finalizeReportQueryBodyForGroupBy(
      { ...body, ...(groupBy.length ? { groupBy } : {}) },
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
      setQueryContext({
        entityName,
        body: bodyWithGroup,
        branchIds: branchIds.length ? branchIds : undefined,
        branchOffices: selectedBranchOffices.length ? selectedBranchOffices : undefined,
      });

      const result = await executeReportQuery(entityName, bodyWithGroup, {
        page: 0,
        size: pagination.pageSize,
        sort: sortParams,
        branchIds: branchIds.length ? branchIds : undefined,
      });
      reportGenerationStore.getState().completeSuccess(result);
      onReportFormed?.();
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') {
        reportGenerationStore.getState().finishCancelled();
        return;
      }
      reportGenerationStore.getState().completeError(reportQueryErrorMessage(e));
    }
  }, [
    buildCurrentReportBody,
    saveTableFieldsSelectionToStore,
    ensureSelectedFieldsInBody,
    composeSortRows,
    composeGroupBy,
    onReportFormed,
    reportQueryErrorMessage,
    isSuperAdmin,
    selectedBranchOffices,
  ]);

  const handleFormReport = useCallback(async () => {
    if (reportGenerationStore.getState().isGenerating) return;

    await ensureTableFieldsMetadataLoaded();
    saveTableFieldsSelectionToStore();

    confirmedRef.current = true;
    snapshotRef.current = null;
    onClose();

    void executeReportLoad();
  }, [ensureTableFieldsMetadataLoaded, saveTableFieldsSelectionToStore, onClose, executeReportLoad]);

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
            <ReportComposeForm />
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
                    onChange={setTableFieldsSelection}
                  />
                </ReportComposeSection>
                {sortColumnOptionsForUi.length > 0 ? (
                  <div className={composeStyles.sortSectionSlot}>
                    <ReportComposeSortSection
                      columnOptions={sortColumnOptionsForUi}
                      sortRows={composeSortRows}
                      onChange={setComposeSortRows}
                    />
                  </div>
                ) : null}
                {groupColumnOptions.length > 0 ? (
                  <div className={composeStyles.sortSectionSlot}>
                    <ReportComposeGroupSection
                      columnOptions={groupColumnOptions}
                      groupRows={composeGroupRows}
                      onChange={setComposeGroupRows}
                    />
                  </div>
                ) : null}
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
