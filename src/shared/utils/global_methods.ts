import { EventType, type IEvents } from '@shared/types/BaseQueryTypes';

export class SearchMethods {
  static findMostRecentEvent = (events: IEvents) => {
    if (!events || events.length === 0) {
      return null;
    }
// return events?.find((event) => event.eventType === EventType.ACCEPTED)
    let mostRecentEvent = events[0];
    let mostRecentTime = new Date(mostRecentEvent.occurredAt);

    events
      .filter((event) => event.eventType !== EventType.APP_ACKNOWLEDGED)
      .forEach((event) => {
        const eventTime = new Date(event.occurredAt);
        if (eventTime > mostRecentTime) {
          mostRecentTime = eventTime;
          mostRecentEvent = event;
        }
      });

    return mostRecentEvent;
  };

  static findFirstRequestEvent = (events: IEvents) => {
    if (!events || events.length === 0) {
      return null;
    }

    const requestEvent = events.find((event) => event.eventType.includes('Запрос'));
    return requestEvent || null;
  };
}
