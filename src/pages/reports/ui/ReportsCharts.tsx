import { useMemo, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import CancelOutlinedIcon from '@mui/icons-material/CancelOutlined';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import DirectionsCarOutlinedIcon from '@mui/icons-material/DirectionsCarOutlined';
import EventNoteOutlinedIcon from '@mui/icons-material/EventNoteOutlined';
import PauseCircleOutlineIcon from '@mui/icons-material/PauseCircleOutline';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import SensorsOutlinedIcon from '@mui/icons-material/SensorsOutlined';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { Box, Paper, Typography, useTheme } from '@mui/material';

import type { ReportViewMode } from '../types/reportApiTypes';
import type { NamedCount, ReportAggregates } from '../lib/aggregateReportData';
import { REPORT_CHART_OTHER_KEY } from '../lib/aggregateReportData';

import { ReportChartTooltip, formatBreakdownTitle } from './ReportChartTooltip';
import styles from './Reports.module.scss';

interface ReportsChartsProps {
  data: ReportAggregates | null;
  viewMode: Exclude<ReportViewMode, 'table'>;
  pageRows: number;
  reportTotal: number;
}

export function ReportsCharts({ data, viewMode, pageRows, reportTotal }: ReportsChartsProps) {
  const { t } = useTranslation();
  const theme = useTheme();

  const chartAxisColor =
    theme.palette.mode === 'dark' ? theme.palette.grey[100] : theme.palette.text.primary;
  const chartGridColor = theme.palette.divider;
  const axisTickStyle = { fill: chartAxisColor, fontSize: 10 };
  const rankingTickStyle = { fill: chartAxisColor, fontSize: 12 };

  const chartTooltip = <Tooltip content={<ReportChartTooltip />} />;

  const formatAxisLabel = (name: string) => {
    if (name === REPORT_CHART_OTHER_KEY) return t('reports.otherBucket');
    return name.length > 48 ? `${name.slice(0, 46)}…` : name;
  };

  const byTypeForChart = useMemo(() => {
    if (!data) return [];
    return data.byEventType.map((row) => ({
      ...row,
      displayName:
        row.name === REPORT_CHART_OTHER_KEY ? t('reports.otherBucket') : formatAxisLabel(row.name),
      sharePercent:
        data.total > 0 ? ((row.count / data.total) * 100).toFixed(1) : '0',
    }));
  }, [data, t]);

  const byDayForChart = useMemo(() => {
    if (!data) return [];
    return data.byDay.map((row) => ({
      ...row,
      displayName: row.name,
      sharePercent:
        data.total > 0 ? ((row.count / data.total) * 100).toFixed(1) : '0',
    }));
  }, [data]);

  const dashboardCards = useMemo(() => {
    if (!data) return [];
    const cards: Array<{
      key: string;
      label: string;
      detail?: string;
      value: number;
      icon: ReactNode;
      tone: string;
    }> = [
      {
        key: 'total',
        label: t('reports.totalEvents'),
        value: data.total,
        icon: <EventNoteOutlinedIcon fontSize="large" />,
        tone: 'primary',
      },
    ];

    const sobrietyIcons: Record<string, ReactNode> = {
      passed: <CheckCircleOutlineIcon fontSize="large" />,
      failed: <CancelOutlinedIcon fontSize="large" />,
      interrupted: <PauseCircleOutlineIcon fontSize="large" />,
    };
    const sobrietyTones: Record<string, string> = {
      passed: 'success',
      failed: 'error',
      interrupted: 'warning',
    };

    for (const item of data.sobrietyOnly) {
      if (item.value <= 0) continue;
      cards.push({
        key: `sobriety-${item.name}`,
        label: t(`reports.sobriety.${item.name}`),
        value: item.value,
        icon: sobrietyIcons[item.name] ?? <EventNoteOutlinedIcon fontSize="large" />,
        tone: sobrietyTones[item.name] ?? 'default',
      });
    }

    const topUser = data.topUsers[0];
    if (topUser) {
      cards.push({
        key: 'top-user',
        label: t('reports.dashboardTopUser'),
        detail: formatAxisLabel(topUser.name),
        value: topUser.count,
        icon: <PersonOutlineIcon fontSize="large" />,
        tone: 'info',
      });
    }

    const topDevice = data.topDevices[0];
    if (topDevice) {
      cards.push({
        key: 'top-device',
        label: t('reports.dashboardTopDevice'),
        detail: formatAxisLabel(topDevice.name),
        value: topDevice.count,
        icon: <SensorsOutlinedIcon fontSize="large" />,
        tone: 'secondary',
      });
    }

    const topVehicle = data.topVehicles[0];
    if (topVehicle) {
      cards.push({
        key: 'top-vehicle',
        label: t('reports.dashboardTopVehicle'),
        detail: formatAxisLabel(topVehicle.name),
        value: topVehicle.count,
        icon: <DirectionsCarOutlinedIcon fontSize="large" />,
        tone: 'success',
      });
    }

    const topBranch = data.topBranches[0];
    if (topBranch) {
      cards.push({
        key: 'top-branch',
        label: t('reports.dashboardTopBranch'),
        detail: formatAxisLabel(topBranch.name),
        value: topBranch.count,
        icon: <EventNoteOutlinedIcon fontSize="large" />,
        tone: 'warning',
      });
    }

    return cards;
  }, [data, t]);

  if (data === null) {
    return (
      <Typography color="text.secondary" sx={{ py: 6, textAlign: 'center' }}>
        {t('reports.empty')}
      </Typography>
    );
  }

  if (data.total === 0) {
    return (
      <Typography color="text.secondary" sx={{ py: 6, textAlign: 'center' }}>
        {t('reports.empty')}
      </Typography>
    );
  }

  const hasRankingCharts =
    (data.dimensions.branch && data.topBranches.length > 0) ||
    (data.dimensions.user && data.topUsers.length > 0) ||
    (data.dimensions.device && data.topDevices.length > 0) ||
    (data.dimensions.vehicle && data.topVehicles.length > 0);
  const hasTrendCharts =
    (data.dimensions.date && data.byDay.length > 0) ||
    (data.dimensions.eventType && data.byEventType.length > 0);
  const hasVisualCharts = hasRankingCharts || hasTrendCharts;

  const hint =
    pageRows > 0 && reportTotal > 0 ? (
      <Typography variant="body2" color="text.secondary" className={styles.chartPageHint}>
        {t('reports.chartPageHint', { count: pageRows, total: reportTotal })}
      </Typography>
    ) : null;

  const totalCard = (
    <Paper sx={{ p: 2 }}>
      <Typography variant="h6" component="p" sx={{ m: 0 }}>
        {t('reports.chartPageEvents')}: <strong>{data?.total ?? pageRows}</strong>
        {reportTotal > (data?.total ?? 0) ? (
          <Typography component="span" variant="body2" color="text.secondary" sx={{ ml: 1 }}>
            ({t('reports.chartReportTotal', { total: reportTotal })})
          </Typography>
        ) : null}
      </Typography>
    </Paper>
  );

  const topBar = (title: string, rows: NamedCount[], fill: string) => {
    if (!rows.length) return null;
    const chartRows = rows.map((r) => ({
      ...r,
      displayName: formatAxisLabel(r.name),
      sharePercent: data.total > 0 ? ((r.count / data.total) * 100).toFixed(1) : '0',
    }));
    const maxLabelLen = Math.max(...chartRows.map((row) => row.displayName.length), 8);
    const rowHeight = 40;
    const chartHeight = Math.max(360, chartRows.length * rowHeight + 48);
    const yAxisWidth = Math.min(520, Math.max(220, maxLabelLen * 7));
    return (
      <Paper sx={{ p: 2 }}>
        <Typography variant="subtitle1" fontWeight={600} gutterBottom>
          {title}
        </Typography>
        <ResponsiveContainer width="100%" height={chartHeight}>
          <BarChart
            layout="vertical"
            data={chartRows}
            barCategoryGap="28%"
            margin={{ left: 12, right: 16, top: 8, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={chartGridColor} />
            <XAxis
              type="number"
              allowDecimals={false}
              tick={rankingTickStyle}
              stroke={chartAxisColor}
            />
            <YAxis
              type="category"
              dataKey="displayName"
              width={yAxisWidth}
              tick={rankingTickStyle}
              stroke={chartAxisColor}
              interval={0}
              tickMargin={10}
            />
            {chartTooltip}
            <Bar dataKey="count" fill={fill} radius={[0, 4, 4, 0]} barSize={18} />
          </BarChart>
        </ResponsiveContainer>
      </Paper>
    );
  };

  const breakdownSectionLabels = useMemo(
    () => ({
      eventType: t('reports.tooltipByEventType'),
      branch: t('reports.tooltipByBranch'),
      user: t('reports.tooltipByUser'),
      vehicle: t('reports.tooltipByVehicle'),
      device: t('reports.tooltipByDevice'),
    }),
    [t],
  );

  const renderBarView = () => (
  <>
      {data.dimensions.date && data.byDay.length ? (
        <Paper sx={{ p: 2, minHeight: 320 }}>
          <Typography variant="subtitle1" fontWeight={600} gutterBottom>
            {t('reports.chartByDay')}
          </Typography>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={byDayForChart}>
              <CartesianGrid strokeDasharray="3 3" stroke={chartGridColor} />
              <XAxis dataKey="name" tick={axisTickStyle} stroke={chartAxisColor} />
              <YAxis allowDecimals={false} tick={axisTickStyle} stroke={chartAxisColor} />
              {chartTooltip}
              <Bar dataKey="count" fill={theme.palette.primary.main} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Paper>
      ) : null}

      {data.dimensions.eventType && byTypeForChart.length ? (
        <Paper sx={{ p: 2 }}>
          <Typography variant="subtitle1" fontWeight={600} gutterBottom>
            {t('reports.chartByType')}
          </Typography>
          <ResponsiveContainer width="100%" height={Math.max(360, byTypeForChart.length * 36 + 48)}>
            <BarChart
              layout="vertical"
              data={byTypeForChart}
              barCategoryGap="24%"
              margin={{ left: 8, right: 20, bottom: 8, top: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={chartGridColor} />
              <XAxis
                type="number"
                allowDecimals={false}
                tick={axisTickStyle}
                stroke={chartAxisColor}
              />
              <YAxis
                type="category"
                dataKey="displayName"
                width={168}
                tick={axisTickStyle}
                stroke={chartAxisColor}
              />
              {chartTooltip}
              <Bar dataKey="count" fill={theme.palette.secondary.main} radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Paper>
      ) : null}

      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          gap: 3,
        }}>
        {data.dimensions.branch
          ? topBar(t('reports.chartByBranches'), data.topBranches, theme.palette.warning.main)
          : null}
        {data.dimensions.user
          ? topBar(t('reports.chartByUsers'), data.topUsers, theme.palette.primary.dark)
          : null}
        {data.dimensions.device
          ? topBar(t('reports.chartByDevices'), data.topDevices, theme.palette.info.main)
          : null}
        {data.dimensions.vehicle
          ? topBar(t('reports.chartByVehicles'), data.topVehicles, theme.palette.success.main)
          : null}
      </Box>
    </>
  );

  const renderPictogramList = (
    title: string,
    rows: NamedCount[],
    limit = 8,
  ) => {
    if (!rows.length) return null;
    return (
      <Paper sx={{ p: 2 }}>
        <Typography variant="subtitle1" fontWeight={600} gutterBottom>
          {title}
        </Typography>
        <div className={styles.pictogramTypeList}>
          {rows.slice(0, limit).map((row) => {
            const label = formatAxisLabel(row.name);
            const breakdownTitle = formatBreakdownTitle(
              row,
              (name) =>
                name === REPORT_CHART_OTHER_KEY ? t('reports.otherBucket') : formatAxisLabel(name),
              breakdownSectionLabels,
            );
            return (
            <div
              key={row.name}
              className={styles.pictogramTypeRow}
              title={breakdownTitle}>
              <Typography variant="body2" className={styles.pictogramTypeName}>
                {label}
              </Typography>
              <Typography variant="body2" fontWeight={600}>
                {row.count}
              </Typography>
            </div>
            );
          })}
        </div>
      </Paper>
    );
  };

  const renderDashboardView = () => (
    <>
      <div className={styles.pictogramGrid}>
        {dashboardCards.map((card) => (
          <Paper key={card.key} className={styles.pictogramCard} data-tone={card.tone}>
            <div className={styles.pictogramIcon}>{card.icon}</div>
            <Typography variant="h4" component="p" className={styles.pictogramValue}>
              {card.value}
            </Typography>
            <Typography variant="body2" color="text.secondary" className={styles.pictogramLabel}>
              {card.label}
            </Typography>
            {card.detail ? (
              <Typography variant="body2" className={styles.pictogramDetail} title={card.detail}>
                {card.detail}
              </Typography>
            ) : null}
          </Paper>
        ))}
      </div>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
          gap: 2,
          mt: 2,
        }}>
        {data.dimensions.eventType ? renderPictogramList(t('reports.chartByType'), byTypeForChart) : null}
        {data.dimensions.branch ? renderPictogramList(t('reports.chartByBranches'), data.topBranches) : null}
        {data.dimensions.user ? renderPictogramList(t('reports.chartByUsers'), data.topUsers) : null}
        {data.dimensions.device ? renderPictogramList(t('reports.chartByDevices'), data.topDevices) : null}
        {data.dimensions.vehicle ? renderPictogramList(t('reports.chartByVehicles'), data.topVehicles) : null}
      </Box>
    </>
  );

  return (
    <Box className={styles.chartsWrapper}>
      {hint}
      {totalCard}
      {!hasVisualCharts ? (
        <Typography color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
          {t('reports.chartNoVisualData')}
        </Typography>
      ) : null}
      {viewMode === 'bar' && hasVisualCharts ? renderBarView() : null}
      {viewMode === 'dashboard' && hasVisualCharts ? renderDashboardView() : null}
    </Box>
  );
}
