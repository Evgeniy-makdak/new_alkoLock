import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import ViewColumnOutlinedIcon from '@mui/icons-material/ViewColumnOutlined';
import { Box } from '@mui/material';

import { executeReportQuery } from '@pages/reports/api/reportsApi';
import { buildReportQueryRequest } from '@pages/reports/lib/buildReportQueryRequest';
import { mergeAllReportTableFieldOptions } from '@pages/reports/lib/buildReportTableFieldOptions';
import {
  captureReportsComposeSnapshot,
  restoreReportsComposeSnapshot,
  type ReportsComposeSnapshot,
} from '@pages/reports/lib/reportsComposeSnapshot';
import { reportGenerationStore } from '@pages/reports/model/reportGenerationStore';
import { getPrimaryReportOutputRow, reportsStore } from '@pages/reports/model/reportsStore';
import type { ReportQueryRequest } from '@pages/reports/types/reportApiTypes';
import { Button } from '@shared/ui/button';
import { Popup } from '@shared/ui/popup';
import type { Values } from '@shared/ui/search_multiple_select';

import composeStyles from './ReportComposeModal.module.scss';
import popupStyles from '@shared/ui/popup/Popup.module.scss';

import { ReportComposeForm } from './ReportComposeForm';
import { ReportComposeSection } from './ReportComposeSection';
import { ReportTableFieldsTransfer } from './ReportTableFieldsTransfer';

type ReportComposeModalProps = {
  open: boolean;
  onClose: () => void;
  onReportFormed?: () => void;
};

export function ReportComposeModal({ open, onClose, onReportFormed }: ReportComposeModalProps) {
  const { t } = useTranslation();
  const snapshotRef = useRef<ReportsComposeSnapshot | null>(null);
  const confirmedRef = useRef(false);

  const isGenerating = reportGenerationStore((s) => s.isGenerating);
  const metadata = reportsStore((s) => s.metadata);
  const outputRows = reportsStore((s) => s.outputRows);
  const reportTableFieldsMetadataByRowId = reportsStore(
    (s) => s.reportTableFieldsMetadataByRowId,
  );

  const [reportName, setReportName] = useState('');
  const [tableFieldsSelection, setTableFieldsSelection] = useState<Values>([]);

  useEffect(() => {
    if (!open) return;
    confirmedRef.current = false;
    snapshotRef.current = captureReportsComposeSnapshot();
    setReportName('');
    setTableFieldsSelection([]);
  }, [open]);

  const handleClose = useCallback(() => {
    if (!confirmedRef.current && snapshotRef.current) {
      restoreReportsComposeSnapshot(snapshotRef.current);
    }
    snapshotRef.current = null;
    onClose();
  }, [onClose]);

  const tableFieldsDialogOptions = useMemo((): Values => {
    if (!metadata) return [];
    const fieldMap = new Map(metadata.fields.map((f) => [f.fieldName, f]));
    const activeRows = outputRows.filter((row) => row.selectedOutputFields.length > 0);
    return mergeAllReportTableFieldOptions(
      metadata,
      activeRows,
      fieldMap,
      reportTableFieldsMetadataByRowId,
    );
  }, [metadata, outputRows, reportTableFieldsMetadataByRowId]);

  const tableFieldsInitialSelection = useMemo((): Values => {
    const primaryRow = getPrimaryReportOutputRow();
    return primaryRow.reportTableFields.length > 0 ? primaryRow.reportTableFields : [];
  }, [outputRows, open]);

  const showColumnsSection = tableFieldsDialogOptions.length > 0;

  const canFormReport = useMemo(() => {
    const primaryRow = getPrimaryReportOutputRow();
    return primaryRow.selectedOutputFields.length > 0;
  }, [outputRows]);

  const tableFieldsOptionsKey = useMemo(
    () => tableFieldsDialogOptions.map((o) => String(o.value)).join('\0'),
    [tableFieldsDialogOptions],
  );

  /** При смене «Поля результата» / загрузке metadata — все колонки сразу в состав таблицы. */
  useEffect(() => {
    if (!open) return;
    if (!tableFieldsDialogOptions.length) {
      setTableFieldsSelection([]);
      return;
    }
    setTableFieldsSelection([...tableFieldsDialogOptions]);
  }, [open, tableFieldsOptionsKey, tableFieldsDialogOptions]);

  const loadReportTableFieldsMetadata = reportsStore((s) => s.loadReportTableFieldsMetadata);

  const ensureTableFieldsMetadataLoaded = useCallback(async () => {
    const {
      selectedEntityName: entityName,
      metadata: entityMetadata,
      outputRows: currentOutputRows,
    } = reportsStore.getState();
    if (!entityName || !entityMetadata) return false;

    const fieldMap = new Map(entityMetadata.fields.map((f) => [f.fieldName, f]));
    const activeRows = currentOutputRows.filter((row) => row.selectedOutputFields.length > 0);
    if (!activeRows.length) return false;

    for (const row of activeRows) {
      const key = row.selectedOutputFields[0] ? String(row.selectedOutputFields[0].value) : '';
      const ref = fieldMap.get(key)?.referenceEntity?.trim();
      if (ref) {
        await loadReportTableFieldsMetadata(row.id, ref);
      }
    }
    return true;
  }, [loadReportTableFieldsMetadata]);

  const executeReportLoad = useCallback(async () => {
    const {
      selectedEntityName: entityName,
      metadata: entityMetadata,
      outputRows: currentOutputRows,
      logicOperator: currentLogicOperator,
      reportTableFieldsMetadataByRowId: tableMetadataByRowId,
    } = reportsStore.getState();

    if (!entityName) return;

    const selected =
      tableFieldsSelection.length > 0 ? tableFieldsSelection : tableFieldsInitialSelection;
    if (selected.length) {
      const { setOutputRowReportTableFields: setTableFields } = reportsStore.getState();
      for (const row of currentOutputRows) {
        if (row.selectedOutputFields.length > 0) {
          setTableFields(row.id, selected);
        }
      }
    }

    const { pagination, setQueryContext, setPagination, setSort } = reportGenerationStore.getState();
    reportGenerationStore.getState().start();
    setPagination({ page: 0 });
    setSort([]);

    const emptyBody: ReportQueryRequest = { selectedFields: [], filters: [] };

    try {
      const body = entityMetadata
        ? buildReportQueryRequest({
            metadata: entityMetadata,
            outputRows: reportsStore.getState().outputRows,
            logicOperator: currentLogicOperator,
            reportTableFieldsMetadataByRowId: tableMetadataByRowId,
          })
        : emptyBody;

      setQueryContext({ entityName, body });

      const result = await executeReportQuery(entityName, body, {
        page: 0,
        size: pagination.pageSize,
        sort: [],
      });
      reportGenerationStore.getState().completeSuccess(result);
      onReportFormed?.();
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') {
        reportGenerationStore.getState().finishCancelled();
        return;
      }
      reportGenerationStore
        .getState()
        .completeError(e instanceof Error ? e.message : t('reports.loadError'));
    }
  }, [t, tableFieldsSelection, tableFieldsInitialSelection, onReportFormed]);

  const handleFormReport = useCallback(async () => {
    if (reportGenerationStore.getState().isGenerating) return;

    await ensureTableFieldsMetadataLoaded();

    confirmedRef.current = true;
    snapshotRef.current = null;
    onClose();
    void executeReportLoad();
  }, [ensureTableFieldsMetadataLoaded, onClose, executeReportLoad, reportName]);

  useEffect(() => {
    if (!open || !metadata) return;
    void ensureTableFieldsMetadataLoaded();
  }, [open, metadata, outputRows, ensureTableFieldsMetadataLoaded]);

  return (
    <Popup
      isOpen={open}
      headerTitle={t('reports.composeModalTitle')}
      toggleModal={handleClose}
      onCloseModal={handleClose}
      dragResize={{
        defaultWidth: 1580,
        defaultHeight: Math.min(860, Math.round(window.innerHeight * 0.88)),
        minWidth: 720,
        minHeight: 420,
      }}
      styles={{
        size: `${popupStyles.size} ${composeStyles.composeModalSize}`,
        substr: `${popupStyles.substr} ${composeStyles.composeModalPaper}`,
      }}
      body={
        <Box className={composeStyles.composeBody}>
          <div
            className={[composeStyles.composeMainGrid, composeStyles.formRootDisplayContents].join(
              ' ',
            )}>
            <ReportComposeForm reportName={reportName} onReportNameChange={setReportName} />
            {showColumnsSection ? (
              <div className={composeStyles.composeColumnsSlot}>
                <ReportComposeSection
                  icon={ViewColumnOutlinedIcon}
                  iconTone="violet"
                  title={t('reports.composeSectionColumns')}>
                  <ReportTableFieldsTransfer
                    options={tableFieldsDialogOptions}
                    value={tableFieldsSelection}
                    onChange={setTableFieldsSelection}
                  />
                </ReportComposeSection>
              </div>
            ) : null}
          </div>
        </Box>
      }
      buttons={[
        <Button key="cancel" onClick={handleClose}>
          {t('common.cancel')}
        </Button>,
        <Button
          key="form"
          disabled={!canFormReport || isGenerating}
          onClick={() => void handleFormReport()}>
          {t('reports.formReport')}
        </Button>,
      ]}
    />
  );
}
