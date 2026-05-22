import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import dayjs, { type Dayjs } from 'dayjs';

import { Box, TextField, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';

import {
  combineDateAndTimeToIso,
  formatDateTimeDisplay,
  parseStoredDateTimeValue,
} from '@pages/reports/lib/formatReportDateTimeFilterValue';
import {
  formatReportTimeInput,
  isCompleteReportTime,
} from '@pages/reports/lib/formatReportTimeInput';
import { isReportDateTimeBetweenOperation } from '@pages/reports/lib/mapReportQueryOperator';
import { InputDate } from '@shared/ui/input_date/InputDate';
import type { Values } from '@shared/ui/search_multiple_select';

import pageStyles from './Reports.module.scss';

const dateFieldSlotProps = {
  textField: {
    size: 'small' as const,
    fullWidth: false,
    sx: { width: 182, minWidth: 182, maxWidth: 182 },
  },
};

const timeFieldSx = {
  width: 84,
  minWidth: 84,
  maxWidth: 84,
  flex: '0 0 84px',
};

type ReportDateTimeFilterFieldProps = {
  value: Values;
  onChange: (values: Values) => void;
  operationCode?: string | null;
};

type DateTimePairProps = {
  dateLabel: string;
  storedRaw: unknown;
  onCommit: (iso: string | null) => void;
};

function DateTimePair({ dateLabel, storedRaw, onCommit }: DateTimePairProps) {
  const { t } = useTranslation();
  const theme = useTheme();

  const storedKey = storedRaw == null || storedRaw === '' ? '' : String(storedRaw);

  const parsed = useMemo(
    () => (storedKey ? parseStoredDateTimeValue(storedRaw as string | number) : null),
    [storedKey, storedRaw],
  );

  const [datePart, setDatePart] = useState<Dayjs | null>(parsed?.date ?? null);
  const [timePart, setTimePart] = useState(parsed?.time ?? '');

  useEffect(() => {
    if (!storedKey) {
      setDatePart(null);
      setTimePart('');
      return;
    }
    if (parsed) {
      setDatePart(parsed.date);
      setTimePart(parsed.time);
    }
  }, [storedKey, parsed]);

  const commit = (date: Dayjs | null, time: string) => {
    if (!date || !isCompleteReportTime(time)) {
      onCommit(null);
      return;
    }
    const iso = combineDateAndTimeToIso(date, time);
    onCommit(iso);
  };

  const timeInvalid = timePart.length > 0 && !isCompleteReportTime(timePart);

  return (
    <Box className={pageStyles.reportFilterDateTimePairFields}>
      <Box className={pageStyles.reportFilterDateField}>
        <InputDate
          label={dateLabel}
          value={datePart}
          onChange={(next) => {
            const date = next ?? null;
            setDatePart(date);
            commit(date, timePart);
          }}
          slotProps={dateFieldSlotProps}
          theme={theme}
        />
      </Box>
      <TextField
        className={pageStyles.reportFilterTimeField}
        label={t('reports.timeOfDayLabel')}
        value={timePart}
        placeholder={t('reports.timePlaceholder')}
        error={timeInvalid}
        helperText={timeInvalid ? t('reports.timeFormatError') : undefined}
        inputProps={{ maxLength: 5, inputMode: 'numeric' }}
        size="small"
        sx={timeFieldSx}
        onChange={(e) => {
          const formatted = formatReportTimeInput(e.target.value);
          setTimePart(formatted);
          commit(datePart, formatted);
        }}
      />
    </Box>
  );
}

export function ReportDateTimeFilterField({
  value,
  onChange,
  operationCode,
}: ReportDateTimeFilterFieldProps) {
  const { t } = useTranslation();
  const isRange = isReportDateTimeBetweenOperation(operationCode);

  const commitAt = (index: number, iso: string | null) => {
    const next: Values = [...value];
    if (iso) {
      next[index] = { value: iso, label: formatDateTimeDisplay(dayjs(iso)) };
    } else {
      next.splice(index, 1);
    }
    onChange(next);
  };

  if (isRange) {
    return (
      <Box className={pageStyles.reportFilterDateTimeRootRange}>
        <DateTimePair
          dateLabel={t('reports.dateRangeStartDate')}
          storedRaw={value[0]?.value}
          onCommit={(iso) => commitAt(0, iso)}
        />
        <Typography
          component="span"
          className={pageStyles.reportFilterDateTimeRangeSep}
          color="text.secondary">
          —
        </Typography>
        <DateTimePair
          dateLabel={t('reports.dateRangeEndDate')}
          storedRaw={value[1]?.value}
          onCommit={(iso) => commitAt(1, iso)}
        />
      </Box>
    );
  }

  return (
    <Box className={pageStyles.reportFilterDateTimeRoot}>
      <DateTimePair
        dateLabel={t('tables.date')}
        storedRaw={value[0]?.value}
        onCommit={(iso) =>
          onChange(iso ? [{ value: iso, label: formatDateTimeDisplay(dayjs(iso)) }] : [])
        }
      />
    </Box>
  );
}
