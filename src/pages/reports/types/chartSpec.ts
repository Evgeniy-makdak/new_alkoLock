/**
 * Сериализуемая конфигурация графика отчёта.
 * Сохраняется в queryContext и в виджетах дашборда.
 */

export type ReportChartType = 'bar' | 'line' | 'area' | 'pie' | 'stackedBar';

export type ReportChartLegendPosition = 'top' | 'bottom' | 'left' | 'right';

export type ReportChartEncoding = {
  /** Поле категории (ось X / сегменты pie). */
  categoryField: string | null;
  /** Числовое поле меры; null = COUNT строк в группе. */
  valueField: string | null;
  /** Опциональное поле серии (multi-series / stacked). */
  seriesField: string | null;
};

export type ReportChartLegendConfig = {
  show: boolean;
  position: ReportChartLegendPosition;
};

export type ReportChartAxisConfig = {
  xTitle: string;
  yTitle: string;
  showGrid: boolean;
  rotateXLabels: boolean;
};

export type ReportChartTooltipConfig = {
  show: boolean;
  showPercent: boolean;
};

export type ReportChartSpec = {
  type: ReportChartType;
  encoding: ReportChartEncoding;
  legend: ReportChartLegendConfig;
  axes: ReportChartAxisConfig;
  tooltip: ReportChartTooltipConfig;
  /** Ограничение категорий после агрегации (0 = без лимита). */
  topN: number;
};

export const DEFAULT_CHART_SPEC: ReportChartSpec = {
  type: 'bar',
  encoding: {
    categoryField: null,
    valueField: null,
    seriesField: null,
  },
  legend: {
    show: true,
    position: 'top',
  },
  axes: {
    xTitle: '',
    yTitle: '',
    showGrid: true,
    rotateXLabels: true,
  },
  tooltip: {
    show: true,
    showPercent: true,
  },
  topN: 20,
};

export function createDefaultChartSpec(
  partial?: Partial<ReportChartSpec> & {
    encoding?: Partial<ReportChartEncoding>;
    legend?: Partial<ReportChartLegendConfig>;
    axes?: Partial<ReportChartAxisConfig>;
    tooltip?: Partial<ReportChartTooltipConfig>;
  },
): ReportChartSpec {
  return {
    ...DEFAULT_CHART_SPEC,
    ...partial,
    encoding: { ...DEFAULT_CHART_SPEC.encoding, ...partial?.encoding },
    legend: { ...DEFAULT_CHART_SPEC.legend, ...partial?.legend },
    axes: { ...DEFAULT_CHART_SPEC.axes, ...partial?.axes },
    tooltip: { ...DEFAULT_CHART_SPEC.tooltip, ...partial?.tooltip },
  };
}

export function isReportChartType(value: unknown): value is ReportChartType {
  return (
    value === 'bar' ||
    value === 'line' ||
    value === 'area' ||
    value === 'pie' ||
    value === 'stackedBar'
  );
}

/** Миграция старых viewMode и неполных объектов из localStorage. */
export function normalizeChartSpec(raw: unknown): ReportChartSpec {
  if (!raw || typeof raw !== 'object') {
    return createDefaultChartSpec();
  }
  const obj = raw as Record<string, unknown>;
  const encoding =
    obj.encoding && typeof obj.encoding === 'object'
      ? (obj.encoding as Partial<ReportChartEncoding>)
      : {};
  const legend =
    obj.legend && typeof obj.legend === 'object'
      ? (obj.legend as Partial<ReportChartLegendConfig>)
      : {};
  const axes =
    obj.axes && typeof obj.axes === 'object' ? (obj.axes as Partial<ReportChartAxisConfig>) : {};
  const tooltip =
    obj.tooltip && typeof obj.tooltip === 'object'
      ? (obj.tooltip as Partial<ReportChartTooltipConfig>)
      : {};

  return createDefaultChartSpec({
    type: isReportChartType(obj.type) ? obj.type : 'bar',
    encoding: {
      categoryField:
        typeof encoding.categoryField === 'string' ? encoding.categoryField : null,
      valueField: typeof encoding.valueField === 'string' ? encoding.valueField : null,
      seriesField: typeof encoding.seriesField === 'string' ? encoding.seriesField : null,
    },
    legend: {
      show: typeof legend.show === 'boolean' ? legend.show : true,
      position:
        legend.position === 'top' ||
        legend.position === 'bottom' ||
        legend.position === 'left' ||
        legend.position === 'right'
          ? legend.position
          : 'top',
    },
    axes: {
      xTitle: typeof axes.xTitle === 'string' ? axes.xTitle : '',
      yTitle: typeof axes.yTitle === 'string' ? axes.yTitle : '',
      showGrid: typeof axes.showGrid === 'boolean' ? axes.showGrid : true,
      rotateXLabels: typeof axes.rotateXLabels === 'boolean' ? axes.rotateXLabels : true,
    },
    tooltip: {
      show: typeof tooltip.show === 'boolean' ? tooltip.show : true,
      showPercent: typeof tooltip.showPercent === 'boolean' ? tooltip.showPercent : true,
    },
    topN: typeof obj.topN === 'number' && obj.topN >= 0 ? Math.floor(obj.topN) : 20,
  });
}
