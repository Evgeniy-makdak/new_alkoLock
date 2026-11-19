/**
 * Поле ТС «Тип»/«Цвет» с учётом flattened-пути (vehicle.type / vehicle.color).
 * Вынесено в лёгкий модуль без зависимостей от API/UI.
 */
export function resolveReportVehicleDictionaryAttribute(
  fieldName: string,
): 'type' | 'color' | null {
  const name = (fieldName ?? '').trim();
  if (
    name === 'type' ||
    name.endsWith('.type') ||
    name === 'typeReference.label' ||
    name.endsWith('.typeReference.label') ||
    name === 'type.label' ||
    name.endsWith('.type.label')
  ) {
    return 'type';
  }
  if (
    name === 'color' ||
    name.endsWith('.color') ||
    name === 'colorReference.label' ||
    name.endsWith('.colorReference.label') ||
    name === 'color.label' ||
    name.endsWith('.color.label')
  ) {
    return 'color';
  }
  return null;
}
