import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SecurityIcon from '@mui/icons-material/Security';
import { FormControl, InputLabel, MenuItem, Select, TextField, Typography } from '@mui/material';

import { Button, ButtonsType } from '@shared/ui/button';

import { reportGenerationStore } from '../../model/reportGenerationStore';
import { reportsStore } from '../../model/reportsStore';
import { normalizeReportViewMode } from '../../types/reportApiTypes';
import { resizeDashboardLayout } from '../lib/dashboardLayout';
import { dashboardStore } from '../model/dashboardStore';
import type { DashboardLayoutPreset, ReportDashboard } from '../types';
import { DashboardAccessDialog } from './DashboardAccessDialog';
import { DashboardWidgetCard } from './DashboardWidgetCard';

import styles from './Dashboard.module.scss';

type Props = {
  dashboard: ReportDashboard;
  onBack: () => void;
};

export function DashboardEditor({ dashboard, onBack }: Props) {
  const { t } = useTranslation();
  const updateDashboardMeta = dashboardStore((s) => s.updateDashboardMeta);
  const updateDashboardLayout = dashboardStore((s) => s.updateDashboardLayout);
  const setCellWidget = dashboardStore((s) => s.setCellWidget);
  const currentAccessLevel = dashboardStore((s) => s.currentAccessLevel);
  const [accessOpen, setAccessOpen] = useState(false);
  const [name, setName] = useState(dashboard.name);
  const [description, setDescription] = useState(dashboard.description);

  const level = currentAccessLevel(dashboard);
  const canEdit = level === 'owner' || level === 'edit' || level === 'manage';
  const canManageAccess = level === 'owner' || level === 'manage';

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

  const handlePresetChange = useCallback(
    async (preset: DashboardLayoutPreset) => {
      if (!canEdit) return;
      if (preset === 'fixed_2x2') {
        await updateDashboardLayout(
          dashboard.id,
          resizeDashboardLayout(dashboard.layout, 2, 2, 'fixed_2x2'),
        );
        return;
      }
      await updateDashboardLayout(
        dashboard.id,
        resizeDashboardLayout(
          dashboard.layout,
          dashboard.layout.rows,
          dashboard.layout.cols,
          'custom',
        ),
      );
    },
    [canEdit, dashboard, updateDashboardLayout],
  );

  const handleResize = useCallback(
    async (rows: number, cols: number) => {
      if (!canEdit) return;
      await updateDashboardLayout(
        dashboard.id,
        resizeDashboardLayout(dashboard.layout, rows, cols, 'custom'),
      );
    },
    [canEdit, dashboard, updateDashboardLayout],
  );

  const bindCurrentReport = useCallback(
    async (cellId: string) => {
      if (!canEdit) return;
      const ctx = reportGenerationStore.getState().queryContext;
      if (!ctx) return;
      const viewMode = normalizeReportViewMode(reportsStore.getState().viewMode);
      const chartSpec = reportsStore.getState().chartSpec;
      await setCellWidget(dashboard.id, cellId, {
        title: `${ctx.entityName}`,
        entityName: ctx.entityName,
        body: ctx.body,
        branchIds: ctx.branchIds,
        columnHeaderLabels: ctx.columnHeaderLabels,
        branchOffices: ctx.branchOffices,
        preferredViewMode: viewMode,
        chartSpec: viewMode === 'chart' ? (ctx.chartSpec ?? chartSpec) : undefined,
      });
    },
    [canEdit, dashboard.id, setCellWidget],
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
        <FormControl size="small" sx={{ minWidth: 160 }} disabled={!canEdit}>
          <InputLabel id="dashboard-layout-preset">
            {t('reports.dashboard.layoutPreset', { defaultValue: 'Разметка' })}
          </InputLabel>
          <Select
            labelId="dashboard-layout-preset"
            label={t('reports.dashboard.layoutPreset', { defaultValue: 'Разметка' })}
            value={dashboard.layout.preset}
            onChange={(event) => void handlePresetChange(event.target.value as DashboardLayoutPreset)}>
            <MenuItem value="fixed_2x2">
              {t('reports.dashboard.layoutFixed22', { defaultValue: 'Фиксированная 2×2' })}
            </MenuItem>
            <MenuItem value="custom">
              {t('reports.dashboard.layoutCustom', { defaultValue: 'Своя сетка' })}
            </MenuItem>
          </Select>
        </FormControl>
        {dashboard.layout.preset === 'custom' ? (
          <>
            <FormControl size="small" sx={{ minWidth: 100 }} disabled={!canEdit}>
              <InputLabel id="dashboard-rows-label">
                {t('reports.dashboard.rows', { defaultValue: 'Строки' })}
              </InputLabel>
              <Select
                labelId="dashboard-rows-label"
                label={t('reports.dashboard.rows', { defaultValue: 'Строки' })}
                value={dashboard.layout.rows}
                onChange={(event) =>
                  void handleResize(Number(event.target.value), dashboard.layout.cols)
                }>
                {[1, 2, 3, 4, 5, 6].map((n) => (
                  <MenuItem key={n} value={n}>
                    {n}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 100 }} disabled={!canEdit}>
              <InputLabel id="dashboard-cols-label">
                {t('reports.dashboard.cols', { defaultValue: 'Столбцы' })}
              </InputLabel>
              <Select
                labelId="dashboard-cols-label"
                label={t('reports.dashboard.cols', { defaultValue: 'Столбцы' })}
                value={dashboard.layout.cols}
                onChange={(event) =>
                  void handleResize(dashboard.layout.rows, Number(event.target.value))
                }>
                {[1, 2, 3, 4, 5, 6].map((n) => (
                  <MenuItem key={n} value={n}>
                    {n}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </>
        ) : null}
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

      <div className={styles.grid} style={gridStyle}>
        {dashboard.layout.cells.map((cell) => (
          <DashboardWidgetCard
            key={cell.id}
            cell={cell}
            canEdit={canEdit}
            onBindCurrentReport={() => void bindCurrentReport(cell.id)}
            onClear={() => void setCellWidget(dashboard.id, cell.id, null)}
          />
        ))}
      </div>

      <DashboardAccessDialog
        open={accessOpen}
        dashboard={dashboard}
        onClose={() => setAccessOpen(false)}
      />
    </div>
  );
}
