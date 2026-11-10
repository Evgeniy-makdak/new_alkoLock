/**
 * На бэке `dashboard.definition` — строка «Описание дашборда», обязательная и не пустая
 * (@NotBlank). Пустое описание отправляем плейсхолдером и при чтении возвращаем как ''.
 */
export const EMPTY_DASHBOARD_DESCRIPTION_PLACEHOLDER = '—';

export function encodeDashboardDescription(description: string | null | undefined): string {
  const text = (description ?? '').trim();
  return text || EMPTY_DASHBOARD_DESCRIPTION_PLACEHOLDER;
}

export function decodeDashboardDescription(definition: string | null | undefined): string {
  const text = (definition ?? '').trim();
  if (!text || text === EMPTY_DASHBOARD_DESCRIPTION_PLACEHOLDER) return '';
  // Прежние версии клиента писали в definition JSON (отчёт/раскладка) — это не описание.
  if (text.startsWith('{') || text.startsWith('[')) {
    try {
      const parsed: unknown = JSON.parse(text);
      if (parsed != null && typeof parsed === 'object') return '';
    } catch {
      // обычный текст, начинающийся со скобки
    }
  }
  return text;
}
