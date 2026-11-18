import { useMemo, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import BarChartOutlinedIcon from '@mui/icons-material/BarChartOutlined';
import GridOnOutlinedIcon from '@mui/icons-material/GridOnOutlined';
import { FormControl, InputLabel, MenuItem, Select } from '@mui/material';

import { buildReportChartFieldOptions } from '../lib/buildReportChartFieldOptions';
import { reportGenerationStore } from '../model/reportGenerationStore';
import { reportsStore } from '../model/reportsStore';
import {
  CHART_REPORT_PAGE_SIZE,
  normalizeChartSpec,
  type ReportChartSpec,
} from '../types/chartSpec';
import { normalizeReportViewMode, type ReportViewMode } from '../types/reportApiTypes';
import { ReportChartSettingsDialog } from './ReportChartSettingsDialog';

const VIEW_MODE_OPTIONS: Array<{
  value: ReportViewMode;
  labelKey: string;
  defaultLabel: string;
  icon: ReactNode;
}> = [
  {
    value: 'table',
    labelKey: 'reports.viewTable',
    defaultLabel: 'Таблица',
    icon: <GridOnOutlinedIcon fontSize="small" />,
  },
  {
    value: 'chart',
    labelKey: 'reports.viewChart',
    defaultLabel: 'График',
    icon: <BarChartOutlinedIcon fontSize="small" />,
  },
];

interface ReportsViewModeSelectProps {
  disabled?: boolean;
}

function applyChartViewMode(spec: ReportChartSpec) {
  const normalized = normalizeChartSpec(spec);
  reportsStore.getState().setChartSpec(normalized);
  reportsStore.getState().setViewMode('chart');

  const gen = reportGenerationStore.getState();
  const ctx = gen.queryContext;
  if (ctx) {
    gen.setQueryContext({
      ...ctx,
      chartSpec: normalized,
    });
  }

  const total = gen.lastResult?.totalElements ?? 0;
  const loaded = Array.isArray(gen.lastResult?.content) ? gen.lastResult.content.length : 0;
  if (total > 0 && loaded < Math.min(total, CHART_REPORT_PAGE_SIZE)) {
    void gen.loadReportPage(0, CHART_REPORT_PAGE_SIZE);
  } else if (
    loaded > 0 &&
    loaded < total &&
    gen.pagination.pageSize !== CHART_REPORT_PAGE_SIZE
  ) {
    void gen.loadReportPage(0, CHART_REPORT_PAGE_SIZE);
  }
}

function applyTableViewMode() {
  reportsStore.getState().setViewMode('table');
  const gen = reportGenerationStore.getState();
  const ctx = gen.queryContext;
  if (ctx && gen.pagination.pageSize >= CHART_REPORT_PAGE_SIZE) {
    void gen.loadReportPage(0, 25);
  }
}

export function ReportsViewModeSelect({ disabled }: ReportsViewModeSelectProps) {
  const { t } = useTranslation();
  const viewMode = reportsStore((s) => normalizeReportViewMode(s.viewMode));
  const chartSpec = reportsStore((s) => s.chartSpec);
  const queryContext = reportGenerationStore((s) => s.queryContext);
  const lastResult = reportGenerationStore((s) => s.lastResult);

  const [chartDialogOpen, setChartDialogOpen] = useState(false);
  const [draftSpec, setDraftSpec] = useState<ReportChartSpec>(() =>
    normalizeChartSpec(chartSpec),
  );

  const fieldOptions = useMemo(
    () =>
      buildReportChartFieldOptions(
        queryContext,
        (lastResult?.content as Array<Record<string, unknown>> | undefined) ?? null,
      ),
    [queryContext, lastResult?.content],
  );

  return (
    <>
      <FormControl size="small" sx={{ minWidth: 148 }}>
        <InputLabel id="reports-view-mode-label">{t('reports.viewModeLabel')}</InputLabel>
        <Select
          labelId="reports-view-mode-label"
          value={viewMode}
          label={t('reports.viewModeLabel')}
          disabled={disabled}
          onChange={(event) => {
            const mode = event.target.value as ReportViewMode;
            if (mode === 'chart') {
              // Уже график — повторный выбор не трогаем (настройки справа).
              if (viewMode === 'chart') return;
              // Сначала модалка: оси/тип/лимит; вид переключаем только по «Построить».
              setDraftSpec(normalizeChartSpec(reportsStore.getState().chartSpec));
              setChartDialogOpen(true);
              return;
            }
            applyTableViewMode();
          }}>
          {VIEW_MODE_OPTIONS.map((option) => (
            <MenuItem key={option.value} value={option.value}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                {option.icon}
                {t(option.labelKey, { defaultValue: option.defaultLabel })}
              </span>
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <ReportChartSettingsDialog
        open={chartDialogOpen}
        initialSpec={draftSpec}
        fieldOptions={fieldOptions}
        onClose={() => setChartDialogOpen(false)}
        onApply={(spec) => {
          setChartDialogOpen(false);
          applyChartViewMode(spec);
        }}
      />
    </>
  );
}
