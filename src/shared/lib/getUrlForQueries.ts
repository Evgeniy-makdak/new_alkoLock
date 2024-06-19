import type { GridSortDirection } from '@mui/x-data-grid';

import { AppConstants } from '@app/index';
import { SortTypes } from '@shared/config/queryParamsEnums';
import type { EventsOptions, ID } from '@shared/types/BaseQueryTypes';
import type { QueryOptions } from '@shared/types/QueryTypes';
import { DateUtils } from '@shared/utils/DateUtils';
import { Formatters } from '@shared/utils/formatters';

const getSortQuery = (orderType: SortTypes | string, order: GridSortDirection) => {
  const orderStr = ',' + order.toUpperCase();

  switch (orderType) {
    case SortTypes.NAMING:
      return `&sort=name${orderStr}`;
    case SortTypes.SERIAL_NUMBER:
      return `&sort=serialNumber${orderStr}`;
    case SortTypes.TC:
      return `&sort=vehicleBind.vehicle.manufacturer,vehicleBind.vehicle.model,vehicleBind.vehicle.registrationNumber${orderStr}`;
    case SortTypes.USER_LAST_NAME:
      return `&sort=userActionId.middleName${orderStr}`;
    case SortTypes.MARK:
      return `&sort=vehicleRecord.manufacturer${orderStr}`;
    case SortTypes.GOS_NUMBER:
      return `&sort=vehicleRecord.registrationNumber${orderStr}`;
    case SortTypes.TYPE_OF_EVENT:
      return `&sort=type${orderStr}`;
    case SortTypes.WHO_LINK:
      return `&sort=createdBy.firstName${orderStr}`;
    case SortTypes.OPERATING_MODE:
      return `&sort=mode${orderStr}`;
    case SortTypes.DATA_INSTALLATION:
      return `&sort=createdAt${orderStr}`;
    case SortTypes.DATE_CREATE:
      return `&sort=createdAt${orderStr}`;
    case SortTypes.USER:
      return `&sort=surname${orderStr}`;
    case SortTypes.EMAIL:
      return `&sort=email${orderStr}`;
    default:
      return '';
  }
};
// TODO => отрефакторить все квери параметры

// attach
export function getCreateAttachmentApiURL() {
  return 'api/vehicle-driver-allotments';
}
function getSortQueryAttachments(orderType: SortTypes | string, order: GridSortDirection) {
  const orderStr = ',' + order.toUpperCase();

  switch (orderType) {
    case SortTypes.ALCOLOKS:
      return `&sort=vehicle.monitoringDevice.name${orderStr}`;
    case SortTypes.SERIAL_NUMBER:
      return `&sort=vehicle.monitoringDevice.serialNumber${orderStr}`;
    case SortTypes.NAMING:
      return '';
    case SortTypes.TC:
      return `&sort=vehicle.manufacturer,vehicle.model,vehicle.registrationNumber${orderStr}`;
    case SortTypes.DRIVER:
      return `&sort=driver.userAccount.surname,driver.userAccount.firstName${orderStr}`;
    case SortTypes.WHO_LINK:
      return `&sort=createdBy.firstName${orderStr}`;
    case SortTypes.DATE_CREATE:
      return `&sort=createdAt${orderStr}`;
    default:
      return '';
  }
}

export function getAttachmentsDeleteItemURL(id: ID) {
  return `api/vehicle-driver-allotments/${id}`;
}
export function getAttachmentURL({
  endDate,
  limit,
  order,
  page,
  searchQuery,
  sortBy,
  startDate,
  filterOptions,
}: QueryOptions) {
  const queryTrimmed = Formatters.removeExtraSpaces(searchQuery ?? '');
  const drivers = filterOptions?.drivers;
  const tc = filterOptions?.cars;
  const createAttach = filterOptions?.createLink;
  const alcolock = filterOptions?.alcolock;
  const dateLink = filterOptions?.dateLink;
  const branch = filterOptions?.branchId;
  let queries = getSelectBranchQueryUrl({ page: 'vehicle', branchId: branch });

  if (startDate) {
    const date = new Date(startDate).toISOString();
    queries += `&all.createdAt.greaterThanOrEqual=${date}`;
  }

  if (endDate) {
    queries += `&all.createdAt.lessThanOrEqual=${DateUtils.getEndFilterDate(endDate)}`;
  }

  if (sortBy && order) {
    queries += getSortQueryAttachments(sortBy, order);
  }

  if (queryTrimmed.length) {
    queries += `&any.vehicle.monitoringDevice.match.contains=${queryTrimmed}`;
    queries += `&any.vehicle.match.contains=${queryTrimmed}`;
    queries += `&any.driver.userAccount.match.contains=${queryTrimmed}`;
  }

  if (drivers) {
    queries += `&all.driver.userAccount.id.in=${drivers}`;
  }
  if (tc) {
    queries += `&all.vehicle.id.in=${tc}`;
  }
  if (createAttach) {
    queries += `&all.vehicle.userActionId.id.in=${createAttach}`;
  }
  if (alcolock) {
    queries += `&all.vehicle.monitoringDevice.id.in=${alcolock}`;
  }
  if (dateLink) {
    queries += `&all.createdAt.eq=${dateLink}`;
  }
  return `api/vehicle-driver-allotments?page=${page || 0}&size=${limit || 25}${queries}`;
}

/////////////////////////////////////////////===========================branch==========================================

const getSelectBranchQueryUrl = ({
  page,
  parameters,
  branchId,
  notBranch,
}: {
  page?: string;
  parameters?: string;
  branchId?: ID;
  notBranch?: ID;
}) => {
  let branch = '';

  if (branchId && !notBranch) {
    branch = `assignment.branch.id.in=${branchId}`;
  } else if (notBranch) {
    branch = `all.assignment.branch.id.notEquals=${notBranch}`;
  }

  return `${parameters ? parameters : ''}&all.${page ? page + '.' : ''}${branch}`;
};

export function getUrlCountEventsQuery({ filterOptions: { branchId } }: QueryOptions) {
  let query = '?';

  if (branchId) {
    query += `all.device.branchId.in=${branchId}&`;
  }

  query += `all.type.in=SERVICE_MODE_ACTIVATE,SERVICE_MODE_DEACTIVATE&all.seen.in=false&all.status.notIn=INVALID`;

  return `api/device-actions/count${query}`;
}

/////////////////////////////////////////////////////////////////////////UsersApi
export function getUserListURL(
  { page, limit, searchQuery, filterOptions, sortBy, order, startDate, endDate }: QueryOptions,
  widthCars: boolean,
) {
  const branchId = filterOptions?.branchId;
  const notBranchId = filterOptions?.notBranchId;
  const driverSpecified = filterOptions?.driverSpecified;

  const trimmedQuery = Formatters.removeExtraSpaces(searchQuery ?? '');

  let queries = getSelectBranchQueryUrl({
    parameters: driverSpecified ? `&all.driver.id.specified=true` : '',
    branchId,
    notBranch: notBranchId,
  });

  if (startDate) {
    const date = new Date(startDate).toISOString();
    queries += `&all.createdAt.greaterThanOrEqual=${date}`;
  }

  if (endDate) {
    queries += `&all.createdAt.lessThanOrEqual=${DateUtils.getEndFilterDate(endDate)}`;
  }

  if (trimmedQuery) {
    queries += `&any.match.contains=${trimmedQuery}`;
    queries += `&any.email.contains=${trimmedQuery}`;
  }

  if (sortBy && order) {
    queries += getSortQuery(sortBy, order);
  }

  if (widthCars) {
    queries += `&all.driver.vehicleAllotments.include=true`;
  }

  return `api/users?page=${page || 0}&size=${limit || 20}${queries}`;
}

/////////////////////////////////////////////////////////CARS API ===================================================

const getSortQueryCar = (orderType: SortTypes | string, order: GridSortDirection) => {
  const orderStr = ',' + order.toUpperCase();

  switch (orderType) {
    case SortTypes.MARK:
      return `&sort=manufacturer${orderStr}`;
    case SortTypes.MODEL:
      return `&sort=model${orderStr}`;
    case SortTypes.VIN:
      return `&sort=vin${orderStr}`;
    case SortTypes.GOS_NUMBER:
      return `&sort=registrationNumber${orderStr}`;
    case SortTypes.YEAR:
      return `&sort=year${orderStr}`;
    case SortTypes.DATE_CREATE:
      return `&sort=createdAt${orderStr}`;
    default:
      return '';
  }
};
export const getMarksCarURL = ({ page, limit, searchQuery }: QueryOptions) => {
  const trimmedQuery = Formatters.removeExtraSpaces(searchQuery ?? '');
  let queries = '&sort=match,ASC';

  if (trimmedQuery) {
    queries += `&match=${trimmedQuery}`;
  }
  return `api/vehicles/manufacturers?page=${page || 0}&size=${limit || 20}${queries}`;
};
export const getCarListURL = ({
  page,
  limit,
  sortBy,
  order,
  searchQuery,
  startDate,
  endDate,
  filterOptions,
}: QueryOptions): string => {
  const branchId = filterOptions && filterOptions?.branchId;
  const notBranchId = filterOptions && filterOptions?.notBranchId;

  const queryTrimmed = Formatters.removeExtraSpaces(searchQuery ?? '');

  let queries = getSelectBranchQueryUrl({ branchId, notBranch: notBranchId });

  if (startDate) {
    const date = new Date(startDate).toISOString();
    queries += `&all.createdAt.greaterThanOrEqual=${date}`;
  }

  if (endDate) {
    queries += `&all.createdAt.lessThanOrEqual=${DateUtils.getEndFilterDate(endDate)}`;
  }

  if (sortBy && order) {
    queries += getSortQueryCar(sortBy, order);
  }

  if (queryTrimmed.length) {
    queries += `&any.match.contains=${queryTrimmed}`;
    // TODO написать более подходящую реализацию формирования query параметров
    // сейчас у каждого запроса (машин или гос номеров) есть специфика по формированию параметров
    // !sortBy && (queries += `&any.vin.contains=${queryTrimmed}`);
  }
  return `api/vehicles?page=${page || 0}&size=${limit || 20}${queries}`;
};

export const getCarSwitchBranchUrl = (options: QueryOptions, isPairSwitch: boolean) => {
  const carId = options?.id;
  const groupId = options?.filterOptions?.branchId;
  return `api/vehicles/${carId}/assign/${groupId}?withDevice=${isPairSwitch}`;
};

////////////////////////////////////// ALCOLOCK API/////////------------------------------------------------------------------------------------

const getSortQueryAlcoloks = (orderType: SortTypes | string, order: GridSortDirection) => {
  const orderStr = ',' + order.toUpperCase();

  switch (orderType) {
    case SortTypes.TC:
      return `&sort=vehicleBind.vehicle.manufacturer,vehicleBind.vehicle.model,vehicleBind.vehicle.registrationNumber${orderStr}`;
    case SortTypes.WHO_LINK:
      return `&sort=createdBy.firstName,createdBy.firstName${orderStr}`;
    case SortTypes.OPERATING_MODE:
      return `&sort=mode${orderStr}`;
    case SortTypes.DATA_INSTALLATION:
      return `&sort=createdAt${orderStr}`;
    case SortTypes.NAMING:
      return `&sort=name${orderStr}`;
    case SortTypes.SERIAL_NUMBER:
      return `&sort=serialNumber${orderStr}`;
    default:
      return '';
  }
};

export function getAlcolocksURL({
  page,
  limit,
  searchQuery,
  startDate,
  endDate,
  order,
  sortBy,
  filterOptions,
}: QueryOptions) {
  const branchId = filterOptions?.branchId;
  const notBranchId = filterOptions?.notBranchId;
  const queryTrimmed = Formatters.removeExtraSpaces(searchQuery ?? '');
  let queries = getSelectBranchQueryUrl({
    branchId: branchId,
    notBranch: notBranchId,
  });

  if (startDate) {
    const date = new Date(startDate).toISOString();
    queries += `&all.createdAt.greaterThanOrEqual=${date}`;
  }

  if (endDate) {
    queries += `&all.createdAt.lessThanOrEqual=${DateUtils.getEndFilterDate(endDate)}`;
  }

  if (sortBy && order) {
    queries += getSortQueryAlcoloks(sortBy, order);
  }

  if (queryTrimmed.length) {
    // queries += `&all.vehicleBind.vehicle.match.contains=${queryTrimmed}`;
    queries += `&all.match.contains=${queryTrimmed}`;
    // queries += `&all.userActionId.match.contains=${queryTrimmed}`;
  }
  return `api/monitoring-devices?page=${page || 0}&size=${limit || 20}${queries}`;
}

export function getAlcolockListURL({
  page,
  limit,
  searchQuery,
  startDate,
  endDate,
  order,
  sortBy,
  filterOptions,
}: QueryOptions) {
  const branchId = filterOptions?.branchId;
  const notBranchId = filterOptions?.notBranchId;

  const queryTrimmed = Formatters.removeExtraSpaces(searchQuery ?? '');

  let queries = getSelectBranchQueryUrl({ branchId, notBranch: notBranchId });

  if (startDate) {
    const date = new Date(startDate).toISOString();
    queries += `&all.createdAt.greaterThanOrEqual=${date}`;
  }

  if (endDate) {
    queries += `&all.createdAt.lessThanOrEqual=${DateUtils.getEndFilterDate(endDate)}`;
  }

  if (sortBy && order) {
    queries += getSortQuery(sortBy, order);
  }

  if (queryTrimmed.length) {
    // queries += `&all.vehicleBind.vehicle.match.contains=${queryTrimmed}`;
    queries += `&all.match.contains=${queryTrimmed}`;
    // queries += `&all.userActionId.match.contains=${queryTrimmed}`;
  }

  return `api/monitoring-devices?page=${page}&size=${limit}${queries}`;
}

export function getAlkolockURL(id: ID) {
  return `api/monitoring-devices/${id}`;
}

export function getCreateAlkolocksURL() {
  return `api/monitoring-devices`;
}

////////////////////////////////==============================================EVENTS API

export const getEventsTypeUrl = () => {
  return `api/v1/front-data/event-types`;
};

function getSortQueryEvents(orderType: SortTypes | string, order: GridSortDirection) {
  const orderStr = ',' + order.toUpperCase();

  switch (orderType) {
    case SortTypes.NAMING:
      return `&sort=name${orderStr}`;
    case SortTypes.SERIAL_NUMBER:
      return `&sort=device.serialNumber${orderStr}`;
    case SortTypes.MARK:
      return `&sort=vehicleRecord.manufacturer${orderStr}`;
    case SortTypes.GOS_NUMBER:
      return `&sort=vehicleRecord.registrationNumber${orderStr}`;
    case SortTypes.TYPE_OF_EVENT:
      return `&sort=type${orderStr}`;
    case SortTypes.WHO_LINK:
      return `&sort=createdBy.firstName,createdBy.firstName${orderStr}`;
    case SortTypes.OPERATING_MODE:
      return `&sort=mode${orderStr}`;
    case SortTypes.DATA_INSTALLATION:
      return `&sort=createdAt${orderStr}`;
    case SortTypes.DATE_CREATE:
      return `&sort=createdAt${orderStr}`;
    case SortTypes.DATE_OCCURRENT:
      return `&sort=occurredAt${orderStr}`;
    case SortTypes.CREATED_BY:
      return `&sort=userActionId.surname${orderStr}`;
    default:
      return '';
  }
}
const EVENTS_TYPES_BLACKLIST = ['SERVICE_MODE_ACTIVATE', 'SERVICE_MODE_DEACTIVATE'];

// TODO => написать общую функцию по формированию query параметров
export function getEventsHistoryURL({
  alcolockId,
  carId,
  userId,
  page,
  limit,
  order,
  sortBy,
  filterOptions,
}: EventsOptions) {
  const branchId = filterOptions?.branchId;
  let queries = getSelectBranchQueryUrl({
    branchId,
  });

  if (userId) {
    queries += `&all.userActionId.id.in=${userId}`;
  }

  if (carId) {
    queries += `&all.vehicle.id.in=${carId}`;
  }

  if (alcolockId) {
    queries += `&all.device.id.in=${alcolockId}`;
  }

  if (sortBy || order) {
    // Значения по умолчанию для сортировки
    const sortByDefault = 'title'; // Укажите значение по умолчанию для поля сортировки
    const orderDefault = 'asc'; // Укажите значение по умолчанию для порядка сортировки

    // Использование значений по умолчанию, если sortBy и order не определены
    const sortByFinal = sortBy || sortByDefault;
    const orderFinal = order || orderDefault;

    // Генерация строки запроса с сортировкой
    queries += getSortQueryEvents(sortByFinal, orderFinal);
  }

  return `api/device-actions?page=${page || 0}&size=${limit || 50}${queries}`;
}
export function getEventsApiURL({
  page,
  limit,
  searchQuery,
  startDate,
  endDate,
  order,
  sortBy,
  filterOptions,
}: QueryOptions) {
  const queryTrimmed = Formatters.removeExtraSpaces(searchQuery ?? '');
  const blacklistEventsTypes = EVENTS_TYPES_BLACKLIST.join(',');
  const branchId = filterOptions?.branchId;
  let queries = getSelectBranchQueryUrl({
    parameters: `&all.type.notIn=${blacklistEventsTypes}`,
    page: 'device',
    branchId,
  });

  const users = filterOptions?.users;
  const carsByMake = filterOptions?.carsByMake;
  const carsByLicense = filterOptions?.carsByLicense;
  const eventsByType = filterOptions?.eventsByType;

  if (startDate) {
    const date = new Date(startDate).toISOString();
    queries += `&all.occurredAt.greaterThanOrEqual=${date}`;
  }

  if (endDate) {
    queries += `&all.occurredAt.lessThanOrEqual=${DateUtils.getEndFilterDate(endDate)}`;
  }

  if (sortBy || order) {
    // Значения по умолчанию для сортировки
    const sortByDefault = 'name'; // Укажите значение по умолчанию для поля сортировки
    const orderDefault = 'asc'; // Укажите значение по умолчанию для порядка сортировки

    // Использование значений по умолчанию, если sortBy и order не определены
    const sortByFinal = sortBy || sortByDefault;
    const orderFinal = order || orderDefault;

    // Генерация строки запроса с сортировкой
    queries += getSortQueryEvents(sortByFinal, orderFinal);
  }
  if (queryTrimmed.length) {
    queries += `&all.userActionId.match.contains=${queryTrimmed}`;
    queries += `&all.vehicleRecord.match.contains=${queryTrimmed}`;
  }

  if (users) {
    queries += `&all.userActionId.id.in=${filterOptions.users}`;
  }

  if (carsByMake) {
    queries += `&all.vehicleRecord.manufacturer.in=${filterOptions.carsByMake}`;
  }

  if (carsByLicense) {
    queries += `&all.vehicleRecord.registrationNumber.in=${filterOptions.carsByLicense}`;
  }

  if (eventsByType && eventsByType.length > 0) {
    const testTypeEvent = [
      eventsByType.find((elem) => elem.value === AppConstants.EVENT_TYPES.sobrietyTest),
    ];
    if (testTypeEvent.length === 1) {
      const items = Formatters.getStringForQueryParams(testTypeEvent);
      if (items) {
        // Проверка на наличие значений
        queries += `&all.type.in=${items}`;
      }
    }

    const otherEvents = eventsByType.filter(
      (elem) => elem.value !== AppConstants.EVENT_TYPES.sobrietyTest,
    );
    const items = Formatters.getStringForQueryParams(otherEvents);
    if (items.length > 0) {
      // Проверка на наличие значений
      queries += `&all.events.eventType.in=${items}`;
    }
  }

  return `api/device-actions?page=${page || 0}&size=${limit || 20}${queries}`;
}

export function getEventListForAutoServiceURL({
  page,
  limit,
  searchQuery,
  startDate,
  endDate,
  order,
  sortBy,
  filterOptions,
}: QueryOptions) {
  const queryTrimmed = Formatters.removeExtraSpaces(searchQuery ?? '');
  const branchId = filterOptions?.branchId;
  let queries = getSelectBranchQueryUrl({
    parameters:
      '&all.type.in=SERVICE_MODE_ACTIVATE,SERVICE_MODE_DEACTIVATE&all.seen.in=false&all.status.notIn=INVALID',
    branchId,
    page: 'device',
  });
  if (startDate) {
    const date = new Date(startDate).toISOString();
    queries += `&all.occurredAt.greaterThanOrEqual=${date}`;
  }

  if (endDate) {
    queries += `&all.occurredAt.lessThanOrEqual=${DateUtils.getEndFilterDate(endDate)}`;
  }

  if (sortBy || order) {
    // Значения по умолчанию для сортировки
    const sortByDefault = 'name'; // Укажите значение по умолчанию для поля сортировки
    const orderDefault = 'asc'; // Укажите значение по умолчанию для порядка сортировки

    // Использование значений по умолчанию, если sortBy и order не определены
    const sortByFinal = sortBy || sortByDefault;
    const orderFinal = order || orderDefault;

    // Генерация строки запроса с сортировкой
    queries += getSortQueryEvents(sortByFinal, orderFinal);
  }

  if (queryTrimmed.length) {
    queries += `&all.device.serialNumber.contains=${queryTrimmed}`;
    queries += `&all.userActionId.match.contains=${queryTrimmed}`;
    queries += `&all.vehicleRecord.match.contains=${queryTrimmed}`;
  }
  return `api/device-actions?page=${page || 0}&size=${limit || 20}${queries}`;
}

export function getEventListCountForAutoServiceURL({
  page,
  limit,
  searchQuery,
  startDate,
  endDate,
  order,
  sortBy,
  filterOptions,
}: QueryOptions) {
  const queryTrimmed = Formatters.removeExtraSpaces(searchQuery ?? '');
  const branchId = filterOptions?.branchId;
  let queries = '';

  if (branchId) {
    queries += `?all.device.branchId.in=${branchId}`;
  }

  queries += getSelectBranchQueryUrl({
    parameters:
      '&all.type.in=SERVICE_MODE_ACTIVATE,SERVICE_MODE_DEACTIVATE&all.seen.in=false&all.status.notIn=INVALID&',
    branchId,
    page: 'device',
  });

  if (startDate) {
    const date = new Date(startDate).toISOString();
    queries += `&all.occurredAt.greaterThanOrEqual=${date}`;
  }

  if (endDate) {
    queries += `&all.occurredAt.lessThanOrEqual=${DateUtils.getEndFilterDate(endDate)}`;
  }

  if (sortBy || order) {
    // Значения по умолчанию для сортировки
    const sortByDefault = 'name'; // Укажите значение по умолчанию для поля сортировки
    const orderDefault = 'asc'; // Укажите значение по умолчанию для порядка сортировки

    // Использование значений по умолчанию, если sortBy и order не определены
    const sortByFinal = sortBy || sortByDefault;
    const orderFinal = order || orderDefault;

    // Генерация строки запроса с сортировкой
    queries += getSortQueryEvents(sortByFinal, orderFinal);
  }

  if (queryTrimmed.length) {
    queries += `&all.device.serialNumber.contains=${queryTrimmed}`;
    queries += `&all.userActionId.match.contains=${queryTrimmed}`;
    queries += `&all.vehicleRecord.match.contains=${queryTrimmed}`;
  }

  return `api/device-actions/count?page=${page || 0}&size=${limit || 20}${queries}`;
}

//////////////////////////////////====================================================================BranchAPi

const getBranchSortQuery = (orderType: SortTypes | string, order: GridSortDirection) => {
  const orderStr = ',' + order.toUpperCase();

  switch (orderType) {
    case SortTypes.NAMING:
      return `&sort=name${orderStr}`;
    case SortTypes.WHO_CREATE:
      return `&sort=createdBy.firstName${orderStr}`;
    case SortTypes.DATE_CREATE:
      return `&sort=createdAt${orderStr}`;
    default:
      return '';
  }
};
export const getBranchListUrl = ({
  page,
  limit,
  sortBy,
  order,
  searchQuery,
  startDate,
  endDate,
  filterOptions,
}: QueryOptions) => {
  const queryTrimmed = Formatters.removeExtraSpaces(searchQuery ?? '');
  let queries = '';
  const excludeId = filterOptions && filterOptions?.excludeId ? filterOptions?.excludeId : null;

  if (startDate) {
    const date = new Date(startDate).toISOString();
    queries += `&all.createdAt.greaterThanOrEqual=${date}`;
  }

  if (endDate) {
    queries += `&all.createdAt.lessThanOrEqual=${DateUtils.getEndFilterDate(endDate)}`;
  }

  if (sortBy && order) {
    queries += getBranchSortQuery(sortBy, order);
  }

  if (queryTrimmed.length) {
    queries += `&any.name.contains=${queryTrimmed}`;
  }

  if (excludeId) {
    queries += `&all.id.notIn=${excludeId}, 10`;
  }

  return `api/branch-offices?page=${page}&size=${limit}${queries}`;
};

////////////////////////////////////////================================================================Roles Api

export function getRolesListURL({ searchQuery, sortBy, order, page, limit }: QueryOptions) {
  const queryTrimmed = Formatters.removeExtraSpaces(searchQuery ?? '');
  let queries = '';

  if (sortBy && order) {
    queries += getSortQuery(sortBy, order);
  }

  if (queryTrimmed.length) {
    queries += `&any.name.contains=${queryTrimmed}`;
  }
  return `api/user-groups?page=${page || 0}&size=${limit || 25}${queries}`;
}
