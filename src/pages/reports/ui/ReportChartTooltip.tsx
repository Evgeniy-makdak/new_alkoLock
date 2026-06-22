import { useTranslation } from 'react-i18next';

import { Box, Paper, Typography, useTheme } from '@mui/material';
import type { TooltipProps } from 'recharts';

import type { NamedCount } from '../lib/aggregateReportData';
import { REPORT_CHART_OTHER_KEY } from '../lib/aggregateReportData';

export type ReportChartTooltipRow = {
  displayName?: string;
  name?: string;
  count?: number;
  byEventType?: NamedCount[];
  sharePercent?: string;
};

type ReportChartTooltipProps = TooltipProps<number, string>;

function formatEventTypeLabel(name: string, otherLabel: string): string {
  if (name === REPORT_CHART_OTHER_KEY) return otherLabel;
  return name.length > 56 ? `${name.slice(0, 54)}…` : name;
}

function buildBreakdownTitle(row: ReportChartTooltipRow, fallbackLabel?: string | number): string {
  const text = row.displayName ?? row.name ?? (fallbackLabel != null ? String(fallbackLabel) : '');
  return text.length > 72 ? `${text.slice(0, 70)}…` : text;
}

export function ReportChartTooltip({ active, payload, label }: ReportChartTooltipProps) {
  const { t } = useTranslation();
  const theme = useTheme();

  if (!active || !payload?.length) return null;

  const row = (payload[0]?.payload ?? {}) as ReportChartTooltipRow;
  const title = buildBreakdownTitle(row, label);
  const count = row.count ?? Number(payload[0]?.value ?? 0);
  const breakdown = (row.byEventType ?? []).filter((item) => item.count > 0);

  return (
    <Paper
      elevation={4}
      sx={{
        p: 1.5,
        maxWidth: 440,
        border: `1px solid ${theme.palette.divider}`,
        backgroundColor: theme.palette.background.paper,
      }}>
      {title ? (
        <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 0.75, wordBreak: 'break-word' }}>
          {title}
        </Typography>
      ) : null}

      <Typography variant="body2" sx={{ mb: breakdown.length ? 1 : 0 }}>
        {t('reports.tooltipTotal')}: <strong>{count}</strong>
        {row.sharePercent ? (
          <Typography component="span" variant="body2" color="text.secondary">
            {' '}
            ({t('reports.tooltipShare', { percent: row.sharePercent })})
          </Typography>
        ) : null}
      </Typography>

      {breakdown.length > 0 ? (
        <Box sx={{ mt: 0.5 }}>
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ display: 'block', mb: 0.5, fontWeight: 600 }}>
            {t('reports.tooltipByEventType')}
          </Typography>
          {breakdown.map((item) => (
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
                {formatEventTypeLabel(item.name, t('reports.otherBucket'))}
              </Typography>
              <Typography variant="body2" fontWeight={700} sx={{ flexShrink: 0 }}>
                {item.count}
              </Typography>
            </Box>
          ))}
        </Box>
      ) : null}
    </Paper>
  );
}

export function formatBreakdownTitle(
  row: { name: string; byEventType?: NamedCount[] },
  formatLabel: (name: string) => string,
): string | undefined {
  const breakdown = row.byEventType?.filter((item) => item.count > 0);
  if (!breakdown?.length) return undefined;
  return breakdown
    .map((item) => `${formatLabel(item.name)}: ${item.count}`)
    .join('\n');
}
