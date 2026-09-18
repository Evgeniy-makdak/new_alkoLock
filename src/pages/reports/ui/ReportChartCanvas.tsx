import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { Box, Typography, useTheme } from '@mui/material';
import ReactECharts from 'echarts-for-react';

import { buildChartOption } from '../lib/buildChartOption';
import { prepareChartData } from '../lib/prepareChartData';
import { normalizeChartSpec, type ReportChartSpec } from '../types/chartSpec';

type Props = {
  rows: Array<Record<string, unknown>>;
  spec: ReportChartSpec;
  groupBy?: string[];
  height?: number | string;
  compact?: boolean;
};

export function ReportChartCanvas({
  rows,
  spec: rawSpec,
  groupBy,
  height = 420,
  compact = false,
}: Props) {
  const { t } = useTranslation();
  const theme = useTheme();
  const spec = useMemo(() => normalizeChartSpec(rawSpec), [rawSpec]);

  const data = useMemo(
    () => prepareChartData(rows, spec, groupBy),
    [rows, spec, groupBy],
  );

  const option = useMemo(() => {
    const chartTheme = {
      text: theme.palette.text.primary,
      axis: theme.palette.mode === 'dark' ? theme.palette.grey[200] : theme.palette.text.secondary,
      grid: theme.palette.divider,
      tooltipBg: theme.palette.background.paper,
      tooltipBorder: theme.palette.divider,
    };
    const compactSpec =
      compact && spec.legend.show
        ? { ...spec, legend: { ...spec.legend, show: data.seriesNames.length > 1 } }
        : spec;
    return buildChartOption(compactSpec, data, chartTheme, {
      countFallback: t('reports.chartCount', { defaultValue: 'Количество' }),
    });
  }, [theme, spec, data, compact, t]);

  if (!rows.length || data.categories.length === 0) {
    return (
      <Box sx={{ py: 4, textAlign: 'center' }}>
        <Typography variant="body2" color="text.secondary">
          {t('reports.chartNoVisualData', {
            defaultValue: 'Недостаточно данных для построения графика',
          })}
        </Typography>
      </Box>
    );
  }

  return (
    <ReactECharts
      option={option}
      style={{ width: '100%', height }}
      notMerge
      lazyUpdate={false}
      opts={{ renderer: 'canvas' }}
    />
  );
}
