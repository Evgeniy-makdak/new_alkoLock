import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import {
  Checkbox,
  FormControl,
  FormControlLabel,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material';

import {
  createDefaultChartSpec,
  type ReportChartLegendPosition,
  type ReportChartSpec,
  type ReportChartType,
} from '../types/chartSpec';

type FieldOption = { value: string; label: string };

type Props = {
  spec: ReportChartSpec;
  fieldOptions: FieldOption[];
  onChange: (next: ReportChartSpec) => void;
  disabled?: boolean;
};

const CHART_TYPES: ReportChartType[] = [
  'bar',
  'medianBar',
  'stackedBar',
  'line',
  'area',
  'pie',
  'funnel',
];
const LEGEND_POSITIONS: ReportChartLegendPosition[] = ['top', 'bottom', 'left', 'right'];

export function ReportChartSettingsPanel({
  spec,
  fieldOptions,
  onChange,
  disabled = false,
}: Props) {
  const { t } = useTranslation();

  const typeLabels = useMemo(
    (): Record<ReportChartType, string> => ({
      bar: t('reports.chartTypeBar', { defaultValue: 'Столбцы' }),
      medianBar: t('reports.chartTypeMedianBar', {
        defaultValue: 'Столбцы относительно медианы',
      }),
      stackedBar: t('reports.chartTypeStackedBar', { defaultValue: 'Столбцы (стек)' }),
      line: t('reports.chartTypeLine', { defaultValue: 'Линии' }),
      area: t('reports.chartTypeArea', { defaultValue: 'Площади' }),
      pie: t('reports.chartTypePie', { defaultValue: 'Круговая' }),
      funnel: t('reports.chartTypeFunnel', { defaultValue: 'Воронка' }),
    }),
    [t],
  );

  const patch = (partial: Parameters<typeof createDefaultChartSpec>[0]) => {
    onChange(createDefaultChartSpec({ ...spec, ...partial }));
  };

  return (
    <Stack spacing={1.5} sx={{ minWidth: 0, width: '100%' }}>
      <Typography variant="subtitle2">
        {t('reports.chartSettingsTitle', { defaultValue: 'Настройки графика' })}
      </Typography>

      <FormControl size="small" fullWidth disabled={disabled}>
        <InputLabel id="chart-type-label">
          {t('reports.chartType', { defaultValue: 'Тип графика' })}
        </InputLabel>
        <Select
          labelId="chart-type-label"
          label={t('reports.chartType', { defaultValue: 'Тип графика' })}
          value={spec.type}
          onChange={(e) => patch({ type: e.target.value as ReportChartType })}>
          {CHART_TYPES.map((type) => (
            <MenuItem key={type} value={type}>
              {typeLabels[type]}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <FormControl size="small" fullWidth disabled={disabled}>
        <InputLabel id="chart-category-label">
          {t('reports.chartCategoryField', { defaultValue: 'Категория (X)' })}
        </InputLabel>
        <Select
          labelId="chart-category-label"
          label={t('reports.chartCategoryField', { defaultValue: 'Категория (X)' })}
          value={spec.encoding.categoryField ?? ''}
          onChange={(e) =>
            patch({
              encoding: {
                ...spec.encoding,
                categoryField: e.target.value || null,
              },
            })
          }>
          <MenuItem value="">
            <em>{t('reports.chartAutoField', { defaultValue: 'Авто' })}</em>
          </MenuItem>
          {fieldOptions.map((field) => (
            <MenuItem key={field.value} value={field.value}>
              {field.label}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <FormControl size="small" fullWidth disabled={disabled}>
        <InputLabel id="chart-value-label">
          {t('reports.chartValueField', { defaultValue: 'Значение (Y)' })}
        </InputLabel>
        <Select
          labelId="chart-value-label"
          label={t('reports.chartValueField', { defaultValue: 'Значение (Y)' })}
          value={spec.encoding.valueField ?? ''}
          onChange={(e) =>
            patch({
              encoding: {
                ...spec.encoding,
                valueField: e.target.value || null,
              },
            })
          }>
          <MenuItem value="">
            <em>{t('reports.chartCountRows', { defaultValue: 'Количество строк' })}</em>
          </MenuItem>
          {fieldOptions.map((field) => (
            <MenuItem key={field.value} value={field.value}>
              {field.label}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      {spec.type !== 'pie' &&
      spec.type !== 'funnel' &&
      spec.type !== 'medianBar' ? (
        <FormControl size="small" fullWidth disabled={disabled}>
          <InputLabel id="chart-series-label">
            {t('reports.chartSeriesField', { defaultValue: 'Серия (опционально)' })}
          </InputLabel>
          <Select
            labelId="chart-series-label"
            label={t('reports.chartSeriesField', { defaultValue: 'Серия (опционально)' })}
            value={spec.encoding.seriesField ?? ''}
            onChange={(e) =>
              patch({
                encoding: {
                  ...spec.encoding,
                  seriesField: e.target.value || null,
                },
              })
            }>
            <MenuItem value="">
              <em>{t('reports.chartNoSeries', { defaultValue: 'Без серии' })}</em>
            </MenuItem>
            {fieldOptions.map((field) => (
              <MenuItem key={field.value} value={field.value}>
                {field.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      ) : null}

      <FormControlLabel
        control={
          <Checkbox
            size="small"
            checked={spec.legend.show}
            disabled={disabled}
            onChange={(e) =>
              patch({ legend: { ...spec.legend, show: e.target.checked } })
            }
          />
        }
        label={t('reports.chartLegendShow', { defaultValue: 'Показывать легенду' })}
      />

      {spec.legend.show ? (
        <FormControl size="small" fullWidth disabled={disabled}>
          <InputLabel id="chart-legend-pos-label">
            {t('reports.chartLegendPosition', { defaultValue: 'Позиция легенды' })}
          </InputLabel>
          <Select
            labelId="chart-legend-pos-label"
            label={t('reports.chartLegendPosition', { defaultValue: 'Позиция легенды' })}
            value={spec.legend.position}
            onChange={(e) =>
              patch({
                legend: {
                  ...spec.legend,
                  position: e.target.value as ReportChartLegendPosition,
                },
              })
            }>
            {LEGEND_POSITIONS.map((pos) => (
              <MenuItem key={pos} value={pos}>
                {t(`reports.chartLegend.${pos}`, { defaultValue: pos })}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      ) : null}

      {spec.type !== 'pie' && spec.type !== 'funnel' ? (
        <>
          <TextField
            size="small"
            fullWidth
            disabled={disabled}
            label={t('reports.chartAxisXTitle', { defaultValue: 'Подпись оси X' })}
            value={spec.axes.xTitle}
            onChange={(e) => patch({ axes: { ...spec.axes, xTitle: e.target.value } })}
          />
          <TextField
            size="small"
            fullWidth
            disabled={disabled}
            label={t('reports.chartAxisYTitle', { defaultValue: 'Подпись оси Y' })}
            value={spec.axes.yTitle}
            onChange={(e) => patch({ axes: { ...spec.axes, yTitle: e.target.value } })}
          />
          <FormControlLabel
            control={
              <Checkbox
                size="small"
                checked={spec.axes.showGrid}
                disabled={disabled}
                onChange={(e) =>
                  patch({ axes: { ...spec.axes, showGrid: e.target.checked } })
                }
              />
            }
            label={t('reports.chartShowGrid', { defaultValue: 'Сетка' })}
          />
          <FormControlLabel
            control={
              <Checkbox
                size="small"
                checked={spec.axes.rotateXLabels}
                disabled={disabled}
                onChange={(e) =>
                  patch({ axes: { ...spec.axes, rotateXLabels: e.target.checked } })
                }
              />
            }
            label={t('reports.chartVerticalX', {
              defaultValue: 'Вертикальные подписи оси X',
            })}
          />
        </>
      ) : null}

      <FormControlLabel
        control={
          <Checkbox
            size="small"
            checked={spec.tooltip.show}
            disabled={disabled}
            onChange={(e) =>
              patch({ tooltip: { ...spec.tooltip, show: e.target.checked } })
            }
          />
        }
        label={t('reports.chartTooltipShow', { defaultValue: 'Подсказка при наведении' })}
      />
      {spec.tooltip.show ? (
        <FormControlLabel
          control={
            <Checkbox
              size="small"
              checked={spec.tooltip.showPercent}
              disabled={disabled}
              onChange={(e) =>
                patch({ tooltip: { ...spec.tooltip, showPercent: e.target.checked } })
              }
            />
          }
          label={t('reports.chartTooltipPercent', { defaultValue: 'Показывать %' })}
        />
      ) : null}

      <TextField
        size="small"
        fullWidth
        type="number"
        disabled={disabled}
        label={t('reports.chartTopN', { defaultValue: 'Топ N категорий (0 = все)' })}
        value={spec.topN}
        inputProps={{ min: 0, max: 200 }}
        onChange={(e) => {
          const n = Number(e.target.value);
          patch({ topN: Number.isFinite(n) && n >= 0 ? Math.floor(n) : 0 });
        }}
      />
    </Stack>
  );
}
