/* eslint-disable @typescript-eslint/no-explicit-any */

export function isNumericServerMessageId(value: unknown): boolean {
  if (value == null || value === '') return false;
  const normalized = String(value).trim();
  return /^\d+$/.test(normalized) && Number(normalized) > 0;
}

export function resolveServerMessageId(message: { id?: unknown } | null | undefined): number | null {
  if (!message || !isNumericServerMessageId(message.id)) return null;
  return Number(String(message.id).trim());
}

export function findChatMessageByKey(messages: any[], messageKey: string): any | undefined {
  return messages.find(
    (msg) => String(msg.id) === String(messageKey) || String(msg.uuid) === String(messageKey),
  );
}
