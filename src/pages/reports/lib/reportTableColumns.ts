import type { GridColDef } from '@mui/x-data-grid';

export type ReportTableColumnKey =
  | 'createdAt'
  | 'lastModifiedAt'
  | 'id'
  | 'registrationNumber'
  | 'manufacturer'
  | 'model'
  | 'year'
  | 'vin'
  | 'type'
  | 'color';

/** Порядок и подписи колонок отчёта (русские заголовки, значения как с бэка). */
export const REPORT_TABLE_COLUMN_META: {
  field: ReportTableColumnKey;
  headerName: string;
  isDateTime?: boolean;
}[] = [
  { field: 'createdAt', headerName: 'Создан', isDateTime: true },
  { field: 'lastModifiedAt', headerName: 'Изменён', isDateTime: true },
  { field: 'id', headerName: 'ID' },
  { field: 'registrationNumber', headerName: 'Государственный номер' },
  { field: 'manufacturer', headerName: 'Марка' },
  { field: 'model', headerName: 'Модель' },
  { field: 'year', headerName: 'Год выпуска' },
  { field: 'vin', headerName: 'VIN' },
  { field: 'type', headerName: 'Тип' },
  { field: 'color', headerName: 'Цвет' },
];

export function buildReportTableColumnDefs(): GridColDef[] {
  return REPORT_TABLE_COLUMN_META.map(({ field, headerName }) => ({
    field,
    headerName,
    flex: 1,
    minWidth: 160,
    sortable: false,
  }));
}
