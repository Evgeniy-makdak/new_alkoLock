import type { IDeviceAction, IEvents } from '@shared/types/BaseQueryTypes';

export const findEarliestEvent = (events: IEvents) => {
  if (!events || events.length === 0) {
    return null;
  }

  // const getOccurredAt = (deviceAction: IDeviceAction) => {
  //   console.log(deviceAction.occurredAt);
  //   return deviceAction.occurredAt;
  // };

  const earliestEvent = events.length > 3 ? events[3] : events[0];
  // let earliestTime = new Date(earliestEvent.occurredAt);

  // events.forEach((event) => {
  //   const eventTime = new Date(event.occurredAt);
  //   // if (eventTime < earliestTime) {
  //     // earliestTime = eventTime;
  //     earliestEvent = event;
  //   // }
  // });

  return earliestEvent;
};

export const getLastEvent = (event: IDeviceAction) => {
  const lastEvent = findEarliestEvent(event?.events);

  if (lastEvent) {
    const acceptedRequest = event.events.some((e) => e.eventType.toString() === 'Заявка принята');
    const rejectedRequest = event.events.some((e) => e.eventType.toString() === 'Заявка отклонена');

    if (acceptedRequest) return 'Заявка принята';
    if (rejectedRequest) return 'Заявка отклонена';

    const eventType = lastEvent.eventType as string;
    return eventType;
  }

  return null;
};
