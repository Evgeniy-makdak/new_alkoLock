// import { idID } from '@mui/material/locale';
import type { GridSortDirection } from '@mui/x-data-grid';

import { SortTypes } from '@shared/config/queryParamsEnums';
import { type EventsOptions, type ID } from '@shared/types/BaseQueryTypes';
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
      return `&sort=userAction.middleName${orderStr}`;
    case SortTypes.MARK:
      return `&sort=vehicleRecord.manufacturer${orderStr}`;
    case SortTypes.GOS_NUMBER:
      return `&sort=vehicleRecord.registrationNumber${orderStr}`;
    case SortTypes.TYPE_OF_EVENT:
      return `&sort=type${orderStr}`;
    case SortTypes.WHO_LINK:
      return `&sort=vehicleBind.createdBy.surname${orderStr}`;
    case SortTypes.OPERATING_MODE:
      return `&sort=mode${orderStr}`;
    case SortTypes.DATA_INSTALLATION:
      return `&sort=vehicleBind.createdAt${orderStr}`;
    case SortTypes.DATE_CREATE:
      return `&sort=createdAt${orderStr}`;
    case SortTypes.USER:
      return `&sort=surname,firstName,middleName${orderStr}`;
    case SortTypes.USER_ATTACH:
      return `&sort=surname,firstName,middleName${orderStr}&all.disabled.in=false`;
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
      return `&sort=createdBy.surname,createdBy.firstName,createdBy.middleName${orderStr}`;
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
  attachSearchQuery,
}: QueryOptions) {
  const queryTrimmed = Formatters.removeExtraSpaces(searchQuery ?? '');
  const drivers = filterOptions?.drivers;
  const tc = filterOptions?.cars;
  const createAttach = filterOptions?.createLink;
  const alcolock = filterOptions?.alcolock;
  const dateLink = filterOptions?.dateLink;
  const branch = filterOptions?.branchId;
  let queries = getSelectBranchQueryUrl({ page: 'vehicle', branchId: branch });

  // Фильтрация по дате начала и окончания
  if (startDate) {
    const date = new Date(startDate).toISOString();
    queries += '&all.createdAt.greaterThanOrEqual=' + encodeURIComponent(date);
  }

  if (endDate) {
    queries +=
      '&all.createdAt.lessThanOrEqual=' + encodeURIComponent(DateUtils.getEndFilterDate(endDate));
  }

  // Сортировка
  if (sortBy && order) {
    queries += getSortQueryAttachments(sortBy, order);
  }

  // Общий поиск (все параметры)
  if (queryTrimmed.length) {
    queries += `&any.vehicle.monitoringDevice.match.contains=${encodeURIComponent(queryTrimmed)}`;
    queries += `&any.vehicle.match.contains=${encodeURIComponent(queryTrimmed)}`;
    queries += `&any.driver.userAccount.match.contains=${encodeURIComponent(queryTrimmed)}`;
    queries += `&any.createdBy.match.contains=${encodeURIComponent(queryTrimmed)}`;
  }

  // Фильтрация по водителю
  if (drivers && drivers.length > 0) {
    queries += `&all.driver.userAccount.id.in=${drivers}`;
  }

  // Фильтрация по транспортному средству
  if (tc && tc.length > 0) {
    queries += `&all.vehicle.id.in=${tc}`;
  }

  // Фильтрация по создателю привязки (работает отдельно от общего поиска)
  if (createAttach && createAttach.length > 0) {
    queries += `&all.createdBy.id.in=${createAttach}`;
  }

  // Поиск по создателю привязки
  if (attachSearchQuery?.length) {
    queries += `&any.createdBy.match.contains=${encodeURIComponent(attachSearchQuery)}`;
  }

  // Фильтрация по алкозамку
  if (alcolock && alcolock.length > 0) {
    queries += `&all.vehicle.monitoringDevice.id.in=${alcolock}`;
  }

  // Фильтрация по дате привязки
  if (dateLink) {
    queries += `&all.createdAt.id.in=${encodeURIComponent(dateLink)}`;
  }

  return `api/vehicle-driver-allotments?page=${page || 0}&size=${limit || 20}${queries}`;
}

export function getDriverAllotmentsByBranchId({
  limit,
  filterOptions,
  page,
  attachSearchQuery,
}: QueryOptions) {
  const branchId = filterOptions?.branchId;

  if (attachSearchQuery?.length) {
    return `api/vehicle-driver-allotments/users/match?match=${encodeURIComponent(attachSearchQuery)}&branchId=${branchId}&page=${page || 0}&size=${limit || 20}`;
  }

  return `api/vehicle-driver-allotments/list?branchId=${branchId}&page=${page || 0}&size=${limit || 20}`;
}

/////////////////////////////////////////////===========Для сортировки по водителю в Событиях==========================================

const getSelectBranchToQueryUrl = ({
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
    branch = `any.assignment.branch.id.in=${branchId}&any.id.in=2`;
  } else if (notBranch && branchId !== 20) {
    // branch = `all.assignment.branch.id.in=${notBranch}`;
    branch = `any.assignment.branch.id.notIn=${notBranch}&all.id.notIn=2&all.id.notIn=1`;
  } else if (notBranch) {
    branch = `any.assignment.branch.id.notIn=${notBranch}&all.id.notIn=2&all.id.notIn=1&all.isActive.in=true`;
  }

  return `${parameters ? parameters : ''}${page ? page + '.' : ''}${branch}`;
};

export function getUrlCountEventsToQuery({ filterOptions: { branchId } }: QueryOptions) {
  let query = '?';

  if (branchId) {
    query += `branchId=${branchId}`;
  }

  query += `all.type.in=SERVICE_MODE_ACTIVATE,SERVICE_MODE_DEACTIVATE&all.seen.in=false&all.status.notIn=INVALID`;

  return `api/device-events/count${query}`;
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
  } else if (notBranch && branchId !== 20) {
    branch = `assignment.branch.id.notIn=${notBranch}`;
  } else if (notBranch) {
    branch = `assignment.branch.id.notIn=${notBranch}&all.id.notIn=1`;
  }

  return `${parameters ? parameters : ''}&all.${page ? page + '.' : ''}${branch}`;
};

export function getUrlCountEventsQuery({ filterOptions: { branchId } }: QueryOptions) {
  let query = '?';

  if (branchId) {
    query += `all.device.branchId.in=${branchId}`;
  }

  query += `all.type.in=SERVICE_MODE_ACTIVATE,SERVICE_MODE_DEACTIVATE&all.seen.in=false&all.status.notIn=INVALID`;

  return `api/device-events/count${query}`;
}

/////////////////////////////////////////////////////////////////////////UsersApi
export function getUserListURL(
  { page, limit, searchQuery, filterOptions, sortBy, order, startDate, endDate }: QueryOptions,
  widthCars: boolean,
  // excludeDisabledUsers: boolean, // добавляем новый параметр
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
  } else {
    return `api/users?page=${page || 0}&size=${limit || 20}${queries}&sort=surname,firstName,middleName,ASC`;
  }

  if (widthCars) {
    queries += `&all.driver.vehicleAllotments.include=true`;
  }

  // Добавляем параметр excludeDisabledUsers для исключения пользователей с isActive=false
  // if (excludeDisabledUsers && !(sortBy && order)) {
  //   queries += `&all.disabled.in=false&all.disabled.in=true`;
  // }

  return `api/users?page=${page || 0}&size=${limit || 20}${queries}`;
}
//////////////////
export function getUserListURLToAttachments(
  { filterOptions, startDate, endDate, searchQuery, page, limit }: QueryOptions,
  widthCars: boolean,
  excludeDisabledUsers: boolean,
  // excludeSuperAdmin: boolean,
) {
  const branchId = filterOptions?.branchId;
  const notBranchId = filterOptions?.notBranchId;
  const driverSpecified = filterOptions?.driverSpecified;
  // const equalsBranchId = filterOptions?.equalsBranchId; // Этот параметр при false выводит список пользователей из других филиалов.

  const trimmedQuery = Formatters.removeExtraSpaces(searchQuery ?? '');

  let queries = getSelectBranchToQueryUrl({
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

  if (widthCars) {
    queries += `&all.driver.vehicleAllotments.include=true`;
  }

  // Добавляем параметр excludeDisabledUsers для исключения пользователей с isActive=false
  if (excludeDisabledUsers) {
    queries += `&all.disabled.in=false`;
  }

  if (trimmedQuery) {
    // queries += `&any.vin.contains=${queryTrimmed}`;
    queries += `&all.match.contains=${trimmedQuery}`;
  }

  // if (excludeSuperAdmin) {
  //   queries += `&all.id.notIn=1`
  // }

  // queries += `&branch.id.notIn=${branchId}`;

  return `api/users/full-name?page=${page || 0}&size=${limit || 20}&${queries}&sort=surname,firstName,middleName`;
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
export const getMarksCarURL = ({
  searchQuery,
  filterOptions,
  page,
  limit,
}: QueryOptions & { filterOptions?: { branchId?: ID; notBranchId?: ID } }) => {
  const trimmedQuery = Formatters.removeExtraSpaces(searchQuery ?? '');

  const branchId = filterOptions?.branchId;
  if (trimmedQuery) {
    return `api/vehicles/manufacturers?page=${page || 0}&size=${limit || 20}&match=${encodeURIComponent(trimmedQuery)}&branchId=${branchId}`;
  }

  return `api/vehicles/manufacturers?page=${page || 0}&size=${limit || 20}&branchId=${branchId}&match=${trimmedQuery}`;
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
  specified,
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

  if (queryTrimmed) {
    // queries += `&any.vin.contains=${queryTrimmed}`;
    queries += `&all.match.contains=${queryTrimmed}`;
  }

  if (specified !== undefined) {
    queries += `&all.monitoringDevice.vehicleBind.createdAt.specified=${specified}`;
  }

  return `api/vehicles?page=${page || 0}&size=${limit || 20}&sort=manufacturer${queries}`;
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
    queries += `&any.match.contains=${queryTrimmed}`;
  }
  return `api/monitoring-devices?page=${page || 0}&size=${limit || 20}${queries}&sort=name`; // добавить сортировку. относится к Событиям.
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
    queries += `&any.vehicleBind.vehicle.match.contains=${queryTrimmed}`;
    queries += `&any.match.contains=${queryTrimmed}`;
    queries += `&any.lastModifiedBy.match.contains=${queryTrimmed}`;
  }

  return `api/monitoring-devices?page=${page}&size=${limit}${queries}&sort=name`;
}

export function getAlkolockURL(id: ID) {
  return `api/monitoring-devices/${id}`;
}

export function getCreateAlkolocksURL() {
  return `api/monitoring-devices`;
}

////////////////////////////////==============================================EVENTS API

function getSortQueryEvents(orderType: SortTypes | string, order: GridSortDirection) {
  const orderStr = ',' + order.toUpperCase();

  switch (orderType) {
    case SortTypes.NAMING:
      return `&sort=name${orderStr}`;
    case SortTypes.SERIAL_NUMBER:
      return `&sort=device.serialNumber${orderStr}`;
    case SortTypes.TC:
      return `&sort=action.vehicleRecord.manufacturer,action.vehicleRecord.model${orderStr}`;
    case SortTypes.ALCOLOKS:
      return `&sort=action.device.name,action.device.serialNumber,${order.toUpperCase()}`;
    case SortTypes.TYPE_OF_EVENT:
      return `&sort=eventsForFront.label${orderStr}`;
    case SortTypes.WHO_LINK:
      return `&sort=createdBy.assignment.createdBy.firstName${orderStr}`;
    case SortTypes.OPERATING_MODE:
      return `&sort=mode${orderStr}`;
    case SortTypes.DATA_INSTALLATION:
      return `&sort=createdAt${orderStr}`;
    case SortTypes.DATE_CREATE:
      return `&sort=createdAt${orderStr}`;
    case SortTypes.DATE_OCCURRENT:
      return `&sort=timestamp${orderStr}`;
    case SortTypes.CREATED_BY:
      return `&sort=userRecord.surname,userRecord.firstName,userRecord.middleName${orderStr}`;
    default:
      return '';
  }
}
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
    parameters: `&all.eventsForFront.id.notIn=20,21,22,23,24,31`,
  });

  if (userId) {
    queries += `user.id.in=${userId}`;
  }

  if (carId) {
    queries += `action.vehicle.id.in=${carId}`;
  }

  if (alcolockId) {
    queries += `action.device.id.in=${alcolockId}`;
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

  return `api/device-events?page=${page || 0}&size=${limit || 50}${queries}`;
}
// Этот блок отвечает за фильтрацию на вкладке События в выпадающих списках.
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
  const branchId = filterOptions?.branchId;
  let queries = getSelectBranchQueryUrl({
    parameters: `&all.eventsForFront.id.notIn=20,21,22,23,24,25,26,27,29,30,31,32,33`,
    page: 'action.device',
    branchId,
  });

  const users = filterOptions?.users;
  const tc = filterOptions?.cars;
  const alcolock = filterOptions?.alcolock;
  const eventsByType = filterOptions?.eventsByType;
  const eventClasses = filterOptions?.level; 
  if (startDate) {
    const date = new Date(startDate).toISOString();
    queries += `&all.timestamp.greaterThanOrEqual=${date}`;
  }

  if (endDate) {
    queries += `&all.timestamp.lessThanOrEqual=${DateUtils.getEndFilterDate(endDate)}`;
  }

  if (sortBy && order) {
    queries += getSortQueryEvents(sortBy, order);
  }

  if (queryTrimmed.length) {
    queries += `&any.userRecord.match.contains=${queryTrimmed}`;
    queries += `&any.action.vehicleRecord.match.contains=${queryTrimmed}`;
    queries += `&any.action.device.match.contains=${queryTrimmed}`;
  }

  if (users) {
    queries += `&all.user.id.in=${users}`;
  }

  if (tc) {
    queries += `&all.action.vehicle.id.in=${tc}`;
  }

  if (alcolock) {
    queries += `&all.action.device.id.in=${alcolock}`;
  }

  if (eventClasses && eventClasses.length > 0) {
    const eventClassIds = eventClasses.map((event) => event.value).join(',');
    queries += `&all.eventsForFront.levelType.id.in=${eventClassIds}`;
  }  

  if (eventsByType && eventsByType.length > 0) {
    const trimmedQuery = eventsByType.map((event) => event.label);
    const eventQuery = `api/device-events?page=${page || 0}&size=${limit || 20}&all.eventsForFront.label.in=${trimmedQuery}${queries}`;
    return eventQuery;
  }

  const defaultSort = sortBy && order ? '' : '&sort=timestamp,DESC';

  return `api/device-events?page=${page || 0}&size=${limit || 20}${queries}${defaultSort}`;
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
    const sortByDefault = 'name';
    const orderDefault = 'asc';

    // Использование значений по умолчанию, если sortBy и order не определены
    const sortByFinal = sortBy || sortByDefault;
    const orderFinal = order || orderDefault;

    // Генерация строки запроса с сортировкой
    queries += getSortQueryEvents(sortByFinal, orderFinal);
  }

  if (queryTrimmed.length) {
    queries += `&any.device.serialNumber.contains=${queryTrimmed}`;
    queries += `&any.userAction.match.contains=${queryTrimmed}`;
    queries += `&any.vehicleRecord.match.contains=${queryTrimmed}`;
    queries += `&any.userAction.firstName.contains=${queryTrimmed}`;
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
    queries += `&all.userAction.match.contains=${queryTrimmed}`;
    queries += `&any.vehicleRecord.in.contains=${queryTrimmed}`;
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
  page = 0,
  limit = 25,
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
export function getRolesListURL({
  sortBy,
  order,
  page,
  limit,
  filterOptions,
  searchQuery,
}: QueryOptions) {
  const branchId = filterOptions?.branchId;
  const queryTrimmed = Formatters.removeExtraSpaces(searchQuery ?? '');
  let queries = '';

  if (sortBy && order) {
    queries += getSortQuery(sortBy, order);
  }

  if (queryTrimmed.length) {
    queries += `&all.name.contains=${queryTrimmed}`;
  }

  queries += '&any.systemGenerated.in=true';

  if (branchId) {
    queries += `&any.branchOffice.id.in=${branchId}`;
  }

  return `api/user-groups?page=${page || 0}&size=${limit || 25}${queries}&sort=name`;
}
