import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Box, CircularProgress, Typography, useTheme } from '@mui/material';
import ReactECharts from 'echarts-for-react';
import type { EChartsType } from 'echarts';

import {
  buildChartOption,
  chartNeedsHorizontalPan,
  CHART_CATEGORY_SLOT_PX,
  withFixedYAxisHorizontalPan,
} from '../lib/buildChartOption';
import { prepareChartData } from '../lib/prepareChartData';
import { normalizeChartSpec, type ReportChartSpec } from '../types/chartSpec';

type Props = {
  rows: Array<Record<string, unknown>>;
  spec: ReportChartSpec;
  groupBy?: string[];
  height?: number | string;
  compact?: boolean;
  /** Есть ли ещё строки отчёта для подгрузки. */
  hasMore?: boolean;
  /** Идёт тихая подгрузка следующей порции. */
  loadingMore?: boolean;
  /** Доскроллили вправо до конца видимой области графика. */
  onReachEnd?: () => void;
};

const SCROLL_END_THRESHOLD_PCT = 97;

export function ReportChartCanvas({
  rows,
  spec: rawSpec,
  groupBy,
  height = 420,
  compact = false,
  hasMore = false,
  loadingMore = false,
  onReachEnd,
}: Props) {
  const { t } = useTranslation();
  const theme = useTheme();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<EChartsType | null>(null);
  const reachEndLockRef = useRef(false);
  const lastAutoCategoryCountRef = useRef(-1);
  const zoomRangeRef = useRef<{ start: number; end: number } | null>(null);
  const [viewportWidth, setViewportWidth] = useState(0);
  const spec = useMemo(() => normalizeChartSpec(rawSpec), [rawSpec]);

  const data = useMemo(
    () => prepareChartData(rows, spec, groupBy),
    [rows, spec, groupBy],
  );

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => {
      const next = Math.floor(el.clientWidth);
      setViewportWidth((prev) => (prev === next ? prev : next));
      chartRef.current?.resize();
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!loadingMore) {
      reachEndLockRef.current = false;
    }
  }, [loadingMore]);

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
    const base = buildChartOption(compactSpec, data, chartTheme, {
      countFallback: t('reports.chartCount', { defaultValue: 'Количество' }),
      medianLabel: t('reports.chartMedian', { defaultValue: 'Медиана' }),
      aboveMedian: t('reports.chartAboveMedian', { defaultValue: 'Выше медианы' }),
      belowMedian: t('reports.chartBelowMedian', { defaultValue: 'Ниже медианы' }),
    });

    const categoryCount = data.categories.length;
    const needsPan = chartNeedsHorizontalPan(spec.type, categoryCount, viewportWidth);
    if (!needsPan) {
      zoomRangeRef.current = null;
      return base;
    }

    const visible = Math.max(1, Math.floor(viewportWidth / CHART_CATEGORY_SLOT_PX));
    const span = Math.max(3, Math.min(100, (visible / categoryCount) * 100));
    const prev = zoomRangeRef.current;
    let start = 0;
    let end = span;
    if (prev) {
      if (prev.end >= SCROLL_END_THRESHOLD_PCT) {
        start = Math.max(0, 100 - span);
        end = 100;
      } else {
        start = Math.min(prev.start, 100 - span);
        end = Math.min(100, start + span);
      }
    }
    zoomRangeRef.current = { start, end };
    return withFixedYAxisHorizontalPan(base, categoryCount, viewportWidth, { start, end });
  }, [theme, spec, data, compact, t, viewportWidth]);

  const maybeLoadMore = useCallback(
    (endPct: number) => {
      if (!hasMore || loadingMore || !onReachEnd || reachEndLockRef.current) return;
      if (endPct < SCROLL_END_THRESHOLD_PCT) return;
      reachEndLockRef.current = true;
      onReachEnd();
    },
    [hasMore, loadingMore, onReachEnd],
  );

  // Если категорий мало и «хвост» уже виден целиком — подгружаем, пока не появится панорама
  // или пока число категорий растёт.
  useEffect(() => {
    if (!hasMore || loadingMore || !onReachEnd) return;
    if (spec.type === 'pie' || spec.type === 'funnel') return;
    if (viewportWidth <= 0) return;
    const categoryCount = data.categories.length;
    const needsPan = chartNeedsHorizontalPan(spec.type, categoryCount, viewportWidth);
    if (needsPan) {
      lastAutoCategoryCountRef.current = -1;
      return;
    }
    if (
      lastAutoCategoryCountRef.current >= 0 &&
      categoryCount <= lastAutoCategoryCountRef.current
    ) {
      return;
    }
    if (reachEndLockRef.current) return;
    lastAutoCategoryCountRef.current = categoryCount;
    reachEndLockRef.current = true;
    onReachEnd();
  }, [
    hasMore,
    loadingMore,
    onReachEnd,
    spec.type,
    viewportWidth,
    data.categories.length,
    rows.length,
  ]);

  const onChartEvents = useMemo(
    () => ({
      datazoom: (params: {
        start?: number;
        end?: number;
        batch?: Array<{ start?: number; end?: number }>;
      }) => {
        const batch = params.batch?.[0];
        const start = batch?.start ?? params.start ?? zoomRangeRef.current?.start ?? 0;
        const end = batch?.end ?? params.end ?? zoomRangeRef.current?.end ?? 100;
        zoomRangeRef.current = { start, end };
        maybeLoadMore(end);
      },
    }),
    [maybeLoadMore],
  );

  if (!rows.length || data.categories.length === 0) {
    return (
      <Box sx={{ py: 4, textAlign: 'center', height: typeof height === 'number' ? height : '100%' }}>
        <Typography variant="body2" color="text.secondary">
          {t('reports.chartNoVisualData', {
            defaultValue: 'Недостаточно данных для построения графика',
          })}
        </Typography>
      </Box>
    );
  }

  const fillParent = height === '100%';

  return (
    <Box
      sx={{
        width: '100%',
        height: fillParent ? '100%' : height,
        minHeight: fillParent ? 0 : undefined,
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
      }}>
      <Box
        ref={containerRef}
        sx={{
          flex: 1,
          minHeight: 0,
          width: '100%',
        }}>
        <ReactECharts
          option={option}
          style={{ width: '100%', height: '100%', minHeight: fillParent ? 280 : undefined }}
          notMerge
          lazyUpdate={false}
          opts={{ renderer: 'canvas' }}
          onEvents={onChartEvents}
          onChartReady={(instance) => {
            chartRef.current = instance;
            instance.resize();
          }}
        />
      </Box>
      {loadingMore ? (
        <Box
          sx={{
            position: 'absolute',
            right: 8,
            bottom: 8,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 1,
            bgcolor: 'background.paper',
            px: 1,
            py: 0.5,
            borderRadius: 1,
            boxShadow: 1,
            zIndex: 2,
          }}>
          <CircularProgress size={16} />
          <Typography variant="caption" color="text.secondary">
            {t('reports.chartLoadingMore', { defaultValue: 'Подгрузка…' })}
          </Typography>
        </Box>
      ) : null}
    </Box>
  );
}
