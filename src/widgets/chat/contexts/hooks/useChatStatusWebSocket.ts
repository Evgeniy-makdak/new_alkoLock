import { useCallback } from 'react';

import { useSocket } from '../SocketContext';

export const useChatStatusWebSocket = () => {
  const { stompClient } = useSocket();

  const sendStatus = useCallback(
    (uuid: string, status: 'DELIVERED' | 'READ'): boolean => {
      if (!stompClient || !stompClient.connected) {
        console.log(`❌ WebSocket не подключен, статус ${status} не отправлен для ${uuid}`);
        return false;
      }

      const message = { uuidMessage: uuid, status };
      const success = stompClient.publish({
        destination: '/app/chat.delivery.confirm',
        body: JSON.stringify(message),
        headers: { 'content-type': 'application/json' },
      });

      if (success) {
        console.log(`✅ Статус ${status} отправлен через WebSocket для сообщения ${uuid}`);
      } else {
        console.log(`❌ Ошибка отправки статуса ${status} через WebSocket для сообщения ${uuid}`);
      }

      return success;
    },
    [stompClient],
  );

  const requestStatuses = useCallback(
    (messageUUIDs: string[]): boolean => {
      if (!stompClient || !stompClient.connected) {
        console.log('❌ WebSocket не подключен, запрос статусов не отправлен');
        return false;
      }

      const success = stompClient.publish({
        destination: '/app/chat.request.confirm',
        body: JSON.stringify(messageUUIDs),
        headers: { 'content-type': 'application/json' },
      });

      if (success) {
        console.log(`✅ Запрос статусов отправлен через WebSocket для сообщений:`, messageUUIDs);
      } else {
        console.log(`❌ Ошибка отправки запроса статусов через WebSocket`);
      }

      return success;
    },
    [stompClient],
  );

  return {
    sendStatus,
    requestStatuses,
  };
};
