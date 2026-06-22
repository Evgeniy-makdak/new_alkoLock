import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import BarChartOutlinedIcon from '@mui/icons-material/BarChartOutlined';
import GridOnOutlinedIcon from '@mui/icons-material/GridOnOutlined';
import InsightsOutlinedIcon from '@mui/icons-material/InsightsOutlined';
import { FormControl, InputLabel, MenuItem, Select } from '@mui/material';

import { reportsStore } from '../model/reportsStore';
import { normalizeReportViewMode, type ReportViewMode } from '../types/reportApiTypes';

const VIEW_MODE_OPTIONS: Array<{
  value: ReportViewMode;
  labelKey: string;
  icon: ReactNode;
}> = [
  { value: 'table', labelKey: 'reports.viewTable', icon: <GridOnOutlinedIcon fontSize="small" /> },
  { value: 'bar', labelKey: 'reports.viewBar', icon: <BarChartOutlinedIcon fontSize="small" /> },
  {
    value: 'dashboard',
    labelKey: 'reports.viewDashboard',
    icon: <InsightsOutlinedIcon fontSize="small" />,
  },
];

interface ReportsViewModeSelectProps {
  disabled?: boolean;
}

export function ReportsViewModeSelect({ disabled = false }: ReportsViewModeSelectProps) {
  const { t } = useTranslation();
  const viewMode = reportsStore((s) => normalizeReportViewMode(s.viewMode));
  const setViewMode = reportsStore((s) => s.setViewMode);

  return (
    <FormControl size="small" sx={{ minWidth: 168 }}>
      <InputLabel id="reports-view-mode-label">{t('reports.viewModeLabel')}</InputLabel>
      <Select
        labelId="reports-view-mode-label"
        value={viewMode}
        label={t('reports.viewModeLabel')}
        disabled={disabled}
        onChange={(event) => setViewMode(event.target.value as ReportViewMode)}>
        {VIEW_MODE_OPTIONS.map((option) => (
          <MenuItem key={option.value} value={option.value}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              {option.icon}
              {t(option.labelKey)}
            </span>
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
}
