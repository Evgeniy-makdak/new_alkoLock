import type { IDeviceAction, IEvents } from '@shared/types/BaseQueryTypes';

export const findEarliestEvent = (events: IEvents) => {
  if (!events || events.length === 0) {
    return null;
  }

  let earliestEvent = events.length > 3 ? events[3] : events[0];
  let earliestTime = new Date(earliestEvent.reportedAt);

  events.forEach((event) => {
    const eventTime = new Date(event.occurredAt);
    if (eventTime < earliestTime) {
      earliestTime = eventTime;
      earliestEvent = event;
    }
  });

  return earliestEvent;
};

export const getLastEvent = (event: IDeviceAction) => {
  const lastEvent = findEarliestEvent(event?.events);

  if (lastEvent) {
    const eventType = lastEvent.eventType as string;
    return eventType === 'Тестирование пройдено' ||
    event?.events.length > 1
      ? 'Тестирование'
      : eventType;
  }

  return null;
};
