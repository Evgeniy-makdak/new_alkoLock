import { AppConstants } from '@app/index';
import type { IDeviceAction, IEvents } from '@shared/types/BaseQueryTypes';

export const findEarliestEvent = (events: IEvents) => {
  if (!events || events.length === 0) {
    return null;
  }
  let earliestEvent = events[0];
  let earliestTime = new Date(earliestEvent.occurredAt);
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
  return (
    AppConstants.eventTypesList.find((type) => {
      return type.value === lastEvent?.eventType || type.value === event?.type;
    })?.label ?? '-'
  );
};
