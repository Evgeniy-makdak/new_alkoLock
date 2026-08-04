import dayjs from 'dayjs';

/** Срок, в течение которого исходящее сообщение можно править/удалить (минуты). */
export const OPERATOR_MESSAGE_EDIT_DELETE_WINDOW_MINUTES = 1;

export const MAX_MESSAGE_ATTACHMENTS = 5;

/**
 * Редактирование и удаление доступны только пока сообщение не прочитано:
 * confirmStatus = SENT или DELIVERED (не READ).
 */
export function canEditOrDeleteMessage(message: {
  created_at?: string;
  isDeleted?: boolean;
  confirmStatus?: string | null;
} | null | undefined): boolean {
  if (!message?.created_at || message.isDeleted) return false;

  const status = String(message.confirmStatus ?? '').toUpperCase();
  if (status !== 'SENT' && status !== 'DELIVERED') return false;

  try {
    const minutesDiff = dayjs().diff(dayjs(message.created_at), 'minute');
    return minutesDiff < OPERATOR_MESSAGE_EDIT_DELETE_WINDOW_MINUTES;
  } catch {
    return false;
  }
}

/** Серверный путь/имя файла для pathsToAttaches. */
export function resolveAttachmentPath(item: unknown): string {
  if (typeof item === 'string') return item.trim();
  if (item && typeof item === 'object') {
    const row = item as {
      fileName?: string;
      name?: string;
      id?: string | number;
      path?: string;
    };
    const value = row.fileName || row.name || row.path || (row.id != null ? String(row.id) : '');
    return String(value).trim();
  }
  return '';
}

/** Пути вложений для PUT api/v1/messages (pathsToAttaches). */
export function collectMessageAttachmentPaths(message: any): string[] {
  if (!message) return [];

  const raw =
    message.rawAttaches ||
    message.pathsToAttaches ||
    message.attaches ||
    message.attachments ||
    [];

  if (!Array.isArray(raw)) return [];

  return raw.map(resolveAttachmentPath).filter((path: string) => path.length > 0);
}

/** Черновик вложения в режиме редактирования сообщения. */
export type EditableAttachment = {
  /** Локальный ключ строки в UI. */
  id: string;
  /** Существующий серверный путь (fileName); null — ещё не загружено. */
  path: string | null;
  file?: File;
  name: string;
  url?: string;
  size?: number;
  type?: 'image' | 'file';
};

export function buildEditableAttachmentsFromMessage(message: any): EditableAttachment[] {
  if (!message) return [];

  const processed = Array.isArray(message.attachments) ? message.attachments : [];
  if (processed.length > 0) {
    return processed
      .map((att: any, index: number) => {
        const path = resolveAttachmentPath(att) || resolveAttachmentPath(att?.fileName);
        if (!path && !att?.url && !att?.blob) return null;
        const name = att.name || att.fileName || path || `file-${index}`;
        const extension =
          att.extension ||
          (typeof name === 'string' ? name.split('.').pop()?.toLowerCase() : '') ||
          '';
        const isImage =
          att.type === 'image' ||
          ['jpg', 'jpeg', 'png', 'bmp', 'gif'].includes(String(extension).toLowerCase()) ||
          /\.(jpg|jpeg|png|bmp|gif)$/i.test(String(name));

        return {
          id: `existing-${path || index}-${index}`,
          path: path || null,
          name: String(name),
          url: att.url,
          size: att.size,
          type: (isImage ? 'image' : 'file') as 'image' | 'file',
        } satisfies EditableAttachment;
      })
      .filter(Boolean) as EditableAttachment[];
  }

  const raw =
    message.rawAttaches || message.pathsToAttaches || message.attaches || [];
  if (!Array.isArray(raw)) return [];

  return raw
    .map((item: unknown, index: number) => {
      const path = resolveAttachmentPath(item);
      if (!path) return null;
      const isImage = /\.(jpg|jpeg|png|bmp|gif)$/i.test(path);
      return {
        id: `raw-${path}-${index}`,
        path,
        name: path,
        type: (isImage ? 'image' : 'file') as 'image' | 'file',
      } satisfies EditableAttachment;
    })
    .filter(Boolean) as EditableAttachment[];
}

export function revokeEditableAttachmentPreviews(items: EditableAttachment[]) {
  items.forEach((item) => {
    if (item.file && item.url?.startsWith('blob:')) {
      try {
        URL.revokeObjectURL(item.url);
      } catch {
        /* ignore */
      }
    }
  });
}
