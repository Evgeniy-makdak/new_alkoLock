import type { IDeviceAction, IEvents } from '@shared/types/BaseQueryTypes';

export const findEarliestEvent = (events: IEvents) => {
  if (!events || events.length === 0) {
    return null;
  }

  let earliestEvent;

  if (events.length === 4) {
    earliestEvent = "Тестирование";
  } else if (events.length === 3) {
    earliestEvent = events[2];
  } else {
    earliestEvent = events.length > 3 ? events[3] : events[0];
  }

  return earliestEvent;
};

export const getLastEvent = (event: IDeviceAction) => {
  const lastEvent = findEarliestEvent(event?.events);

  if (lastEvent) {
    const acceptedRequest = event.events.some((e) => e.eventType.toString() === 'Заявка принята');
    const rejectedRequest = event.events.some((e) => e.eventType.toString() === 'Заявка отклонена');

    if (acceptedRequest) return 'Заявка принята';
    if (rejectedRequest) return 'Заявка отклонена';

    const eventType = typeof lastEvent === 'string' ? lastEvent : (lastEvent.eventType as string);
    return eventType;
  }

  return null;
};
