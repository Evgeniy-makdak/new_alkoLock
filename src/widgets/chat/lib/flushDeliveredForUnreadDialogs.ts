import type { UnreadDialog } from '../api/dialogsApi';
import api from '../api';
import { isClosedDialogClaimedByOtherOperator } from './chatOperatorPermissions';

type FlushDeps = {
  sendMessageStatus: (uuid: string, status: 'DELIVERED' | 'READ') => boolean;
  /** Бэк уже подтвердил DELIVERED (единственный надёжный skip). */
  deliveredConfirmedByBackend: Set<string>;
  statusSendingInProgress: Set<string>;
  /** dialogId → timestamp последней попытки flush (throttle). */
  lastAttemptAtByDialog: Map<string, number>;
  /** Параллельные fetch по dialogId. */
  fetchInProgress: Set<string>;
  waitForTransport?: () => Promise<boolean>;
  /** Мин. пауза между попытками по одному диалогу (мс). */
  retryThrottleMs?: number;
};

async function defaultWaitForTransport(): Promise<boolean> {
  return true;
}

function unreadCountOf(dialog: UnreadDialog | Record<string, unknown>): number {
  const rec = dialog as Record<string, unknown>;
  for (const value of [
    rec.countUnMessages,
    rec.countUnreadMess,
    rec.countMessages,
    rec.countUnreadMessages,
    rec.unreadCount,
    rec.unread,
  ]) {
    const n = Number(value);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return 0;
}

function isInboundToOperator(msg: any): boolean {
  const status = String(msg?.messageStatus ?? msg?.message_status ?? '')
    .trim()
    .toUpperCase();
  if (!status) return true;
  return status !== 'TO_USER';
}

function messageConfirmStatus(msg: any): string {
  return String(msg?.confirmStatus ?? msg?.confirm_status ?? '')
    .trim()
    .toUpperCase();
}

function messageUuid(msg: any): string | null {
  const raw = msg?.uuid ?? msg?.uuidMessage ?? msg?.messageUuid;
  if (raw == null || String(raw).trim() === '') return null;
  return String(raw);
}

/**
 * После логина бейдж есть, uuid в сторе нет — подтянуть страницу и слать DELIVERED.
 * Не трогает session.messages, UI, READ, счётчики.
 *
 * Важно: локальный publish ≠ подтверждение бэка. Пока unread > 0 и бэк не
 * подтвердил DELIVERED — можно повторять (throttle), иначе «до логина» залипает SENT.
 */
export async function flushDeliveredForUnreadDialogs(
  dialogs: UnreadDialog[],
  deps: FlushDeps,
): Promise<void> {
  const {
    sendMessageStatus,
    deliveredConfirmedByBackend,
    statusSendingInProgress,
    lastAttemptAtByDialog,
    fetchInProgress,
    waitForTransport = defaultWaitForTransport,
    retryThrottleMs = 2500,
  } = deps;

  if (!dialogs?.length) return;

  const transportReady = await waitForTransport();
  if (!transportReady) return;

  for (const dialog of dialogs) {
    const dialogId = dialog?.id != null ? String(dialog.id) : '';
    if (!dialogId || dialogId === '0') continue;

    const unreadCount = unreadCountOf(dialog);
    if (unreadCount <= 0) continue;

    if (isClosedDialogClaimedByOtherOperator(dialog)) continue;
    if (fetchInProgress.has(dialogId)) continue;

    const lastAt = lastAttemptAtByDialog.get(dialogId) ?? 0;
    if (Date.now() - lastAt < retryThrottleMs) continue;

    fetchInProgress.add(dialogId);
    lastAttemptAtByDialog.set(dialogId, Date.now());

    try {
      const size = Math.min(Math.max(Number(unreadCount) || 20, 20), 100);
      const page = await api.getFirstPageMessages(dialogId, size, 'createdAt,desc');
      const content = Array.isArray(page?.content) ? page.content : [];

      for (const msg of content) {
        const uuid = messageUuid(msg);
        if (!uuid) continue;
        if (!isInboundToOperator(msg)) continue;

        const confirm = messageConfirmStatus(msg);
        const isReadFlag = Boolean(msg.is_read ?? msg.isRead);
        if (confirm === 'READ' || isReadFlag) continue;
        if (confirm === 'DELIVERED') {
          deliveredConfirmedByBackend.add(uuid);
          continue;
        }
        if (confirm && confirm !== 'SENT') continue;
        if (deliveredConfirmedByBackend.has(uuid)) continue;

        const sendKey = `DELIVERED_${uuid}`;
        if (statusSendingInProgress.has(sendKey)) continue;

        statusSendingInProgress.add(sendKey);
        let ok = sendMessageStatus(uuid, 'DELIVERED');
        if (!ok) {
          await new Promise((r) => window.setTimeout(r, 600));
          ok = sendMessageStatus(uuid, 'DELIVERED');
        }
        // Не пишем optimistic deliveredStatuses: бэк мог отбросить ранний publish
        // сразу после логина; иначе повторный flush больше не шлёт uuid.
        if (!ok) {
          statusSendingInProgress.delete(sendKey);
        } else {
          window.setTimeout(() => {
            statusSendingInProgress.delete(sendKey);
          }, 4000);
        }
      }
    } catch {
      // UI не трогаем; throttle позволит повторить по unread-карте / CONNECTED.
    } finally {
      fetchInProgress.delete(dialogId);
    }
  }
}
