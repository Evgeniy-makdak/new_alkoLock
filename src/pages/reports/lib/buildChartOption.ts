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
  return {
    left: legend === 'left' ? 96 : 48,
    right: legend === 'right' ? 96 : 24,
    top: legend === 'top' ? 48 : 32,
    bottom: legend === 'bottom' ? 56 : spec.axes.rotateXLabels ? 72 : 40,
    containLabel: true,
  };
}

/**
 * Строит ECharts option из ChartSpec + подготовленных данных.
 */
export function buildChartOption(
  spec: ReportChartSpec,
  data: ChartPreparedData,
  theme: ChartThemeColors,
  labels?: { countFallback?: string },
): EChartsOption {
  const countLabel = labels?.countFallback ?? 'Count';
  const valueSeriesName =
    data.seriesNames.length === 1 && data.seriesNames[0] === 'value' ? countLabel : null;

  const seriesDisplayNames = data.seriesNames.map((name) =>
    valueSeriesName && name === 'value' ? valueSeriesName : name,
  );

  const tooltip: EChartsOption['tooltip'] = spec.tooltip.show
    ? {
        trigger: spec.type === 'pie' ? 'item' : 'axis',
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
            value?: number | number[];
            percent?: number;
            marker?: string;
          };
          if (spec.type === 'pie') {
            const value = typeof first.value === 'number' ? first.value : Number(first.value);
            const pct =
              spec.tooltip.showPercent && typeof first.percent === 'number'
                ? ` (${first.percent.toFixed(1)}%)`
                : '';
            return `${first.marker ?? ''}${first.name ?? ''}: <b>${value}</b>${pct}`;
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
      // Явно сбрасываем декартовы оси после bar/line — иначе pie «невидим», а tooltip есть.
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
        symbolSize: data.categories.length <= 24 ? 10 : 6,
        lineStyle: { width: 3 },
        areaStyle: isArea ? { opacity: 0.28 } : undefined,
        data: values,
        emphasis: { focus: 'series' as const },
      };
    }
    return {
      name,
      type: 'bar' as const,
      stack: isStacked ? 'total' : undefined,
      data: values,
      barMaxWidth: 48,
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
      name: spec.axes.xTitle || undefined,
      nameLocation: 'middle',
      nameGap: 28,
      nameTextStyle: { color: theme.axis },
      axisLabel: {
        color: theme.axis,
        rotate: spec.axes.rotateXLabels ? 30 : 0,
        interval: 0,
        hideOverlap: true,
        formatter: (value: string) => (value.length > 24 ? `${value.slice(0, 22)}…` : value),
      },
      axisLine: { lineStyle: { color: theme.axis } },
      axisTick: { alignWithLabel: true },
      boundaryGap: isLine ? false : true,
    },
    yAxis: {
      type: 'value',
      min: 0,
      // Чтобы «точки на оси» не выглядели сплюснутыми при малых значениях.
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
