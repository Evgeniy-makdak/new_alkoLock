import { EventType, type IAlcolock, type IDeviceAction } from '@shared/types/BaseQueryTypes';
import { SearchMethods } from '@shared/utils/global_methods';

export const serviceModeInfoMapper = (deviceAction: IDeviceAction, alkolock: IAlcolock) => {
  const action =
    deviceAction ??
    ((alkolock?.activeActions ?? []).length ? (alkolock?.activeActions || [])[0] : null);
  const lastEvent = SearchMethods.findMostRecentEvent(action?.events);
  const requestEvent = SearchMethods.findFirstRequestEvent(action?.events);
// console.log(alkolock?.activeActions);

  return {
    action,
    type: lastEvent?.eventType ?? null,
    duration: action ? (action?.events ?? [])[0]?.extra?.duration ?? null : null,
    requestType: requestEvent?.eventType ?? null,
    isAcknowledged: !!(action?.events ?? []).find(
      (event) => event.eventType === EventType.SERVER_REQUEST,
    ),
  };
};
