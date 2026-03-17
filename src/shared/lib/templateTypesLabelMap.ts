/**
 * Maps backend template type names (Russian) to i18n translation keys.
 * Add new mappings when backend returns new template types.
 */
export const TEMPLATE_TYPES_LABEL_MAP: Record<string, string> = {
  'Восстановление пароля': 'templateTypes.password_recovery',
  Приглашение: 'templateTypes.invitation',
  'Сброс пароля': 'templateTypes.password_reset',
  'Уведомление о непрочитанном сообщении': 'templateTypes.unread_message',
  'Уведомление о событии': 'templateTypes.event_notification',
  Приветствие: 'templateTypes.welcome',
};
