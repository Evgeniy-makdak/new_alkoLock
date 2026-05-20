export type ReportVehicleFilterAttribute = {
  key: string;
  labelKey: string;
};

/** Параметры ТС для выбора в фильтре отчёта (ключи из ответа api/vehicles). */
export const REPORT_VEHICLE_FILTER_ATTRIBUTES: ReportVehicleFilterAttribute[] = [
  { key: 'registrationNumber', labelKey: 'form.stateNumber' },
  { key: 'manufacturer', labelKey: 'form.make' },
  { key: 'model', labelKey: 'form.model' },
  { key: 'vin', labelKey: 'reports.vehicleVin' },
  { key: 'year', labelKey: 'form.yearOfManufacture' },
  { key: 'color', labelKey: 'form.color' },
  { key: 'type', labelKey: 'form.type' },
  { key: 'id', labelKey: 'reports.vehicleId' },
];
