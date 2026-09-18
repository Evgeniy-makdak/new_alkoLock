import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import BarChartOutlinedIcon from '@mui/icons-material/BarChartOutlined';
import GridOnOutlinedIcon from '@mui/icons-material/GridOnOutlined';
import { FormControl, InputLabel, MenuItem, Select } from '@mui/material';

import { reportGenerationStore } from '../model/reportGenerationStore';
import { reportsStore } from '../model/reportsStore';
import { normalizeReportViewMode, type ReportViewMode } from '../types/reportApiTypes';

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

export function ReportsViewModeSelect({ disabled }: ReportsViewModeSelectProps) {
  const { t } = useTranslation();
  const viewMode = reportsStore((s) => normalizeReportViewMode(s.viewMode));
  const setViewMode = reportsStore((s) => s.setViewMode);

  return (
    <FormControl size="small" sx={{ minWidth: 148 }}>
      <InputLabel id="reports-view-mode-label">{t('reports.viewModeLabel')}</InputLabel>
      <Select
        labelId="reports-view-mode-label"
        value={viewMode}
        label={t('reports.viewModeLabel')}
        disabled={disabled}
        onChange={(event) => {
          const mode = event.target.value as ReportViewMode;
          setViewMode(mode);
          if (mode !== 'chart') return;
          const ctx = reportGenerationStore.getState().queryContext;
          if (!ctx) return;
          reportGenerationStore.getState().setQueryContext({
            ...ctx,
            chartSpec: reportsStore.getState().chartSpec,
          });
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
  );
}
