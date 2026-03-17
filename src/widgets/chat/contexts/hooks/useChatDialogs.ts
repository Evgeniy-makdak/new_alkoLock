import { useCallback, useRef } from 'react';

import { UnreadDialog } from '@widgets/chat/api/dialogsApi';

import api from '../../api';

export const useChatDialogs = (
  getSession: (sessionId: string) => any,
  updateSession: (sessionId: string, updates: any) => void,
  setDialogsUnreadCounts?: (
    counts: Map<number, number> | ((prev: Map<number, number>) => Map<number, number>),
  ) => void,
) => {
  const loadingUnreadDialogsRef = useRef<Set<string>>(new Set());
  const loadDialogInProgressRef = useRef<Set<string>>(new Set());
  const dialogLoadingRef = useRef<Map<string, boolean>>(new Map());

  const assignDialog = useCallback(
    async (sessionId: string, userId: number): Promise<any> => {
      try {
        const response = await api.assignDialog(userId.toString());
        updateSession(sessionId, {
          assignedDialogId: response?.id || null,
          selectedDialog: response || null,
          lastSendError: null,
        });

        return response;
      } catch (error: any) {
        console.error('Ошибка блокировки диалога:', error);

        if (error?.status === 409) {
          try {
            const dialogs = await api.getAllDialogs();
            const userDialog = dialogs?.find(
              (d: any) => d.owner?.id === userId || d.userId === userId,
            );

            if (userDialog) {
              updateSession(sessionId, {
                selectedDialog: userDialog,
                assignedDialogId: userDialog.id,
                hasLoadedDialogs: true,
                lastSendError: null,
              });
              return userDialog;
            } else {
              updateSession(sessionId, {
                assignedDialogId: 'assigned',
                lastSendError: null,
              });
              return { id: 'assigned' };
            }
          } catch {
            updateSession(sessionId, {
              assignedDialogId: 'assigned',
              lastSendError: null,
            });
            return { id: 'assigned' };
          }
        }

        throw error;
      }
    },
    [updateSession],
  );

  const loadUnreadDialogsCommon = useCallback(
    async (sessionId: string, force: boolean = false) => {
      const session = getSession(sessionId);
      if (!session || (!force && loadDialogInProgressRef.current.has(sessionId))) return;

      if (!force) loadingUnreadDialogsRef.current.add(sessionId);
      loadDialogInProgressRef.current.add(sessionId);

      updateSession(sessionId, { isLoadingUnreadDialogs: true });

      try {
        const unreadDialogs = await api.getUnreadDialogs();
        updateSession(sessionId, {
          unreadDialogs: unreadDialogs || [],
          isLoadingUnreadDialogs: false,
        });
      } catch {
        updateSession(sessionId, {
          unreadDialogs: [],
          isLoadingUnreadDialogs: false,
        });
      } finally {
        loadingUnreadDialogsRef.current.delete(sessionId);
        loadDialogInProgressRef.current.delete(sessionId);
      }
    },
    [getSession, updateSession],
  );

  const forceLoadUnreadDialogs = useCallback(
    (sessionId: string) => loadUnreadDialogsCommon(sessionId, true),
    [loadUnreadDialogsCommon],
  );

  const loadUnreadDialogs = useCallback(
    (sessionId: string) => loadUnreadDialogsCommon(sessionId, false),
    [loadUnreadDialogsCommon],
  );

  const loadDialogDetails = useCallback(async (dialogId: number): Promise<any> => {
    try {
      return await api.getDialogDetails(dialogId.toString());
    } catch (error) {
      console.error('Ошибка загрузки деталей диалога:', error);
      throw error;
    }
  }, []);

  const openUnreadDialog = useCallback(
    async (sessionId: string, dialog: UnreadDialog) => {
      const session = getSession(sessionId);
      if (!session) return;

      const dialogId = dialog.id.toString();
      if (dialogLoadingRef.current.get(dialogId)) return;

      dialogLoadingRef.current.set(dialogId, true);

      try {
        updateSession(sessionId, (currentSession: any) => {
          let updatedUnread = (currentSession.unreadDialogs || []).filter(
            (d: UnreadDialog) => d.id !== dialog.id,
          );

          const prev = currentSession.selectedDialog;
          if (prev?.id && prev.id !== '0' && prev.id !== dialogId) {
            const prevIdNum = typeof prev.id === 'number' ? prev.id : parseInt(prev.id, 10);
            if (!isNaN(prevIdNum) && setDialogsUnreadCounts) {
              setDialogsUnreadCounts((p) => {
                const next = new Map(p);
                next.set(prevIdNum, 0);
                return next;
              });
            }
            const alreadyInList = updatedUnread.some(
              (d: UnreadDialog) => d.id === prevIdNum || d.id.toString() === prev.id,
            );
            if (!alreadyInList && !isNaN(prevIdNum)) {
              updatedUnread = [
                ...updatedUnread,
                {
                  ...prev,
                  id: prevIdNum,
                  owner: prev.owner || {
                    id: currentSession.selectedUsers?.[0] ?? 0,
                    fullName: currentSession.selectedUserName || prev.client_name || '',
                  },
                  branch: prev.branch || { id: 0, name: '' },
                  status: prev.status || 'OPEN',
                  createdAt: prev.createdAt || new Date().toISOString(),
                  isActive: prev.isActive ?? true,
                } as UnreadDialog,
              ];
            }
          }

          return {
            selectedDialog: {
              id: dialogId,
              client_name: dialog.owner.fullName,
              status: dialog.status,
              ...dialog,
            },
            selectedUsers: [dialog.owner.id],
            selectedUserName: dialog.owner.fullName,
            assignedDialogId: dialogId,
            hasLoadedDialogs: true,
            messages: [] as any[],
            unreadDialogs: updatedUnread,
            pagination: {
              currentPage: 0,
              totalPages: 0,
              totalElements: 0,
              isLoadingMore: false,
              hasMoreMessages: false,
            },
          };
        });
      } catch (error) {
        console.error('Ошибка открытия диалога:', error);
      } finally {
        setTimeout(() => dialogLoadingRef.current.delete(dialogId), 1000);
      }
    },
    [getSession, updateSession, setDialogsUnreadCounts],
  );

  return {
    assignDialog,
    forceLoadUnreadDialogs,
    loadUnreadDialogs,
    loadDialogDetails,
    openUnreadDialog,
    loadingUnreadDialogsRef,
  };
};
