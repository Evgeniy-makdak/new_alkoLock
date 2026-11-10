import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SecurityIcon from '@mui/icons-material/Security';
import { TextField, Typography } from '@mui/material';

import { Button, ButtonsType } from '@shared/ui/button';

import { reportGenerationStore } from '../../model/reportGenerationStore';
import { reportsStore } from '../../model/reportsStore';
import { normalizeReportViewMode } from '../../types/reportApiTypes';
import { dashboardStore } from '../model/dashboardStore';
import type { DashboardWidgetBinding, ReportDashboard } from '../types';
import { DashboardAccessDialog } from './DashboardAccessDialog';
import { DashboardReportNameDialog } from './DashboardReportNameDialog';
import { DashboardSavedReportsDialog } from './DashboardSavedReportsDialog';
import { DashboardWidgetCard } from './DashboardWidgetCard';

import styles from './Dashboard.module.scss';

type Props = {
  dashboard: ReportDashboard;
  onBack: () => void;
};

export function DashboardEditor({ dashboard, onBack }: Props) {
  const { t } = useTranslation();
  const updateDashboardMeta = dashboardStore((s) => s.updateDashboardMeta);
  const removeCellWidget = dashboardStore((s) => s.removeCellWidget);
  const linkReportToDashboard = dashboardStore((s) => s.linkReportToDashboard);
  const saveReportAndLink = dashboardStore((s) => s.saveReportAndLink);
  const currentAccessLevel = dashboardStore((s) => s.currentAccessLevel);
  const storeError = dashboardStore((s) => s.error);
  const [accessOpen, setAccessOpen] = useState(false);
  const [savedReportsOpen, setSavedReportsOpen] = useState(false);
  const [pendingWidget, setPendingWidget] = useState<DashboardWidgetBinding | null>(null);
  const [linkError, setLinkError] = useState<string | null>(null);
  const [name, setName] = useState(dashboard.name);
  const [description, setDescription] = useState(dashboard.description);

  const level = currentAccessLevel(dashboard);
  const canEdit = level === 'owner' || level === 'edit';
  const canManageAccess = level === 'owner';

  const gridStyle = useMemo(
    () => ({
      gridTemplateColumns: `repeat(${dashboard.layout.cols}, minmax(0, 1fr))`,
      gridTemplateRows: `repeat(${dashboard.layout.rows}, minmax(180px, auto))`,
    }),
    [dashboard.layout.cols, dashboard.layout.rows],
  );

  const persistMeta = useCallback(async () => {
    if (!canEdit) return;
    await updateDashboardMeta(dashboard.id, { name, description });
  }, [canEdit, dashboard.id, name, description, updateDashboardMeta]);

  /**
   * «Привязать текущий отчёт» — только отчёт со вкладки «Отчёты» (не поиск в сохранённых).
   * Несохранённый: диалог имени → save + link.
   * Уже сохранённый (ctx.savedReportId, на будущее): только link.
   */
  const bindCurrentReport = useCallback(async () => {
    if (!canEdit) return;
    const ctx = reportGenerationStore.getState().queryContext;
    if (!ctx) return;
    setLinkError(null);

    // На будущее: вкладка «Отчёты» открыла уже сохранённый отчёт.
    if (ctx.savedReportId != null) {
      const message = await linkReportToDashboard(dashboard.id, ctx.savedReportId);
      if (message) setLinkError(message);
      return;
    }

    const viewMode = normalizeReportViewMode(reportsStore.getState().viewMode);
    const chartSpec = reportsStore.getState().chartSpec;
    setPendingWidget({
      title: `${ctx.entityName}`,
      entityName: ctx.entityName,
      body: ctx.body,
      branchIds: ctx.branchIds,
      columnHeaderLabels: ctx.columnHeaderLabels,
      branchOffices: ctx.branchOffices,
      preferredViewMode: viewMode,
      chartSpec: viewMode === 'chart' ? (ctx.chartSpec ?? chartSpec) : undefined,
    });
  }, [canEdit, dashboard.id, linkReportToDashboard]);

  const linkedReportIds = useMemo(
    () =>
      dashboard.layout.cells
        .map((cell) => cell.widget?.reportId)
        .filter((id): id is number => id != null),
    [dashboard.layout.cells],
  );

  return (
    <div className={styles.editorRoot}>
      <div className={styles.editorToolbar}>
        <Button typeButton={ButtonsType.action} startIcon={<ArrowBackIcon />} onClick={onBack}>
          {t('reports.dashboard.backToList', { defaultValue: 'К списку' })}
        </Button>
        <TextField
          size="small"
          label={t('reports.dashboard.name', { defaultValue: 'Название' })}
          value={name}
          disabled={!canEdit}
          onChange={(event) => setName(event.target.value)}
          onBlur={() => void persistMeta()}
          sx={{ minWidth: 220 }}
        />
        <TextField
          size="small"
          label={t('reports.dashboard.description', { defaultValue: 'Описание' })}
          value={description}
          disabled={!canEdit}
          onChange={(event) => setDescription(event.target.value)}
          onBlur={() => void persistMeta()}
          sx={{ minWidth: 260, flex: 1 }}
        />
        {canManageAccess ? (
          <Button
            typeButton={ButtonsType.action}
            startIcon={<SecurityIcon />}
            onClick={() => setAccessOpen(true)}>
            {t('reports.dashboard.accessButton', { defaultValue: 'Права доступа' })}
          </Button>
        ) : null}
      </div>

      <Typography variant="body2" color="text.secondary">
        {t(
          'reports.dashboard.editorHint',
          'Сформируйте отчёт во вкладке «Отчёты», затем привяжите его к ячейке сетки.',
        )}
      </Typography>
      {storeError || linkError ? (
        <Typography variant="body2" color="error">
          {linkError || storeError}
        </Typography>
      ) : null}

      <div className={styles.grid} style={gridStyle}>
        {dashboard.layout.cells.map((cell) => (
          <DashboardWidgetCard
            key={cell.id}
            cell={cell}
            canEdit={canEdit}
            onBindCurrentReport={() => void bindCurrentReport()}
            onPickSavedReport={() => {
              setLinkError(null);
              setSavedReportsOpen(true);
            }}
            onClear={() => void removeCellWidget(dashboard.id, cell.id)}
          />
        ))}
      </div>

      <DashboardAccessDialog
        open={accessOpen}
        dashboard={dashboard}
        onClose={() => setAccessOpen(false)}
      />
      <DashboardReportNameDialog
        open={pendingWidget != null}
        defaultName={pendingWidget?.entityName ?? ''}
        onSubmit={(reportName) =>
          pendingWidget
            ? saveReportAndLink(dashboard.id, pendingWidget, reportName)
            : Promise.resolve(null)
        }
        onClose={() => setPendingWidget(null)}
      />
      <DashboardSavedReportsDialog
        open={savedReportsOpen}
        linkedReportIds={linkedReportIds}
        onSelect={(reportId) => linkReportToDashboard(dashboard.id, reportId)}
        onClose={() => setSavedReportsOpen(false)}
      />
    </div>
  );
}
