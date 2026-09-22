import { useEffect, useMemo, useRef, type UIEvent } from 'react';
import { useTranslation } from 'react-i18next';

import { Box, CircularProgress, Typography, useTheme } from '@mui/material';
import ReactECharts from 'echarts-for-react';

import { buildChartOption, getChartCanvasWidthPx } from '../lib/buildChartOption';
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

const SCROLL_END_THRESHOLD_PX = 48;

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
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const reachEndLockRef = useRef(false);
  const lastAutoCategoryCountRef = useRef(-1);
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
      medianLabel: t('reports.chartMedian', { defaultValue: 'Медиана' }),
      aboveMedian: t('reports.chartAboveMedian', { defaultValue: 'Выше медианы' }),
      belowMedian: t('reports.chartBelowMedian', { defaultValue: 'Ниже медианы' }),
    });
  }, [theme, spec, data, compact, t]);

  const canvasWidth = useMemo(
    () => getChartCanvasWidthPx(spec.type, data.categories.length),
    [spec.type, data.categories.length],
  );

  useEffect(() => {
    if (!loadingMore) {
      reachEndLockRef.current = false;
    }
  }, [loadingMore]);

  // Если категорий мало и горизонтального скролла ещё нет — подгружаем порции,
  // пока не появится скролл. Если число категорий перестало расти — останавливаемся
  // (иначе при сильной агрегации ушли бы в полную выгрузку).
  useEffect(() => {
    if (!hasMore || loadingMore || !onReachEnd) return;
    if (canvasWidth === '100%') return;
    const el = scrollRef.current;
    if (!el) return;
    const canScroll = el.scrollWidth > el.clientWidth + 1;
    if (canScroll) {
      lastAutoCategoryCountRef.current = -1;
      return;
    }
    const categoryCount = data.categories.length;
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
  }, [hasMore, loadingMore, onReachEnd, canvasWidth, data.categories.length, rows.length]);

  const handleScroll = (event: UIEvent<HTMLDivElement>) => {
    if (!hasMore || loadingMore || !onReachEnd || reachEndLockRef.current) return;
    const el = event.currentTarget;
    if (el.scrollWidth <= el.clientWidth + 1) return;
    if (el.scrollLeft + el.clientWidth >= el.scrollWidth - SCROLL_END_THRESHOLD_PX) {
      reachEndLockRef.current = true;
      onReachEnd();
    }
  };

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
    <Box sx={{ width: '100%', position: 'relative' }}>
      <Box
        ref={scrollRef}
        onScroll={handleScroll}
        sx={{
          width: '100%',
          overflowX: canvasWidth === '100%' ? 'hidden' : 'auto',
          overflowY: 'hidden',
        }}>
        <ReactECharts
          option={option}
          style={{
            width: canvasWidth === '100%' ? '100%' : canvasWidth,
            minWidth: canvasWidth === '100%' ? undefined : '100%',
            height,
          }}
          notMerge
          lazyUpdate={false}
          opts={{ renderer: 'canvas' }}
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
