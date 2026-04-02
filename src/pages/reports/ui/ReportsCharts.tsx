import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { Box, Paper, Typography, useTheme } from '@mui/material';

import type { ReportAggregates } from '../lib/aggregateReportData';
import { REPORT_CHART_OTHER_KEY } from '../lib/aggregateReportData';

const PIE_COLORS = ['#1976d2', '#2e7d32', '#ed6c02', '#9c27b0', '#d32f2f', '#00838f'];

interface ReportsChartsProps {
  data: ReportAggregates | null;
}

export function ReportsCharts({ data }: ReportsChartsProps) {
  const { t } = useTranslation();
  const theme = useTheme();

  const reportTooltipProps = useMemo(() => {
    const countLabel = t('reports.tooltipCount');
    const formatItem = (value: number, name: string): [number, string] => {
      if (name === 'count' || name === 'value') {
        return [value, countLabel];
      }
      return [value, name];
    };
    return {
      contentStyle: {
        backgroundColor: theme.palette.background.paper,
        border: `1px solid ${theme.palette.divider}`,
        borderRadius: theme.shape.borderRadius,
        boxShadow: theme.shadows[4],
        color: theme.palette.text.primary,
      },
      itemStyle: { color: theme.palette.text.primary },
      labelStyle: { color: theme.palette.text.secondary, marginBottom: 4 },
      formatter: formatItem,
    };
  }, [t, theme]);

  const formatAxisLabel = (name: string) => {
    if (name === REPORT_CHART_OTHER_KEY) return t('reports.otherBucket');
    return name.length > 48 ? `${name.slice(0, 46)}…` : name;
  };

  const sobrietyPie = useMemo(() => {
    if (!data) return [];
    return data.sobrietyOnly
      .filter((x) => x.value > 0)
      .map((x) => ({
        ...x,
        name: t(`reports.sobriety.${x.name}`),
      }));
  }, [data, t]);

  const byTypeForChart = useMemo(() => {
    if (!data) return [];
    return data.byEventType.map((row) => ({
      ...row,
      displayName:
        row.name === REPORT_CHART_OTHER_KEY ? t('reports.otherBucket') : formatAxisLabel(row.name),
    }));
  }, [data, t]);

  if (data === null) {
    return null;
  }

  if (data.total === 0) {
    return (
      <Typography color="text.secondary" sx={{ py: 6, textAlign: 'center' }}>
        {t('reports.empty')}
      </Typography>
    );
  }

  const topBar = (title: string, rows: { name: string; count: number }[], fill: string) => (
    <Paper sx={{ p: 2, minHeight: 300 }}>
      <Typography variant="subtitle1" fontWeight={600} gutterBottom>
        {title}
      </Typography>
      <ResponsiveContainer width="100%" height={240}>
        <BarChart
          layout="vertical"
          data={rows.map((r) => ({ ...r, displayName: formatAxisLabel(r.name) }))}
          margin={{ left: 8, right: 12 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis type="number" allowDecimals={false} />
          <YAxis type="category" dataKey="displayName" width={130} tick={{ fontSize: 10 }} />
          <Tooltip {...reportTooltipProps} />
          <Bar dataKey="count" fill={fill} radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </Paper>
  );

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Paper sx={{ p: 2 }}>
        <Typography variant="h6" component="p" sx={{ m: 0 }}>
          {t('reports.totalEvents')}: <strong>{data.total}</strong>
        </Typography>
      </Paper>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' },
          gap: 2,
        }}>
        <Paper sx={{ p: 2, minHeight: 320 }}>
          <Typography variant="subtitle1" fontWeight={600} gutterBottom>
            {t('reports.chartByDay')}
          </Typography>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={data.byDay}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} />
              <YAxis allowDecimals={false} />
              <Tooltip {...reportTooltipProps} />
              <Bar dataKey="count" fill={theme.palette.primary.main} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Paper>

        <Paper sx={{ p: 2, minHeight: 320 }}>
          <Typography variant="subtitle1" fontWeight={600} gutterBottom>
            {t('reports.chartSobriety')}
          </Typography>
          {sobrietyPie.length === 0 ? (
            <Typography color="text.secondary" sx={{ py: 4 }}>
              {t('common.noData')}
            </Typography>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={sobrietyPie}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={88}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                  {sobrietyPie.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip {...reportTooltipProps} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </Paper>
      </Box>

      <Paper sx={{ p: 2 }}>
        <Typography variant="subtitle1" fontWeight={600} gutterBottom>
          {t('reports.chartByType')}
        </Typography>
        <ResponsiveContainer width="100%" height={Math.max(360, byTypeForChart.length * 28)}>
          <BarChart
            layout="vertical"
            data={byTypeForChart}
            margin={{ left: 8, right: 20, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" allowDecimals={false} />
            <YAxis type="category" dataKey="displayName" width={168} tick={{ fontSize: 10 }} />
            <Tooltip {...reportTooltipProps} />
            <Bar dataKey="count" fill={theme.palette.secondary.main} radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Paper>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: '1fr 1fr', xl: '1fr 1fr 1fr' },
          gap: 2,
        }}>
        {topBar(t('reports.chartTopUsers'), data.topUsers, theme.palette.primary.dark)}
        {topBar(t('reports.chartTopDevices'), data.topDevices, theme.palette.info.main)}
        {topBar(t('reports.chartTopVehicles'), data.topVehicles, theme.palette.success.main)}
      </Box>
    </Box>
  );
}
