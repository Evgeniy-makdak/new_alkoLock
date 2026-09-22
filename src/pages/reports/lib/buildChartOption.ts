import type { EChartsOption } from 'echarts';

import type { ReportChartLegendPosition, ReportChartSpec } from '../types/chartSpec';
import type { ChartPreparedData } from './prepareChartData';

export type ChartThemeColors = {
  text: string;
  axis: string;
  grid: string;
  tooltipBg: string;
  tooltipBorder: string;
};

const CHART_COLORS = [
  '#5470c6',
  '#91cc75',
  '#fac858',
  '#ee6666',
  '#73c0de',
  '#3ba272',
  '#fc8452',
  '#9a60b4',
  '#ea7ccc',
];

const ABOVE_MEDIAN_COLOR = '#3ba272';
const BELOW_MEDIAN_COLOR = '#ee6666';
const MEDIAN_LINE_COLOR = '#5470c6';

/** Ширина одной категории для горизонтального скролла (компактные столбцы/точки). */
export const CHART_CATEGORY_SLOT_PX = 26;

function legendOrient(position: ReportChartLegendPosition): 'horizontal' | 'vertical' {
  return position === 'left' || position === 'right' ? 'vertical' : 'horizontal';
}

function legendOption(spec: ReportChartSpec, textColor: string) {
  if (!spec.legend.show) return { show: false };
  const pos = spec.legend.position;
  return {
    show: true,
    orient: legendOrient(pos),
    top: pos === 'top' ? 0 : pos === 'bottom' ? 'bottom' : 'middle',
    left: pos === 'left' ? 0 : pos === 'right' ? 'right' : 'center',
    type: 'scroll' as const,
    textStyle: { color: textColor, fontSize: 11 },
  };
}

function gridPadding(spec: ReportChartSpec) {
  const legend = spec.legend.show ? spec.legend.position : null;
  const hasXTitle = Boolean(spec.axes.xTitle?.trim());
  // Место под повёрнутые подписи категорий + отдельная полоса под название оси X.
  const bottomForLabels = spec.axes.rotateXLabels ? 110 : 36;
  const bottomForXTitle = hasXTitle ? (spec.axes.rotateXLabels ? 28 : 22) : 0;
  const bottom = bottomForLabels + bottomForXTitle;
  return {
    left: legend === 'left' ? 88 : 40,
    right: legend === 'right' ? 88 : 16,
    top: legend === 'top' ? 40 : 24,
    bottom: legend === 'bottom' ? bottom + 28 : bottom,
    containLabel: true,
  };
}

/** nameGap так, чтобы заголовок оси X был ниже подписей категорий, ближе к слайдеру. */
function xAxisNameOptions(spec: ReportChartSpec, theme: ChartThemeColors) {
  const title = spec.axes.xTitle?.trim();
  if (!title) {
    return {
      name: undefined as string | undefined,
      nameGap: undefined as number | undefined,
      nameTextStyle: undefined as EChartsOption['textStyle'] | undefined,
    };
  }
  return {
    name: title,
    nameLocation: 'middle' as const,
    nameGap: spec.axes.rotateXLabels ? 118 : 44,
    nameTextStyle: {
      color: theme.text,
      fontSize: 12,
      fontWeight: 600,
      padding: [6, 0, 0, 0],
    },
  };
}

function categoryTotals(data: ChartPreparedData): number[] {
  return data.categories.map((cat) =>
    Object.values(data.matrix[cat] ?? {}).reduce((sum, value) => sum + value, 0),
  );
}

function computeMedian(values: number[]): number {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return ((sorted[mid - 1] ?? 0) + (sorted[mid] ?? 0)) / 2;
  }
  return sorted[mid] ?? 0;
}

/**
 * Строит ECharts option из ChartSpec + подготовленных данных.
 */
export function buildChartOption(
  spec: ReportChartSpec,
  data: ChartPreparedData,
  theme: ChartThemeColors,
  labels?: {
    countFallback?: string;
    medianLabel?: string;
    aboveMedian?: string;
    belowMedian?: string;
  },
): EChartsOption {
  const countLabel = labels?.countFallback ?? 'Count';
  const medianLabel = labels?.medianLabel ?? 'Median';
  const aboveLabel = labels?.aboveMedian ?? 'Above median';
  const belowLabel = labels?.belowMedian ?? 'Below median';

  const valueSeriesName =
    data.seriesNames.length === 1 && data.seriesNames[0] === 'value' ? countLabel : null;

  const seriesDisplayNames = data.seriesNames.map((name) =>
    valueSeriesName && name === 'value' ? valueSeriesName : name,
  );

  const tooltip: EChartsOption['tooltip'] = spec.tooltip.show
    ? {
        trigger: spec.type === 'pie' || spec.type === 'funnel' ? 'item' : 'axis',
        backgroundColor: theme.tooltipBg,
        borderColor: theme.tooltipBorder,
        textStyle: { color: theme.text, fontSize: 12 },
        confine: true,
        formatter: (params: unknown) => {
          const list = Array.isArray(params) ? params : [params];
          if (!list.length) return '';
          const first = list[0] as {
            name?: string;
            seriesName?: string;
            value?: number | number[] | { value?: number };
            percent?: number;
            marker?: string;
            data?: { delta?: number; median?: number };
          };
          if (spec.type === 'pie' || spec.type === 'funnel') {
            const raw =
              typeof first.value === 'number'
                ? first.value
                : first.value && typeof first.value === 'object' && 'value' in first.value
                  ? Number((first.value as { value?: number }).value)
                  : Number(first.value);
            const pct =
              spec.tooltip.showPercent && typeof first.percent === 'number'
                ? ` (${first.percent.toFixed(1)}%)`
                : '';
            return `${first.marker ?? ''}${first.name ?? ''}: <b>${raw}</b>${pct}`;
          }
          if (spec.type === 'medianBar') {
            const value =
              typeof first.value === 'number'
                ? first.value
                : Number(
                    Array.isArray(first.value)
                      ? first.value[first.value.length - 1]
                      : (first.value as { value?: number })?.value ?? 0,
                  );
            const delta = first.data?.delta;
            const median = first.data?.median;
            const deltaText =
              typeof delta === 'number'
                ? ` · Δ ${delta >= 0 ? '+' : ''}${delta.toFixed(2)}`
                : '';
            const medianText = typeof median === 'number' ? ` · ${medianLabel}: ${median}` : '';
            return `${first.marker ?? ''}${first.name ?? ''}: <b>${value}</b>${medianText}${deltaText}`;
          }
          const title = first.name ?? '';
          const lines = list.map((item) => {
            const row = item as {
              marker?: string;
              seriesName?: string;
              value?: number | number[];
            };
            const raw = Array.isArray(row.value) ? row.value[row.value.length - 1] : row.value;
            const value = Number(raw ?? 0);
            const pct =
              spec.tooltip.showPercent && data.total > 0
                ? ` (${((value / data.total) * 100).toFixed(1)}%)`
                : '';
            return `${row.marker ?? ''}${row.seriesName ?? ''}: <b>${value}</b>${pct}`;
          });
          return [`<div>${title}</div>`, ...lines].join('<br/>');
        },
      }
    : { show: false };

  if (spec.type === 'pie') {
    const pieData = data.categories
      .map((cat) => {
        const value = Object.values(data.matrix[cat] ?? {}).reduce((s, v) => s + v, 0);
        return { name: cat, value };
      })
      .filter((item) => item.value > 0);

    return {
      color: CHART_COLORS,
      textStyle: { color: theme.text },
      tooltip,
      legend: legendOption(spec, theme.text),
      xAxis: undefined,
      yAxis: undefined,
      grid: undefined,
      series: [
        {
          type: 'pie',
          radius: ['32%', '62%'],
          center: ['50%', '55%'],
          avoidLabelOverlap: true,
          minShowLabelAngle: 4,
          itemStyle: {
            borderRadius: 4,
            borderColor: theme.tooltipBg,
            borderWidth: 2,
          },
          label: {
            show: true,
            color: theme.text,
            formatter: spec.tooltip.showPercent ? '{b}\n{d}%' : '{b}\n{c}',
          },
          labelLine: { show: true },
          emphasis: {
            itemStyle: { shadowBlur: 8, shadowColor: 'rgba(0,0,0,0.2)' },
            label: { show: true, fontWeight: 'bold' },
          },
          data: pieData,
        },
      ],
    };
  }

  if (spec.type === 'funnel') {
    const funnelData = data.categories
      .map((cat) => {
        const value = Object.values(data.matrix[cat] ?? {}).reduce((s, v) => s + v, 0);
        return { name: cat, value };
      })
      .filter((item) => item.value > 0)
      .sort((a, b) => b.value - a.value);

    return {
      color: CHART_COLORS,
      textStyle: { color: theme.text },
      tooltip,
      legend: legendOption(spec, theme.text),
      xAxis: undefined,
      yAxis: undefined,
      grid: undefined,
      series: [
        {
          type: 'funnel',
          left: '12%',
          top: 48,
          bottom: 24,
          width: '76%',
          min: 0,
          minSize: '8%',
          maxSize: '100%',
          sort: 'descending',
          gap: 2,
          label: {
            show: true,
            position: 'inside',
            color: '#fff',
            formatter: spec.tooltip.showPercent ? '{b}\n{c}' : '{b}\n{c}',
          },
          labelLine: { show: false },
          itemStyle: {
            borderColor: theme.tooltipBg,
            borderWidth: 1,
          },
          emphasis: {
            label: { fontSize: 13 },
          },
          data: funnelData,
        },
      ],
    };
  }

  if (spec.type === 'medianBar') {
    const totals = categoryTotals(data);
    const median = computeMedian(totals);
    const barData = data.categories.map((cat, index) => {
      const value = totals[index] ?? 0;
      return {
        value,
        median,
        delta: value - median,
        itemStyle: {
          color: value >= median ? ABOVE_MEDIAN_COLOR : BELOW_MEDIAN_COLOR,
        },
      };
    });
    const yMax = Math.max(...totals, median, 0);

    return {
      color: CHART_COLORS,
      textStyle: { color: theme.text },
      tooltip,
      legend: {
        show: spec.legend.show,
        data: [aboveLabel, belowLabel, medianLabel],
        top: 0,
        textStyle: { color: theme.text, fontSize: 11 },
      },
      grid: gridPadding(spec),
      xAxis: {
        type: 'category',
        data: data.categories,
        ...xAxisNameOptions(spec, theme),
        axisLabel: {
          color: theme.axis,
          rotate: spec.axes.rotateXLabels ? 90 : 0,
          interval: 0,
          hideOverlap: false,
          fontSize: 10,
          formatter: (value: string) =>
            value.length > 18 ? `${value.slice(0, 16)}…` : value,
        },
        axisLine: { lineStyle: { color: theme.axis } },
        axisTick: { alignWithLabel: true },
        boundaryGap: true,
      },
      yAxis: {
        type: 'value',
        min: 0,
        max: yMax <= 1 ? 5 : undefined,
        scale: false,
        name: spec.axes.yTitle || undefined,
        nameTextStyle: { color: theme.axis },
        axisLabel: { color: theme.axis },
        splitLine: {
          show: spec.axes.showGrid,
          lineStyle: { color: theme.grid, type: 'dashed' },
        },
        axisLine: { show: false },
      },
      series: [
        {
          name: countLabel,
          type: 'bar',
          data: barData,
          barMaxWidth: 22,
          barCategoryGap: '12%',
          barGap: '0%',
          markLine: {
            symbol: 'none',
            label: {
              formatter: `${medianLabel}: {c}`,
              color: theme.text,
              position: 'end',
            },
            lineStyle: { color: MEDIAN_LINE_COLOR, type: 'dashed', width: 2 },
            data: [{ yAxis: median, name: medianLabel }],
          },
          emphasis: { focus: 'series' as const },
        },
        // Легенда «выше / ниже» (невидимые серии-маркеры).
        {
          name: aboveLabel,
          type: 'bar',
          data: [],
          itemStyle: { color: ABOVE_MEDIAN_COLOR },
        },
        {
          name: belowLabel,
          type: 'bar',
          data: [],
          itemStyle: { color: BELOW_MEDIAN_COLOR },
        },
        {
          name: medianLabel,
          type: 'line',
          data: [],
          itemStyle: { color: MEDIAN_LINE_COLOR },
          lineStyle: { color: MEDIAN_LINE_COLOR, type: 'dashed' },
        },
      ],
    };
  }

  const isStacked = spec.type === 'stackedBar';
  const isArea = spec.type === 'area';
  const isLine = spec.type === 'line' || isArea;

  const series = data.seriesNames.map((seriesName, index) => {
    const values = data.categories.map((cat) => data.matrix[cat]?.[seriesName] ?? 0);
    const name = seriesDisplayNames[index] ?? seriesName;
    if (isLine) {
      return {
        name,
        type: 'line' as const,
        smooth: true,
        showSymbol: true,
        symbol: 'circle',
        symbolSize: 5,
        lineStyle: { width: 2 },
        areaStyle: isArea ? { opacity: 0.22 } : undefined,
        data: values,
        emphasis: { focus: 'series' as const },
      };
    }
    return {
      name,
      type: 'bar' as const,
      stack: isStacked ? 'total' : undefined,
      data: values,
      barMaxWidth: 22,
      barCategoryGap: '12%',
      barGap: '0%',
      emphasis: { focus: 'series' as const },
    };
  });

  const yValues = series.flatMap((item) => item.data as number[]);
  const yMax = yValues.length ? Math.max(...yValues, 0) : 0;

  return {
    color: CHART_COLORS,
    textStyle: { color: theme.text },
    tooltip,
    legend: legendOption(spec, theme.text),
    grid: gridPadding(spec),
    xAxis: {
      type: 'category',
      data: data.categories,
      ...xAxisNameOptions(spec, theme),
      axisLabel: {
        color: theme.axis,
        rotate: spec.axes.rotateXLabels ? 90 : 0,
        interval: 0,
        hideOverlap: false,
        fontSize: 10,
        formatter: (value: string) => (value.length > 18 ? `${value.slice(0, 16)}…` : value),
      },
      axisLine: { lineStyle: { color: theme.axis } },
      axisTick: { alignWithLabel: true },
      boundaryGap: isLine ? false : true,
    },
    yAxis: {
      type: 'value',
      min: 0,
      max: yMax <= 1 ? 5 : undefined,
      scale: false,
      name: spec.axes.yTitle || undefined,
      nameTextStyle: { color: theme.axis },
      axisLabel: { color: theme.axis },
      splitLine: {
        show: spec.axes.showGrid,
        lineStyle: { color: theme.grid, type: 'dashed' },
      },
      axisLine: { show: false },
    },
    series,
  };
}

export function getChartCanvasWidthPx(
  chartType: ReportChartSpec['type'],
  categoryCount: number,
  containerMinWidth = 480,
): number | '100%' {
  if (chartType === 'pie' || chartType === 'funnel') return '100%';
  if (categoryCount <= 0) return '100%';
  return Math.max(containerMinWidth, categoryCount * CHART_CATEGORY_SLOT_PX);
}

/** Нужен ли горизонтальный dataZoom (вместо CSS-скролла всей картинки). */
export function chartNeedsHorizontalPan(
  chartType: ReportChartSpec['type'],
  categoryCount: number,
  viewportWidthPx: number,
): boolean {
  if (chartType === 'pie' || chartType === 'funnel') return false;
  if (categoryCount <= 0 || viewportWidthPx <= 0) return false;
  const visible = Math.max(1, Math.floor(viewportWidthPx / CHART_CATEGORY_SLOT_PX));
  return categoryCount > visible;
}

/**
 * Фиксирует ось Y: панорама/слайдер по X внутри ECharts, а не overflow у широкого canvas.
 */
export function withFixedYAxisHorizontalPan(
  option: EChartsOption,
  categoryCount: number,
  viewportWidthPx: number,
  zoom?: { start: number; end: number },
): EChartsOption {
  if (!chartNeedsHorizontalPan('bar', categoryCount, viewportWidthPx)) {
    return option;
  }

  const visible = Math.max(1, Math.floor(viewportWidthPx / CHART_CATEGORY_SLOT_PX));
  const defaultEnd = Math.max(3, Math.min(100, (visible / categoryCount) * 100));
  const start = zoom?.start ?? 0;
  const end = zoom?.end ?? defaultEnd;

  const grid = option.grid;
  const gridObj = (Array.isArray(grid) ? grid[0] : grid) as
    | { bottom?: number | string; [key: string]: unknown }
    | undefined;
  const prevBottom = typeof gridObj?.bottom === 'number' ? gridObj.bottom : 36;

  return {
    ...option,
    grid: gridObj
      ? {
          ...gridObj,
          // Слайдер ниже подписи оси X.
          bottom: prevBottom + 28,
        }
      : option.grid,
    dataZoom: [
      {
        type: 'inside',
        xAxisIndex: 0,
        start,
        end,
        filterMode: 'none',
        zoomOnMouseWheel: false,
        moveOnMouseMove: true,
        moveOnMouseWheel: true,
        preventDefaultMouseMove: true,
      },
      {
        type: 'slider',
        xAxisIndex: 0,
        start,
        end,
        height: 18,
        bottom: 6,
        showDetail: false,
        brushSelect: false,
        filterMode: 'none',
      },
    ],
  };
}
