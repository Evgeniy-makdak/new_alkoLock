import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import LinkIcon from '@mui/icons-material/Link';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import RefreshIcon from '@mui/icons-material/Refresh';
import { Box, CircularProgress, IconButton, Tooltip, Typography } from '@mui/material';

import { Button, ButtonsType } from '@shared/ui/button';

import { executeReportQuery } from '../../api/reportsApi';
import {
  DEFAULT_REPORT_PAGE_SIZE,
  reportGenerationStore,
} from '../../model/reportGenerationStore';
import { reportsStore } from '../../model/reportsStore';
import { dashboardStore } from '../model/dashboardStore';
import type { DashboardCell, DashboardWidgetBinding } from '../types';

import styles from './Dashboard.module.scss';

/** Как в боковой «Истории»: первая порция + догрузка при скролле вниз. */
const WIDGET_PAGE_SIZE = 25;

type Props = {
  cell: DashboardCell;
  canEdit: boolean;
  onBindCurrentReport: () => void;
  onClear: () => void;
};

export function DashboardWidgetCard({ cell, canEdit, onBindCurrentReport, onClear }: Props) {
  const { t } = useTranslation();
  const hasCurrentReport = reportGenerationStore((s) => !!s.queryContext);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewRows, setPreviewRows] = useState<Array<Record<string, unknown>>>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [totalElements, setTotalElements] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const pageRef = useRef(0);
  const hasMoreRef = useRef(true);
  const loadingMoreRef = useRef(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const widget = cell.widget;

  const resetAndLoadFirstPage = useCallback(
    async (binding: DashboardWidgetBinding) => {
      setLoading(true);
      setError(null);
      setPreviewRows([]);
      setColumns([]);
      pageRef.current = 0;
      hasMoreRef.current = true;
      try {
        const result = await executeReportQuery(binding.entityName, binding.body, {
          page: 0,
          size: WIDGET_PAGE_SIZE,
          branchIds: binding.branchIds,
        });
        const content = Array.isArray(result?.content)
          ? (result.content as Array<Record<string, unknown>>)
          : [];
        const total = Number(result?.totalElements ?? content.length);
        const totalPages = Number(result?.totalPages ?? 1);
        setPreviewRows(content);
        setColumns(content.length > 0 ? Object.keys(content[0]!).slice(0, 8) : []);
        setTotalElements(Number.isFinite(total) ? total : content.length);
        const more =
          content.length >= WIDGET_PAGE_SIZE &&
          (Number.isFinite(total)
            ? content.length < total
            : Number.isFinite(totalPages)
              ? totalPages > 1
              : true);
        hasMoreRef.current = more;
        setHasMore(more);
        pageRef.current = 0;
      } catch (err) {
        setPreviewRows([]);
        setColumns([]);
        setTotalElements(0);
        hasMoreRef.current = false;
        setHasMore(false);
        setError(
          err instanceof Error
            ? err.message
            : t('reports.dashboard.widgetError', { defaultValue: 'Ошибка загрузки' }),
        );
      } finally {
        setLoading(false);
      }
    },
    [t],
  );

  const loadMore = useCallback(
    async (binding: DashboardWidgetBinding) => {
      if (!hasMoreRef.current || loadingMoreRef.current) return;
      loadingMoreRef.current = true;
      setLoadingMore(true);
      const nextPage = pageRef.current + 1;
      try {
        const result = await executeReportQuery(binding.entityName, binding.body, {
          page: nextPage,
          size: WIDGET_PAGE_SIZE,
          branchIds: binding.branchIds,
        });
        const content = Array.isArray(result?.content)
          ? (result.content as Array<Record<string, unknown>>)
          : [];
        const totalPages = Number(result?.totalPages ?? nextPage + 1);
        const total = Number(result?.totalElements);
        setPreviewRows((prev) => {
          const next = [...prev, ...content];
          const more =
            content.length >= WIDGET_PAGE_SIZE &&
            (Number.isFinite(total) ? next.length < total : nextPage + 1 < totalPages);
          hasMoreRef.current = more;
          setHasMore(more);
          return next;
        });
        pageRef.current = nextPage;
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : t('reports.dashboard.widgetError', { defaultValue: 'Ошибка загрузки' }),
        );
      } finally {
        loadingMoreRef.current = false;
        setLoadingMore(false);
      }
    },
    [t],
  );

  useEffect(() => {
    if (!widget) {
      setPreviewRows([]);
      setColumns([]);
      setError(null);
      setTotalElements(0);
      hasMoreRef.current = false;
      setHasMore(false);
      return;
    }
    void resetAndLoadFirstPage(widget);
  }, [widget, resetAndLoadFirstPage]);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el || !widget) return;
    if (loadingMoreRef.current || !hasMoreRef.current) return;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 48) {
      void loadMore(widget);
    }
  }, [widget, loadMore]);

  const openFullReport = useCallback(() => {
    if (!widget) return;
    // Сейчас: восстанавливаем queryContext и открываем вкладку «Отчёты».
    // Когда появится бэкенд дашбордов — сюда же можно будет подставить GET по id виджета/отчёта.
    reportGenerationStore.getState().setQueryContext({
      entityName: widget.entityName,
      body: widget.body,
      branchIds: widget.branchIds,
      columnHeaderLabels: widget.columnHeaderLabels,
      branchOffices: widget.branchOffices,
    });
    reportsStore.getState().setViewMode(widget.preferredViewMode);
    void reportGenerationStore.getState().loadReportPage(0, DEFAULT_REPORT_PAGE_SIZE);
    dashboardStore.getState().setWorkspaceTab('reports');
  }, [widget]);

  const empty = !widget;

  const headerTitle = useMemo(() => {
    if (!widget) return t('reports.dashboard.emptyCell', { defaultValue: 'Пустая ячейка' });
    return widget.title || widget.entityName;
  }, [widget, t]);

  return (
    <div className={`${styles.cell} ${empty ? '' : styles.cellFilled}`}>
      <div className={styles.cellHeader}>
        <Typography variant="subtitle2" noWrap title={headerTitle}>
          {headerTitle}
        </Typography>
        <Box sx={{ display: 'inline-flex', gap: 0.5 }}>
          {widget ? (
            <Tooltip
              title={t('reports.dashboard.openFullReport', {
                defaultValue: 'Открыть полный отчёт',
              })}>
              <IconButton
                size="small"
                onClick={openFullReport}
                aria-label={t('reports.dashboard.openFullReport', {
                  defaultValue: 'Открыть полный отчёт',
                })}>
                <OpenInNewIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          ) : null}
          {widget ? (
            <Tooltip title={t('reports.dashboard.refreshWidget', { defaultValue: 'Обновить' })}>
              <span>
                <IconButton
                  size="small"
                  disabled={loading}
                  onClick={() => void resetAndLoadFirstPage(widget)}>
                  <RefreshIcon fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>
          ) : null}
          {canEdit && !widget ? (
            <Tooltip
              title={
                hasCurrentReport
                  ? t('reports.dashboard.bindCurrent', {
                      defaultValue: 'Привязать текущий отчёт',
                    })
                  : t('reports.dashboard.bindNeedReport', {
                      defaultValue: 'Сначала сформируйте отчёт во вкладке «Отчёты»',
                    })
              }>
              <span>
                <IconButton
                  size="small"
                  disabled={!hasCurrentReport}
                  onClick={onBindCurrentReport}
                  aria-label={t('reports.dashboard.bindCurrent', {
                    defaultValue: 'Привязать текущий отчёт',
                  })}>
                  <LinkIcon fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>
          ) : null}
          {canEdit && widget ? (
            <Tooltip title={t('reports.dashboard.clearWidget', { defaultValue: 'Отвязать отчёт' })}>
              <IconButton
                size="small"
                onClick={onClear}
                aria-label={t('reports.dashboard.clearWidget', { defaultValue: 'Отвязать' })}>
                <DeleteOutlineIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          ) : null}
        </Box>
      </div>
      {!empty && !loading && !error && previewRows.length > 0 ? (
        <div className={styles.widgetMeta}>
          <Typography variant="caption" color="text.secondary">
            {t('reports.dashboard.widgetLoaded', {
              defaultValue: 'Показано {{shown}} из {{total}}',
            })
              .replace('{{shown}}', String(previewRows.length))
              .replace('{{total}}', String(totalElements || previewRows.length))}
          </Typography>
        </div>
      ) : null}
      <div className={styles.cellBody} ref={scrollRef} onScroll={handleScroll}>
        {empty ? (
          <div className={styles.cellEmptyHint}>
            <Typography variant="body2" sx={{ mb: 1 }}>
              {t('reports.dashboard.emptyCellHint', {
                defaultValue: 'Разместите виджет отчёта в этой ячейке',
              })}
            </Typography>
            {canEdit ? (
              <Button
                typeButton={ButtonsType.action}
                disabled={!hasCurrentReport}
                onClick={onBindCurrentReport}>
                {t('reports.dashboard.bindCurrent', { defaultValue: 'Привязать текущий отчёт' })}
              </Button>
            ) : null}
          </div>
        ) : loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
            <CircularProgress size={28} />
          </Box>
        ) : error ? (
          <Typography variant="body2" color="error">
            {error}
          </Typography>
        ) : previewRows.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            {t('reports.dashboard.widgetNoData', {
              defaultValue: 'Нет данных для предпросмотра',
            })}
          </Typography>
        ) : (
          <>
            <table className={styles.widgetPreviewTable}>
              <thead>
                <tr>
                  {columns.map((col) => (
                    <th key={col}>{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {previewRows.map((row, index) => (
                  <tr key={index}>
                    {columns.map((col) => (
                      <td key={col}>{formatCell(row[col])}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            {loadingMore ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 1 }}>
                <CircularProgress size={20} />
              </Box>
            ) : null}
            {!hasMore && previewRows.length > 0 ? (
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ display: 'block', textAlign: 'center', py: 0.5 }}>
                {t('reports.dashboard.widgetEnd', { defaultValue: 'Все строки загружены' })}
              </Typography>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}

function formatCell(value: unknown): string {
  if (value == null) return '—';
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }
  return String(value);
}
