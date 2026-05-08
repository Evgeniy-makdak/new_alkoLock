import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

// import { Lock, LockOpen, TransferWithinAStation } from '@mui/icons-material';
import { Lock, LockOpen } from '@mui/icons-material';
import { Box, Button, Tooltip } from '@mui/material';

import { UsersApi } from '@shared/api/baseQuerys';
import { appStore } from '@shared/model/app_store/AppStore';

import api from '../api';
import { useChat } from '../contexts/ChatContext';

interface DialogActionsProps {
  sessionId: string;
  userId: number;
  dialogId: string;
  hasExistingDialog: boolean;
  onDialogStatusChange?: (status: string) => void;
  dialogData?: any;
  onBlockedStateChange?: (isBlocked: boolean) => void;
  onCompleteButtonActiveChange?: (isActive: boolean) => void;
  showTransferButton?: boolean;
  onTransferClick?: () => void;
  isTransferLoading?: boolean;
}

export const DialogActions: React.FC<DialogActionsProps> = ({
  sessionId,
  userId,
  dialogId,
  hasExistingDialog,
  onDialogStatusChange,
  dialogData,
  onBlockedStateChange,
  onCompleteButtonActiveChange,
  showTransferButton = false,
  onTransferClick,
  isTransferLoading = false,
}) => {
  const { t } = useTranslation();
  const { getSession, updateSession } = useChat();
  const getInitialCurrentUserId = () => {
    const authId = appStore.getState().authId;
    const normalizedId = Number(authId);
    return Number.isFinite(normalizedId) ? normalizedId : null;
  };
  const [isLoading, setIsLoading] = useState(false);
  const [isDialogOwner, setIsDialogOwner] = useState(false);
  const [lastOperatorId, setLastOperatorId] = useState<number | null>(null);
  const [forceCheckOwner, setForceCheckOwner] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<number | null>(getInitialCurrentUserId);
  const [forceShowCompleteButton, setForceShowCompleteButton] = useState(false);
  const [hasDispatcherRole, setHasDispatcherRole] = useState(false);

  const justAssignedRef = useRef(false);
  const assignedDialogIdRef = useRef<string | null>(null);
  const lastValidDialogDataRef = useRef<any>(null);

  const session = getSession(sessionId);
  const dialogStatus = session?.selectedDialog?.status || '';
  const resolvedCompleteDialogId =
    dialogId && String(dialogId) !== '0'
      ? String(dialogId)
      : dialogData?.id && String(dialogData.id) !== '0'
        ? String(dialogData.id)
        : session?.selectedDialog?.id && String(session.selectedDialog.id) !== '0'
          ? String(session.selectedDialog.id)
          : session?.assignedDialogId &&
              String(session.assignedDialogId) !== '' &&
              String(session.assignedDialogId) !== '0' &&
              String(session.assignedDialogId) !== 'assigned'
            ? String(session.assignedDialogId)
            : '';

  useEffect(() => {
    const updateCurrentUserId = () => {
      const authId = appStore.getState().authId;
      const normalizedId = Number(authId);
      setCurrentUserId(Number.isFinite(normalizedId) ? normalizedId : null);
    };

    updateCurrentUserId();

    const unsubscribe = appStore.subscribe(updateCurrentUserId);

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (currentUserId == null) {
      setHasDispatcherRole(false);
      return;
    }
    let cancelled = false;
    UsersApi.getUser(currentUserId)
      .then((response: any) => {
        if (cancelled) return;
        const groups = response?.data?.groupMembership ?? response?.groupMembership ?? [];
        const isDispatcher = Array.isArray(groups)
          ? groups.some((m: any) => Number(m?.group?.id) === 500)
          : false;
        setHasDispatcherRole(isDispatcher);
      })
      .catch(() => {
        if (!cancelled) setHasDispatcherRole(false);
      });
    return () => {
      cancelled = true;
    };
  }, [currentUserId]);

  const checkDialogOwner = useCallback(() => {
    if (currentUserId == null) {
      setLastOperatorId(null);
      setIsDialogOwner(false);
      return;
    }

    if (dialogStatus !== 'CLOSED') {
      setLastOperatorId(null);
      setIsDialogOwner(false);
      return;
    }

    if (justAssignedRef.current && assignedDialogIdRef.current === dialogId) {
      const loId = dialogData?.lastOperator?.id ?? dialogData?.last_operator?.id;
      if (loId != null && Number(loId) === Number(currentUserId)) {
        lastValidDialogDataRef.current = dialogData;
        justAssignedRef.current = false;
      }

      setLastOperatorId(currentUserId);
      setIsDialogOwner(true);
      return;
    }

    const dataToUse = dialogData || lastValidDialogDataRef.current;

    const rootLo = dataToUse?.lastOperator ?? dataToUse?.last_operator;
    if (dataToUse && rootLo) {
      const operatorId = rootLo.id;
      setLastOperatorId(operatorId);
      setIsDialogOwner(Number(operatorId) === Number(currentUserId));

      if (Number(operatorId) === Number(currentUserId)) {
        lastValidDialogDataRef.current = dataToUse;
      }
    } else if (dataToUse) {
      const nestedLo = dataToUse.dialog?.lastOperator ?? dataToUse.dialog?.last_operator;
      if (nestedLo) {
        const operatorId = nestedLo.id;
        setLastOperatorId(operatorId);
        setIsDialogOwner(Number(operatorId) === Number(currentUserId));

        if (Number(operatorId) === Number(currentUserId)) {
          lastValidDialogDataRef.current = dataToUse;
        }
      } else if (dialogStatus === 'CLOSED') {
        fetchDialogDetails();
      } else {
        setLastOperatorId(null);
        setIsDialogOwner(false);
      }
    } else if (dialogStatus === 'CLOSED') {
      fetchDialogDetails();
    } else {
      setLastOperatorId(null);
      setIsDialogOwner(false);
    }
  }, [dialogData, dialogStatus, currentUserId, dialogId]);

  useEffect(() => {
    if (currentUserId !== null) {
      checkDialogOwner();
    }
  }, [checkDialogOwner, currentUserId]);

  useEffect(() => {
    if (forceCheckOwner) {
      const timer = setTimeout(() => {
        checkDialogOwner();
        setForceCheckOwner(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [forceCheckOwner, checkDialogOwner]);

  useEffect(() => {
    if (dialogStatus !== 'CLOSED') {
      setForceShowCompleteButton(false);
    }
  }, [dialogStatus]);

  const fetchDialogDetails = async () => {
    if (!dialogId || dialogId === '0' || currentUserId == null) {
      return;
    }

    try {
      const dialogDetails = await api.getDialogDetails(dialogId);
      const detailsLo = dialogDetails?.lastOperator ?? dialogDetails?.last_operator;
      if (detailsLo) {
        const operatorId = detailsLo.id;
        setLastOperatorId(operatorId);
        setIsDialogOwner(Number(operatorId) === Number(currentUserId));

        if (Number(operatorId) === Number(currentUserId)) {
          lastValidDialogDataRef.current = {
            ...dialogDetails,
            lastOperator: detailsLo,
          };
        }
      } else {
        setLastOperatorId(null);
        setIsDialogOwner(false);
      }
    } catch (error) {
      setLastOperatorId(null);
      setIsDialogOwner(false);
    }
  };

  // const isAssigned = dialogStatus === 'CLOSED' || !!session?.assignedDialogId;

  const handleAssignDialog = async () => {
    if (isLoading || currentUserId == null) {
      return;
    }

    // UX-fix: сразу после "Забрать" показываем "Завершить",
    // даже если внешние апдейты кратковременно задерживаются.
    setForceShowCompleteButton(true);
    setIsLoading(true);
    justAssignedRef.current = true;
    assignedDialogIdRef.current = dialogId;

    setLastOperatorId(currentUserId);
    setIsDialogOwner(true);

    try {
      const response = await api.assignDialog(userId.toString());
      const meName = appStore.getState().fullName;
      const normalizedResponse =
        response && typeof response === 'object'
          ? {
              ...response,
              lastOperator:
                (response as any).lastOperator ??
                (response as any).last_operator ??
                (currentUserId
                  ? {
                      id: currentUserId,
                      ...(meName ? { fullName: meName } : {}),
                    }
                  : undefined),
            }
          : response;

      const session = getSession(sessionId);
      if (session) {
        const normalizedAssignedDialogId =
          normalizedResponse?.id != null ? String(normalizedResponse.id) : String(dialogId);
        assignedDialogIdRef.current = normalizedAssignedDialogId;
        updateSession(sessionId, {
          selectedDialog: normalizedResponse,
          assignedDialogId: normalizedResponse?.id || null,
          hasLoadedDialogs: true,
          lastSendError: null,
          transferRecipientFullName: null,
        });

        lastValidDialogDataRef.current = normalizedResponse;
      }
    } catch (error: any) {
      setForceShowCompleteButton(false);
      justAssignedRef.current = false;

      if (error?.status === 409) {
        try {
          const dialogs = await api.getAllDialogs();
          const userDialog = dialogs?.find(
            (d: any) => d.owner?.id === userId || d.userId === userId,
          );

          if (userDialog) {
            const meName409 = appStore.getState().fullName;
            const ud = userDialog as any;
            const normalized409 = {
              ...ud,
              lastOperator:
                ud.lastOperator ??
                ud.last_operator ??
                (currentUserId
                  ? {
                      id: currentUserId,
                      ...(meName409 ? { fullName: meName409 } : {}),
                    }
                  : undefined),
            };
            updateSession(sessionId, {
              selectedDialog: normalized409,
              assignedDialogId: userDialog.id,
              hasLoadedDialogs: true,
              lastSendError: null,
              transferRecipientFullName: null,
            });

            lastValidDialogDataRef.current = normalized409;
          } else {
            updateSession(sessionId, {
              assignedDialogId: 'assigned',
              lastSendError: null,
              transferRecipientFullName: null,
            });
          }
        } catch (dialogError) {
          updateSession(sessionId, {
            assignedDialogId: 'assigned',
            lastSendError: null,
            transferRecipientFullName: null,
          });
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleCompleteDialog = async () => {
    // Кнопка "Завершить" уже отрисована только при валидном owner-состоянии.
    // Повторные строгие проверки здесь иногда отбрасывали клик в гонках состояния.
    if (isLoading || !resolvedCompleteDialogId || currentUserId == null) return;

    setIsLoading(true);
    try {
      await api.completeDialog(resolvedCompleteDialogId);
      setForceShowCompleteButton(false);
      updateSession(sessionId, {
        assignedDialogId: null,
        lastSendError: null,
        transferRecipientFullName: null,
        selectedDialog: {
          ...session?.selectedDialog,
          status: 'OPEN',
        },
      });

      if (onDialogStatusChange) {
        onDialogStatusChange('OPEN');
      }

      justAssignedRef.current = false;
      lastValidDialogDataRef.current = null;
    } catch (error) {
      console.error('Ошибка разблокировки диалога:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const showClosedDialogButtons = dialogStatus === 'CLOSED';
  const currentUserIdEffective = (() => {
    if (currentUserId != null) return Number(currentUserId);
    const fallbackAuthId = Number(appStore.getState().authId);
    return Number.isFinite(fallbackAuthId) ? fallbackAuthId : null;
  })();
  const dialogDataLoId =
    dialogData?.lastOperator?.id ??
    dialogData?.last_operator?.id ??
    dialogData?.dialog?.lastOperator?.id ??
    dialogData?.dialog?.last_operator?.id;
  const isOwnerByDialogData =
    showClosedDialogButtons &&
    currentUserIdEffective != null &&
    dialogDataLoId != null &&
    Number(dialogDataLoId) === Number(currentUserIdEffective);
  const effectiveIsDialogOwner = isDialogOwner || isOwnerByDialogData;
  const immediateLastOperatorId =
    dialogData?.lastOperator?.id ??
    dialogData?.last_operator?.id ??
    dialogData?.dialog?.lastOperator?.id ??
    dialogData?.dialog?.last_operator?.id;
  const effectiveLastOperatorId = lastOperatorId ?? immediateLastOperatorId;
  const hasForeignOwner =
    currentUserIdEffective != null &&
    effectiveLastOperatorId != null &&
    Number(effectiveLastOperatorId) !== Number(currentUserIdEffective);
  const showManagementButtons =
    showClosedDialogButtons &&
    !!resolvedCompleteDialogId &&
    (effectiveIsDialogOwner || (forceShowCompleteButton && (justAssignedRef.current || !hasForeignOwner)));
  const showDispatcherCompleteButton =
    showClosedDialogButtons &&
    !!resolvedCompleteDialogId &&
    hasDispatcherRole &&
    !showManagementButtons;
  const showBlockedButton = showClosedDialogButtons;
  const hasKnownOwner = effectiveLastOperatorId != null;

  const shouldShowBlockedByOther =
    showClosedDialogButtons &&
    !showManagementButtons &&
    !forceShowCompleteButton &&
    !justAssignedRef.current &&
    (hasForeignOwner || !hasKnownOwner);

  const showAssignButton =
    !showClosedDialogButtons &&
    // Либо есть существующий диалог с подходящим статусом
    ((hasExistingDialog &&
      (dialogStatus === 'OPEN' ||
        dialogStatus === 'ACTIVE' ||
        !dialogStatus ||
        dialogStatus === '')) ||
      // Либо диалога ещё нет (нужно создать новый)
      !hasExistingDialog);
  const showTransferredTakeDisabled =
    !!session?.transferRecipientFullName && !showManagementButtons && !shouldShowBlockedByOther;

  useEffect(() => {
    if (onBlockedStateChange) {
      onBlockedStateChange(shouldShowBlockedByOther || showTransferredTakeDisabled);
    }
  }, [shouldShowBlockedByOther, showTransferredTakeDisabled, onBlockedStateChange]);

  useEffect(() => {
    onCompleteButtonActiveChange?.(showManagementButtons && !isLoading);
  }, [onCompleteButtonActiveChange, showManagementButtons, isLoading]);

  useEffect(() => {
    if (hasForeignOwner && forceShowCompleteButton && !justAssignedRef.current) {
      setForceShowCompleteButton(false);
    }
  }, [hasForeignOwner, forceShowCompleteButton]);

  const showUnlockedMessage =
    hasExistingDialog &&
    dialogStatus !== 'CLOSED' &&
    dialogId !== '0' &&
    !session?.transferRecipientFullName;

  const blockerLo = dialogData?.lastOperator ?? dialogData?.dialog?.lastOperator;
  const blockerNameForTooltip =
    blockerLo?.fullName ||
    [blockerLo?.firstName, blockerLo?.surname].filter(Boolean).join(' ').trim() ||
    '';

  return (
    <Box sx={{ display: 'flex', gap: 1, mt: 1, flexWrap: 'wrap' }}>
      {showAssignButton &&
        !shouldShowBlockedByOther &&
        !showManagementButtons &&
        !(hasForeignOwner && showClosedDialogButtons) &&
        !session?.transferRecipientFullName && (
        <Tooltip title={t('chat.lockDialog')}>
          <span>
            <Button
              variant="outlined"
              size="small"
              startIcon={<Lock />}
              onClick={handleAssignDialog}
              disabled={isLoading}
              sx={{ fontSize: '0.75rem' }}>
              {t('chat.take')}
            </Button>
          </span>
        </Tooltip>
      )}

      {shouldShowBlockedByOther && (
        <Tooltip
          title={
            blockerNameForTooltip
              ? t('chat.dialogLockedByOperatorNamed', { fullName: blockerNameForTooltip })
              : t('chat.dialogLockedByOperator', { id: lastOperatorId })
          }>
          <span>
            <Button
              variant="outlined"
              size="small"
              startIcon={<Lock />}
              disabled
              sx={{ fontSize: '0.75rem' }}>
              {t('chat.take')}
            </Button>
          </span>
        </Tooltip>
      )}

      {showTransferredTakeDisabled && (
        <Tooltip
          title={t('chat.dialogTransferredToOperator', {
            fullName: session?.transferRecipientFullName,
          })}>
          <span>
            <Button
              variant="outlined"
              size="small"
              startIcon={<Lock />}
              disabled
              sx={{ fontSize: '0.75rem' }}>
              {t('chat.take')}
            </Button>
          </span>
        </Tooltip>
      )}

      {showUnlockedMessage && !showAssignButton && (
        <Tooltip title={t('chat.unlockToSendHint')}>
          <span>
            <Button
              variant="outlined"
              size="small"
              startIcon={<LockOpen />}
              disabled
              sx={{
                fontSize: '0.75rem',
                backgroundColor: '#e3f2fd',
                color: '#1976d2',
                borderColor: '#90caf9',
              }}>
              {session?.transferRecipientFullName
                ? t('chat.dialogTransferredToOperator', {
                    fullName: session.transferRecipientFullName,
                  })
                : t('chat.dialogUnlocked')}
            </Button>
          </span>
        </Tooltip>
      )}

      {showManagementButtons && (
        <>
          {showTransferButton ? (
            <Tooltip title={t('chat.transferDialog')}>
              <span>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<LockOpen />}
                  onClick={onTransferClick}
                  disabled={isLoading || isTransferLoading}
                  sx={{ fontSize: '0.75rem' }}>
                  {t('chat.transferDialog')}
                </Button>
              </span>
            </Tooltip>
          ) : (
            <Tooltip title={t('chat.unlockDialog')}>
              <span>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<LockOpen />}
                  onClick={handleCompleteDialog}
                  disabled={isLoading}
                  sx={{ fontSize: '0.75rem' }}>
                  {t('chat.completeDialog')}
                </Button>
              </span>
            </Tooltip>
          )}
        </>
      )}

      {showDispatcherCompleteButton && (
        <Tooltip title={t('chat.unlockDialog')}>
          <span>
            <Button
              variant="outlined"
              size="small"
              startIcon={<LockOpen />}
              onClick={handleCompleteDialog}
              disabled={isLoading}
              sx={{ fontSize: '0.75rem' }}>
              {t('chat.unlockDialog')}
            </Button>
          </span>
        </Tooltip>
      )}
    </Box>
  );
};
