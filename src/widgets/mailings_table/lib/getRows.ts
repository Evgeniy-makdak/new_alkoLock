/* eslint-disable react-hooks/exhaustive-deps */
import { useMemo } from 'react';

import type { GridRowsProp } from '@mui/x-data-grid';

import type { IEmailNotificationGroup, IEmailSubscription } from '@shared/types/BaseQueryTypes';

import { ValuesHeader } from './getColumns';

interface UseGetRowsProps {
  data: IEmailNotificationGroup[];
  excludeUserIds?: number[];
}

interface MailingRow {
  id: string;
  emailGroup: IEmailNotificationGroup;
  [ValuesHeader.EMAIL]: string;
  [ValuesHeader.TYPE_OF_EVENT]: string;
  [ValuesHeader.TIME_INTERVAL]: string;
  isActive: boolean;
  _subscriptions: IEmailSubscription[];
  _email: string;
  _isFirstRow: boolean;
  _rowCount: number;
  _rowIndex: number;
  _emailGroupId: string;
  _groupIndex: number;
}

// Функция для удаления дубликатов интервалов
const removeDuplicateIntervals = (subscriptions: IEmailSubscription[]): IEmailSubscription[] => {
  const uniqueIntervals: IEmailSubscription[] = [];
  const seen = new Set();

  subscriptions.forEach((subscription) => {
    const formatTime = (time: string) => {
      if (!time) return '';
      return time.includes(':') ? time.split(':').slice(0, 2).join(':') : time;
    };

    const startTime = formatTime(subscription.startTime);
    const endTime = formatTime(subscription.endTime);
    const key = `${startTime}-${endTime}`;

    if (!seen.has(key)) {
      seen.add(key);
      uniqueIntervals.push(subscription);
    }
  });

  return uniqueIntervals;
};

export const useGetRows = ({ data, excludeUserIds = [] }: UseGetRowsProps): GridRowsProp => {
  const mapData: MailingRow[] = useMemo(() => {
    if (!data) return [];

    return data
      .flatMap((emailGroup, groupIndex): MailingRow[] => {
        if (!emailGroup.subscriptions || emailGroup.subscriptions.length === 0) return [];

        const groupedByEventType: { [key: string]: IEmailSubscription[] } = {};

        emailGroup.subscriptions.forEach((subscription: IEmailSubscription) => {
          const eventTypeLabel =
            subscription.eventType?.label || `Тип события ID: ${subscription.eventType?.id}`;
          if (!groupedByEventType[eventTypeLabel]) {
            groupedByEventType[eventTypeLabel] = [];
          }
          groupedByEventType[eventTypeLabel].push(subscription);
        });

        const sortedEventTypeEntries = Object.entries(groupedByEventType).sort(([a], [b]) =>
          a.localeCompare(b, 'ru', { sensitivity: 'base' }),
        );

        const rowCount = sortedEventTypeEntries.length;

        return sortedEventTypeEntries.map(([eventTypeLabel, subscriptions], index) => {
          const formatTime = (time: string) => {
            if (!time) return '-';
            return time.includes(':') ? time.split(':').slice(0, 2).join(':') : time;
          };

          // Удаляем дубликаты интервалов перед сортировкой
          const uniqueSubscriptions = removeDuplicateIntervals(subscriptions);

          const sortedSubscriptions = [...uniqueSubscriptions].sort((a, b) => {
            const timeA = a.startTime || '';
            const timeB = b.startTime || '';
            return timeA.localeCompare(timeB);
          });

          const timeIntervalsText = sortedSubscriptions
            .map((subscription: IEmailSubscription) => {
              return subscription.startTime && subscription.endTime
                ? `${formatTime(subscription.startTime)} - ${formatTime(subscription.endTime)}`
                : '-';
            })
            .join('; ');

          const rowId = `${emailGroup.email}-${eventTypeLabel}`;

          const row: MailingRow = {
            id: rowId,
            emailGroup: emailGroup,
            [ValuesHeader.EMAIL]: index === 0 ? (emailGroup.email ?? '-') : '',
            [ValuesHeader.TYPE_OF_EVENT]: eventTypeLabel,
            [ValuesHeader.TIME_INTERVAL]: timeIntervalsText,
            isActive: uniqueSubscriptions.some((sub) => sub.isActive),
            _subscriptions: sortedSubscriptions,
            _email: emailGroup.email || '',
            _isFirstRow: index === 0,
            _rowCount: rowCount,
            _rowIndex: index,
            _emailGroupId: emailGroup.email || '',
            _groupIndex: groupIndex,
          };

          return row;
        });
      })
      .filter((row) => row.id !== undefined && row.id !== null);
  }, [data, excludeUserIds]);

  return mapData;
};
