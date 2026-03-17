/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { FiPaperclip, FiX } from 'react-icons/fi';
import { RxPaperPlane } from 'react-icons/rx';

import { Button, TextareaAutosize, Tooltip } from '@mui/material';

import { useChat } from '../contexts/ChatContext';
import {
  MAX_FILE_SIZE_MB,
  checkFileSize,
  formatFileSize,
  isAllowedImageType,
  processImageBeforeUpload,
} from '../contexts/ImageUtils';
import styles from './MessageInput.module.scss';

interface MessageInputProps {
  selectedUsers: number[];
  isUsersTouched: boolean;
  onUsersBlur: () => void;
  onMessageSent?: () => void;
  onEndDialog?: () => void;
  isDialogEnded?: boolean;
  clearInput?: boolean;
  onClearComplete?: () => void;
  initialText?: string;
  onTextChange?: (text: string) => void;
  sessionId: string;
  replyTarget?: any;
  onClearReply?: () => void;
  onAttachmentsChange?: (files: File[]) => void;
  attachments?: File[];
  isSendingMessage?: boolean;
  lastSendError?: string | null;
  dialogStatus?: string;
  isDialogBlockedByOtherOperator?: boolean;
}

const MAX_ATTACHMENTS = 5;

function MessageInput({
  selectedUsers,
  onUsersBlur,
  onMessageSent,
  isDialogEnded = false,
  clearInput = false,
  onClearComplete,
  initialText = '',
  onTextChange,
  sessionId,
  replyTarget,
  onClearReply,
  onAttachmentsChange,
  attachments = [],
  isSendingMessage = false,
  lastSendError = null,
  dialogStatus = '',
  isDialogBlockedByOtherOperator = false,
}: MessageInputProps) {
  const { sendMessage } = useChat();
  const [text, setText] = useState(initialText);
  const [compressionInProgress, setCompressionInProgress] = useState(false);
  const textRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (initialText) {
      setText(initialText);
    }
  }, [initialText]);

  useEffect(() => {
    if (clearInput) {
      setText('');
      onClearComplete?.();
    }
  }, [clearInput, onClearComplete]);

  const showBlockedWarning = isDialogBlockedByOtherOperator && dialogStatus === 'CLOSED';

  const canSendMessage = useCallback(() => {
    if (isDialogBlockedByOtherOperator) {
      return false;
    }

    if (dialogStatus !== 'CLOSED') {
      return false;
    }

    if (lastSendError) {
      return false;
    }

    if (selectedUsers.length === 0) {
      return false;
    }

    if (isDialogEnded) {
      return false;
    }

    const textIsEmpty = !text.trim().length;
    const hasAttachments = attachments.length > 0;
    if (textIsEmpty && !hasAttachments) {
      return false;
    }

    if (textIsEmpty && hasAttachments) {
      return false;
    }
    return true;
  }, [
    isDialogBlockedByOtherOperator,
    dialogStatus,
    lastSendError,
    selectedUsers,
    isDialogEnded,
    text,
    attachments,
  ]);

  const onSubmit = useCallback(
    async (e?: React.FormEvent) => {
      e?.preventDefault();

      if (isDialogBlockedByOtherOperator) {
        return;
      }

      if (dialogStatus !== 'CLOSED') {
        alert('Диалог не заблокирован. Нажмите "Забрать" для блокировки диалога.');
        return;
      }

      if (selectedUsers.length === 0) {
        onUsersBlur();
        return;
      }

      if (lastSendError) {
        return;
      }

      const textIsEmpty = !text.trim().length;
      const hasAttachments = attachments.length > 0;

      if (textIsEmpty && !hasAttachments) {
        return;
      }

      if (textIsEmpty && hasAttachments) {
        alert('Нельзя отправить вложения без текста сообщения');
        return;
      }

      const messageData: any = {
        text: text || '',
      };

      if (attachments.length > 0) {
        messageData.attachments = attachments;
      }

      if (replyTarget?.id) {
        messageData.replyTo = replyTarget.id;
      }

      sendMessage(
        sessionId,
        messageData,
        () => {
          setText('');
          onTextChange?.('');
          onMessageSent?.();
          onClearReply?.();
          onAttachmentsChange?.([]);
        },
        (err: any) => {
          console.error('Error sending message:', err);
        },
      );
    },
    [
      isDialogBlockedByOtherOperator,
      dialogStatus,
      text,
      attachments,
      selectedUsers,
      lastSendError,
      sendMessage,
      sessionId,
      replyTarget,
      onUsersBlur,
      onTextChange,
      onMessageSent,
      onClearReply,
      onAttachmentsChange,
    ],
  );

  const onUploadFile: React.ChangeEventHandler<HTMLInputElement> = useCallback(
    async (e) => {
      const files = Array.from(e.target.files || []);
      if (files.length === 0) return;

      if (isDialogBlockedByOtherOperator) {
        e.target.value = '';
        return;
      }

      if (dialogStatus !== 'CLOSED') {
        alert('Диалог не заблокирован. Нажмите "Забрать" для блокировки диалога.');
        e.target.value = '';
        return;
      }

      if (lastSendError) {
        alert('Нельзя прикреплять файлы пока есть ошибка отправки');
        e.target.value = '';
        return;
      }

      const totalFiles = attachments.length + files.length;
      if (totalFiles > MAX_ATTACHMENTS) {
        alert(`Максимальное количество файлов: ${MAX_ATTACHMENTS}`);
        e.target.value = '';
        return;
      }

      const validFiles: File[] = [];
      const invalidFiles: string[] = [];

      for (const file of files) {
        try {
          const isAllowed = isAllowedImageType(file);
          if (!isAllowed) {
            invalidFiles.push(`"${file.name}" - недопустимый формат`);
            continue;
          }

          if (!checkFileSize(file)) {
            const shouldCompress = window.confirm(
              `Файл "${file.name}" (${formatFileSize(file.size)}) превышает максимальный размер ${MAX_FILE_SIZE_MB} МБ.\n\n` +
                'Хотите попробовать сжать изображение?',
            );

            if (shouldCompress) {
              setCompressionInProgress(true);
              try {
                const processedFile = await processImageBeforeUpload(file, {
                  maxSizeMB: MAX_FILE_SIZE_MB,
                  compressIfNeeded: true,
                  maxWidth: 1920,
                  maxHeight: 1080,
                  quality: 0.7,
                });

                if (processedFile) {
                  validFiles.push(processedFile);
                } else {
                  invalidFiles.push(`"${file.name}" - не удалось сжать до нужного размера`);
                }
              } catch (error) {
                console.error('❌ Ошибка сжатия файла:', error);
                invalidFiles.push(`"${file.name}" - ошибка сжатия`);
              } finally {
                setCompressionInProgress(false);
              }
            } else {
              invalidFiles.push(
                `"${file.name}" - превышает максимальный размер ${MAX_FILE_SIZE_MB} МБ`,
              );
            }
          } else {
            validFiles.push(file);
          }
        } catch (error) {
          console.error('❌ Ошибка обработки файла:', file.name, error);
          invalidFiles.push(`"${file.name}" - ошибка обработки`);
        }
      }

      if (invalidFiles.length > 0) {
        alert(
          `Не удалось загрузить ${invalidFiles.length} файл(ов):\n\n` +
            invalidFiles.join('\n') +
            `\n\nРазрешены только изображения (JPG, PNG, BMP) до ${MAX_FILE_SIZE_MB} МБ.`,
        );
      }

      if (validFiles.length === 0) {
        e.target.value = '';
        return;
      }

      const newAttachments = [...attachments, ...validFiles];
      onAttachmentsChange?.(newAttachments);
      e.target.value = '';
    },
    [isDialogBlockedByOtherOperator, dialogStatus, attachments, onAttachmentsChange, lastSendError],
  );

  const removeAttachment = useCallback(
    (index: number) => {
      const newAttachments = attachments.filter((_, i) => i !== index);
      onAttachmentsChange?.(newAttachments);
    },
    [attachments, onAttachmentsChange],
  );

  const onChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newText = e.target.value;
      setText(newText);
      onTextChange?.(newText);
    },
    [onTextChange],
  );

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if ((e.code === 'Enter' || e.code === 'NumpadEnter') && !e.shiftKey) {
        if (isDialogBlockedByOtherOperator || dialogStatus !== 'CLOSED') {
          e.preventDefault();
          return;
        }

        if (!lastSendError) {
          onSubmit();
          e.preventDefault();
        }
      }
    },
    [onSubmit, lastSendError, isDialogBlockedByOtherOperator, dialogStatus],
  );

  const isSendDisabled = !canSendMessage() || isSendingMessage || compressionInProgress;

  const isFileButtonDisabled =
    isDialogBlockedByOtherOperator ||
    dialogStatus !== 'CLOSED' ||
    attachments.length >= MAX_ATTACHMENTS ||
    isDialogEnded ||
    isSendingMessage ||
    !!lastSendError ||
    compressionInProgress;

  const getSendButtonTooltip = () => {
    if (isDialogBlockedByOtherOperator) {
      return 'Диалог заблокирован другим оператором. Отправка сообщений невозможна';
    }
    if (dialogStatus !== 'CLOSED') {
      return 'Нажмите "Забрать" для отправки сообщения';
    }
    if (lastSendError) {
      return 'Исправьте ошибку для отправки';
    }
    if (compressionInProgress) {
      return 'Идет сжатие изображений...';
    }
    if (isSendDisabled) {
      if (!text.trim().length && attachments.length === 0) {
        return 'Введите текст сообщения или прикрепите файл';
      }
      if (isDialogEnded) {
        return 'Диалог завершен';
      }
      if (isSendingMessage) {
        return 'Сообщение отправляется...';
      }
      if (selectedUsers.length === 0) {
        return 'Выберите пользователя';
      }
    }
    return 'Отправить сообщение';
  };

  const getFileButtonTooltip = () => {
    if (compressionInProgress) {
      return 'Сжатие файлов...';
    }
    if (isDialogBlockedByOtherOperator) {
      return 'Диалог заблокирован другим оператором. Прикрепление файлов невозможно';
    }
    if (dialogStatus !== 'CLOSED') {
      return 'Нажмите "Забрать" чтобы начать диалог';
    }
    if (lastSendError) {
      return 'Исправьте ошибку для прикрепления файлов';
    }
    if (isFileButtonDisabled) {
      if (isSendingMessage) {
        return 'Загрузка файлов...';
      }
      if (attachments.length >= MAX_ATTACHMENTS) {
        return `Максимум ${MAX_ATTACHMENTS} файлов`;
      }
    }
    return `Прикрепить файл (макс. ${MAX_FILE_SIZE_MB} МБ каждый)`;
  };

  const getTextareaPlaceholder = () => {
    if (isDialogBlockedByOtherOperator) {
      return 'Отправка сообщений невозможна';
    }
    if (dialogStatus !== 'CLOSED') {
      return 'Нажмите "Забрать" для отправки сообщений';
    }
    if (lastSendError) {
      return 'Исправьте ошибку для отправки';
    }
    if (compressionInProgress) {
      return 'Идет сжатие изображений...';
    }
    if (isDialogEnded) {
      return 'Диалог завершен';
    }
    return 'Написать сообщение...';
  };

  const textareaDisabled =
    isDialogBlockedByOtherOperator ||
    isDialogEnded ||
    isSendingMessage ||
    !!lastSendError ||
    dialogStatus !== 'CLOSED' ||
    compressionInProgress;

  const textareaClassName = `${styles.textarea} ${
    isDialogBlockedByOtherOperator ? styles.textareaBlocked : ''
  } ${compressionInProgress ? styles.textareaDisabled : ''}`;

  return (
    <div className={styles.inputContainer}>
      {replyTarget && (
        <div className={styles.replyHeader}>
          <div className={styles.replyInfo}>
            <div className={styles.replyAuthor}>Ответ на сообщение</div>
            <div className={styles.replyText}>
              {replyTarget.text?.substring(0, 50) || 'Сообщение'}
              {replyTarget.text?.length > 50 ? '...' : ''}
            </div>
          </div>
          <button
            className={styles.closeReply}
            onClick={onClearReply}
            title="Отменить ответ"
            disabled={!!lastSendError || textareaDisabled}>
            <FiX />
          </button>
        </div>
      )}

      {lastSendError && (
        <div
          style={{
            color: 'red',
            fontSize: '12px',
            marginTop: '5px',
            padding: '5px',
            backgroundColor: '#ffe6e6',
            borderRadius: '4px',
          }}>
          ❌ Ошибка отправки: {lastSendError}
        </div>
      )}

      {compressionInProgress && (
        <div
          style={{
            padding: '8px',
            backgroundColor: '#e3f2fd',
            color: '#1565c0',
            borderRadius: '4px',
            marginBottom: '8px',
            fontSize: '0.9em',
          }}>
          ⏳ Сжатие изображений... Пожалуйста, подождите.
        </div>
      )}

      {attachments.length > 0 && (
        <div className={styles.attachmentsPreview}>
          <div className={styles.attachmentsTitle}>
            Прикрепленные файлы ({attachments.length}/{MAX_ATTACHMENTS}):
            <span style={{ fontSize: '0.8em', color: '#777', marginLeft: '8px' }}>
              (макс. {MAX_FILE_SIZE_MB} МБ каждый)
            </span>
          </div>
          <div className={styles.attachmentsList}>
            {attachments.map((file, index) => (
              <div key={index} className={styles.attachmentItem}>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span className={styles.attachmentName}>{file.name}</span>
                  <span className={styles.attachmentSize}>
                    {formatFileSize(file.size)}
                    {file.name.includes('_compressed') && (
                      <span style={{ color: '#388e3c', marginLeft: '4px', fontSize: '0.8em' }}>
                        (сжато)
                      </span>
                    )}
                  </span>
                </div>
                <button
                  className={styles.removeAttachment}
                  onClick={() => removeAttachment(index)}
                  disabled={isSendingMessage || !!lastSendError || textareaDisabled}
                  title="Удалить файл">
                  <FiX />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {showBlockedWarning && (
        <div
          style={{
            color: '#d32f2f',
            fontSize: '12px',
            marginBottom: '8px',
            padding: '6px',
            backgroundColor: '#ffebee',
            borderRadius: '4px',
            borderLeft: '4px solid #d32f2f',
          }}>
          ⚠️ Диалог заблокирован другим оператором. Вы можете только просматривать сообщения.
        </div>
      )}

      <div className={styles.inputRow}>
        <TextareaAutosize
          value={text}
          onChange={onChange}
          minRows={1}
          onKeyDown={onKeyDown}
          placeholder={getTextareaPlaceholder()}
          ref={textRef}
          className={textareaClassName}
          disabled={textareaDisabled}
        />
        <input
          type="file"
          id={`file-upload-${sessionId}`}
          ref={fileInputRef}
          style={{ display: 'none' }}
          onChange={onUploadFile}
          disabled={isFileButtonDisabled}
          multiple
          accept=".jpg,.jpeg,.png,.bmp,image/jpeg,image/png,image/bmp"
        />
        <Tooltip title={getFileButtonTooltip()}>
          <label
            htmlFor={`file-upload-${sessionId}`}
            className={`${styles.fileButton} ${isFileButtonDisabled ? styles.disabled : ''} ${
              isDialogBlockedByOtherOperator ? styles.fileButtonBlocked : ''
            } ${compressionInProgress ? styles.fileButtonDisabled : ''}`}>
            <FiPaperclip />
            {attachments.length > 0 && (
              <span className={styles.fileCounter}>{attachments.length}</span>
            )}
          </label>
        </Tooltip>
        <Tooltip title={getSendButtonTooltip()}>
          <span style={{ display: 'inline-block' }}>
            <Button
              variant="outlined"
              type="submit"
              disabled={isSendDisabled}
              className={styles.submitBtn}
              onClick={onSubmit}
              style={{
                opacity: isSendDisabled ? 0.5 : 1,
                backgroundColor: isDialogBlockedByOtherOperator ? '#ffebee' : 'inherit',
              }}>
              <RxPaperPlane />
            </Button>
          </span>
        </Tooltip>
      </div>
    </div>
  );
}

export default MessageInput;
