/** Данные ТС из строки отчёта (плоская или вложенная в `vehicle`). */
export function extractReportVehicleRecord(row: Record<string, unknown>): Record<string, unknown> {
  const vehicle = row.vehicle;
  if (vehicle != null && typeof vehicle === 'object' && !Array.isArray(vehicle)) {
    return vehicle as Record<string, unknown>;
  }
  return row;
}
