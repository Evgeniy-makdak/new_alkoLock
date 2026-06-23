import { useTranslation } from 'react-i18next';

import { Box, Paper, Typography, useTheme } from '@mui/material';
import type { TooltipProps } from 'recharts';

import type { NamedCount } from '../lib/aggregateReportData';
import { REPORT_CHART_OTHER_KEY } from '../lib/aggregateReportData';

export type ReportChartTooltipRow = {
  displayName?: string;
  name?: string;
  count?: number;
  detail?: string;
  byEventType?: NamedCount[];
  byBranch?: NamedCount[];
  byUser?: NamedCount[];
  byVehicle?: NamedCount[];
  byDevice?: NamedCount[];
  sharePercent?: string;
};

type ReportChartTooltipProps = TooltipProps<number, string>;

function formatBreakdownLabel(name: string, otherLabel: string): string {
  if (name === REPORT_CHART_OTHER_KEY) return otherLabel;
  return name.length > 56 ? `${name.slice(0, 54)}…` : name;
}

function buildBreakdownTitle(row: ReportChartTooltipRow, fallbackLabel?: string | number): string {
  const text = row.displayName ?? row.name ?? (fallbackLabel != null ? String(fallbackLabel) : '');
  return text.length > 72 ? `${text.slice(0, 70)}…` : text;
}

function BreakdownSection({
  title,
  items,
  otherLabel,
}: {
  title: string;
  items: NamedCount[];
  otherLabel: string;
}) {
  if (!items.length) return null;
  return (
    <Box sx={{ mt: 0.75 }}>
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ display: 'block', mb: 0.5, fontWeight: 600 }}>
        {title}
      </Typography>
      {items.map((item) => (
        <Box
          key={item.name}
          sx={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: 2,
            py: 0.25,
          }}>
          <Typography variant="body2" sx={{ wordBreak: 'break-word', flex: 1 }}>
            {formatBreakdownLabel(item.name, otherLabel)}
          </Typography>
          <Typography variant="body2" fontWeight={700} sx={{ flexShrink: 0 }}>
            {item.count}
          </Typography>
        </Box>
      ))}
    </Box>
  );
}

export function ReportChartTooltip({ active, payload, label }: ReportChartTooltipProps) {
  const { t } = useTranslation();
  const theme = useTheme();

  if (!active || !payload?.length) return null;

  const row = (payload[0]?.payload ?? {}) as ReportChartTooltipRow;
  const title = buildBreakdownTitle(row, label);
  const count = row.count ?? Number(payload[0]?.value ?? 0);
  const breakdownSections = [
    { key: 'eventType', title: t('reports.tooltipByEventType'), items: row.byEventType ?? [] },
    { key: 'branch', title: t('reports.tooltipByBranch'), items: row.byBranch ?? [] },
    { key: 'user', title: t('reports.tooltipByUser'), items: row.byUser ?? [] },
    { key: 'vehicle', title: t('reports.tooltipByVehicle'), items: row.byVehicle ?? [] },
    { key: 'device', title: t('reports.tooltipByDevice'), items: row.byDevice ?? [] },
  ].filter((section) => section.items.some((item) => item.count > 0));

  const otherLabel = t('reports.otherBucket');

  return (
    <Paper
      elevation={4}
      sx={{
        p: 1.5,
        maxWidth: 480,
        border: `1px solid ${theme.palette.divider}`,
        backgroundColor: theme.palette.background.paper,
      }}>
      {title ? (
        <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 0.5, wordBreak: 'break-word' }}>
          {title}
        </Typography>
      ) : null}

      {row.detail ? (
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.75 }}>
          {row.detail}
        </Typography>
      ) : null}

      <Typography variant="body2" sx={{ mb: breakdownSections.length ? 0.5 : 0 }}>
        {t('reports.tooltipRowsOnPage')}: <strong>{count}</strong>
        {row.sharePercent ? (
          <Typography component="span" variant="body2" color="text.secondary">
            {' '}
            ({t('reports.tooltipShare', { percent: row.sharePercent })})
          </Typography>
        ) : null}
      </Typography>

      {breakdownSections.map((section) => (
        <BreakdownSection
          key={section.key}
          title={section.title}
          items={section.items.filter((item) => item.count > 0)}
          otherLabel={otherLabel}
        />
      ))}

      {!breakdownSections.length ? (
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
          {t('reports.tooltipNoBreakdown')}
        </Typography>
      ) : null}
    </Paper>
  );
}

function formatBreakdownLines(
  row: { name: string; byEventType?: NamedCount[]; byBranch?: NamedCount[]; byUser?: NamedCount[]; byVehicle?: NamedCount[]; byDevice?: NamedCount[] },
  formatLabel: (name: string) => string,
  labels: {
    eventType: string;
    branch: string;
    user: string;
    vehicle: string;
    device: string;
  },
): string[] {
  const lines: string[] = [];
  const sections = [
    { items: row.byEventType, label: labels.eventType },
    { items: row.byBranch, label: labels.branch },
    { items: row.byUser, label: labels.user },
    { items: row.byVehicle, label: labels.vehicle },
    { items: row.byDevice, label: labels.device },
  ];
  for (const section of sections) {
    const items = section.items?.filter((item) => item.count > 0);
    if (!items?.length) continue;
    lines.push(
      `${section.label}: ${items.map((item) => `${formatLabel(item.name)} (${item.count})`).join(', ')}`,
    );
  }
  return lines;
}

export function formatBreakdownTitle(
  row: {
    name: string;
    byEventType?: NamedCount[];
    byBranch?: NamedCount[];
    byUser?: NamedCount[];
    byVehicle?: NamedCount[];
    byDevice?: NamedCount[];
  },
  formatLabel: (name: string) => string,
  sectionLabels?: {
    eventType: string;
    branch: string;
    user: string;
    vehicle: string;
    device: string;
  },
): string | undefined {
  const lines = formatBreakdownLines(
    row,
    formatLabel,
    sectionLabels ?? {
      eventType: 'Events',
      branch: 'Branches',
      user: 'Users',
      vehicle: 'Vehicles',
      device: 'Devices',
    },
  );
  return lines.length ? lines.join('\n') : undefined;
}
