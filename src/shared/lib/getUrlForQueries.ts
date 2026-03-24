import type { GridSortDirection } from '@mui/x-data-grid';

import { SortTypes } from '@shared/config/queryParamsEnums';
import { type EventsOptions, type ID } from '@shared/types/BaseQueryTypes';
import type { HistoryFilterOptions, QueryOptions } from '@shared/types/QueryTypes';
import { DateUtils } from '@shared/utils/DateUtils';
import { Formatters } from '@shared/utils/formatters';

/** «Тестирование прервано» (eventsForFront id 24): коды extra.exhaleErrorCode; */
const INTERRUPTED_SOBERITY_TEST_EXHALE_ERROR_CODES = '1,3,4,5,6,7';

function isOnlyInterruptedSoberityTestEventFilter(eventIds: string[]): boolean {
  return eventIds.length === 1 && eventIds[0] === '24';
}

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
  let queries = getSelectBranchQueryUrl({ page: 'vehicle.assignment', branchId: branch });

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

  const searchOfAdmin = 'администратор';

  if (queryTrimmed.length) {
    if (
      searchOfAdmin.includes(queryTrimmed.toLowerCase()) ||
      queryTrimmed.toLowerCase().includes(searchOfAdmin)
    ) {
      // Условие для "администратор" или частичного совпадения
      queries += `&any.vehicle.monitoringDevice.match.contains=${encodeURIComponent(queryTrimmed)}`;
      queries += `&any.vehicle.match.contains=${encodeURIComponent(queryTrimmed)}`;
      queries += `&any.driver.userAccount.match.contains=${encodeURIComponent(queryTrimmed)}`;
      queries += `&any.createdBy.match.contains=${encodeURIComponent(queryTrimmed)}`;
    } else {
      // Условие для всех остальных запросов
      queries += `&any.vehicle.monitoringDevice.match.contains=${encodeURIComponent(queryTrimmed)}`;
      queries += `&any.vehicle.match.contains=${encodeURIComponent(queryTrimmed)}`;
      queries += `&any.driver.userAccount.match.contains=${encodeURIComponent(queryTrimmed)}`;
      queries += `&any.createdBy.match.contains=${encodeURIComponent(queryTrimmed)}`;

      // Добавляем параметр только если есть дефис в запросе
      if ((queryTrimmed.match(/-/g) || []).length === 1) {
        queries += `&any.vehicle.monitoringDevice.id.specified=false`;
      }
    }
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

  return `api/vehicle-driver-allotments?page=${page || 0}&size=${limit || 20}${queries}&all.isActive.equals=true`;
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
  forChat,
  forMap,
}: {
  page?: string;
  parameters?: string;
  branchId?: ID;
  notBranch?: ID;
  forChat?: boolean;
  forMap?: boolean;
}) => {
  let branch = '';
  ////////
  if (branchId && !notBranch) {
    if (forChat) {
      branch = `any.assignment.branch.id.in=${branchId}&all.id.notIn=2&all.id.notIn=1`; // Для чата
    } else if (forMap) {
      branch = `any.assignment.branch.id.in=${branchId}`; // Для карты: без any.id.in=2, all.id.notIn=2 добавляется отдельно
    } else {
      branch = `any.assignment.branch.id.in=${branchId}&any.id.in=2`; // Для остальных случаев
    }
  } else if (notBranch && branchId !== 20) {
    branch = `any.assignment.branch.id.notIn=${notBranch}&all.id.notIn=2&all.id.notIn=1`;
  } else if (notBranch) {
    branch = `any.assignment.branch.id.notIn=${notBranch}&all.id.notIn=2&all.id.notIn=1&all.isActive.in=true`;
  }

  return `${parameters ? parameters : ''}${page ? page + '.' : ''}${branch}`;
};

const getSelectBranchToQueryUrlToChat = ({
  page,
  parameters,
  branchId,
  notBranch,
}: {
  page?: string;
  parameters?: string;
  branchId?: ID;
  notBranch?: ID;
  forChat?: boolean;
}) => {
  let branch = '';
  ////////
  if (branchId && !notBranch) {
    branch = `any.assignment.branch.id.in=${branchId}&any.id.in=2`;
  } else if (notBranch && branchId !== 20) {
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

const createBranchQueryBuilder = (mode: 'all' | 'any' = 'all') => {
  return ({
    page,
    parameters,
    branchId,
    notBranch,
    useAssignmentPrefix = false,
  }: {
    page?: string;
    parameters?: string;
    branchId?: ID;
    notBranch?: ID;
    userId?: number;
    useAssignmentPrefix?: boolean;
  }) => {
    let branch = '';

    if (branchId && !notBranch) {
      branch = `${useAssignmentPrefix ? 'assignment.' : ''}branch.id.in=${branchId}`;
      if (mode === 'any') {
        branch += '&any.id.in=3';
      }
    } else if (notBranch && branchId !== 20) {
      branch = `assignment.branch.id.notIn=${notBranch}`;
    } else if (notBranch) {
      branch = `assignment.branch.id.notIn=${notBranch}&all.id.notIn=1`;
    }

    const prefix = mode;
    return `${parameters ? parameters : ''}&${prefix}.${page ? page + '.' : ''}${branch}`;
  };
};

// Создаем экземпляры для разных случаев
export const getSelectBranchQueryUrl = createBranchQueryBuilder('all');
export const getSelectBranchQueryUrlNotForAdmin = createBranchQueryBuilder('any');

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
  {
    page,
    limit,
    searchQuery,
    filterOptions,
    sortBy,
    order,
    startDate,
    endDate,
    excludeDisabledUsers,
    // isGlobalAdmin,
    query,
  }: QueryOptions,
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
    page: 'assignment',
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

  // if (!isGlobalAdmin) {
  //   queries += `&all.isActive.in=true`;
  // }

  if (query) {
    queries += query;
  }

  if (sortBy && order) {
    queries += getSortQuery(sortBy, order);
  } else {
    return `api/users?page=${page || 0}&size=${limit || 20}${queries}&sort=surname,firstName,middleName,ASC`;
  }

  if (widthCars) {
    queries += `&all.driver.vehicleAllotments.include=true`;
  }

  if (excludeDisabledUsers !== undefined && excludeDisabledUsers !== false) {
    queries += `&all.disabled.in=false&all.isActive.in=true`;
  }

  return `api/users?page=${page || 0}&size=${limit || 20}${queries}`;
}
//////////////////
export function getUserListURLToAttachments(
  {
    filterOptions,
    startDate,
    endDate,
    searchQuery,
    page,
    limit,
    excludeDisabledUsers,
    isAttachment,
    includeActiveOnly,
  }: QueryOptions,
  widthCars: boolean,
  // excludeSuperAdmin: boolean,
) {
  const branchId = filterOptions?.branchId;
  const notBranchId = filterOptions?.notBranchId;
  const driverSpecified = filterOptions?.driverSpecified;
  const forChat = filterOptions?.forChat;
  // const equalsBranchId = filterOptions?.equalsBranchId; // Этот параметр при false выводит список пользователей из других филиалов.

  const trimmedQuery = Formatters.removeExtraSpaces(searchQuery ?? '');

  let queries = getSelectBranchToQueryUrl({
    parameters: driverSpecified ? `&all.driver.id.specified=true` : '',
    branchId,
    notBranch: notBranchId,
    forChat,
    forMap: includeActiveOnly,
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

  if (isAttachment) {
    queries += '&all.isActive.in=true';
  }

  // Добавляем параметр excludeDisabledUsers для исключения пользователей с isActive=false
  if (excludeDisabledUsers) {
    queries += `&all.disabled.in=false&all.isActive.in=true`;
  }
  // Только для вкладки Карта: фильтр по активным пользователям и исключение пустого пользователя id=2
  if (includeActiveOnly) {
    queries += `&all.isActive.in=true`;
    queries += `&all.id.notIn=2`;
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

export function getUserListURLToChat(
  { filterOptions, startDate, endDate, searchQuery, page, limit }: QueryOptions,
  widthCars: boolean,
  // excludeSuperAdmin: boolean,
) {
  const branchId = filterOptions?.branchId;
  const notBranchId = filterOptions?.notBranchId;
  const driverSpecified = filterOptions?.driverSpecified;
  const forChat = filterOptions?.forChat;
  // const equalsBranchId = filterOptions?.equalsBranchId; // Этот параметр при false выводит список пользователей из других филиалов.

  const trimmedQuery = Formatters.removeExtraSpaces(searchQuery ?? '');

  let queries = getSelectBranchToQueryUrlToChat({
    parameters: driverSpecified ? `&all.driver.id.specified=true` : '',
    branchId,
    notBranch: notBranchId,
    forChat,
  });

  if (forChat) {
    const date = new Date(startDate).toISOString();
    queries += `&all.createdAt.greaterThanOrEqual=${date}`;
  }

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

  if (trimmedQuery) {
    // queries += `&any.vin.contains=${queryTrimmed}`;
    queries += `&all.match.contains=${trimmedQuery}`;
  }

  // if (excludeSuperAdmin) {
  //   queries += `&all.id.notIn=1`
  // }

  // queries += `&branch.id.notIn=${branchId}`;
  return `api/users/full-name?page=${page || 0}&size=${limit || 20}&${queries}&all.isActive.in=true&sort=surname,firstName,middleName`;
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
  // isGlobalAdmin,
  specified,
  isActive,
  isAttachment,
  query,
}: QueryOptions): string => {
  const branchId = filterOptions && filterOptions?.branchId;
  const notBranchId = filterOptions && filterOptions?.notBranchId;

  const queryTrimmed = Formatters.removeExtraSpaces(searchQuery ?? '');

  let queries = getSelectBranchQueryUrl({ branchId, notBranch: notBranchId, page: 'assignment' });

  if (startDate) {
    const date = new Date(startDate).toISOString();
    queries += `&all.createdAt.greaterThanOrEqual=${date}`;
  }

  if (endDate) {
    queries += `&all.createdAt.lessThanOrEqual=${DateUtils.getEndFilterDate(endDate)}`;
  }

  if (sortBy && order) {
    queries += getSortQueryCar(sortBy, order);
  } else {
    queries += `&sort=manufacturer,model,registrationNumber`;
  }

  if (queryTrimmed) {
    // queries += `&any.vin.contains=${queryTrimmed}`;
    queries += `&all.match.contains=${queryTrimmed}`;
  }

  if (isActive) {
    queries += `&all.isActive.in=true`;
  }

  if (specified !== undefined) {
    queries += `&all.monitoringDevice.vehicleBind.createdAt.specified=${specified}`;
  }

  if (isAttachment) {
    queries += '&all.isActive.in=true';
  }

  if (query) {
    queries += query;
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
  excludeAlcolockId,
  excludeType,
  includeAlcolockId,
  isAttachment,
  includeActiveOnly,
  filterOptions,
}: QueryOptions & {
  excludeAlcolockId?: number;
  excludeType?: 'any' | 'all';
  includeAlcolockId?: number;
  isAttachment?: boolean;
}) {
  const branchId = filterOptions?.branchId;
  const notBranchId = filterOptions?.notBranchId;
  const queryTrimmed = Formatters.removeExtraSpaces(searchQuery ?? '');

  // Определяем базовый URL в зависимости от isAttachment
  const baseUrl = isAttachment ? 'api/monitoring-devices' : 'api/monitoring-devices/details';

  // Для этих URL всегда используем префикс "assignment."
  const useAssignmentPrefix = true;

  let queries = getSelectBranchQueryUrlNotForAdmin({
    branchId: branchId,
    notBranch: notBranchId,
    useAssignmentPrefix: useAssignmentPrefix,
  });

  if (isAttachment) {
    queries += '&all.isActive.in=true';
  }
  // Только для вкладки Карта: фильтр по активным алкозамкам
  if (includeActiveOnly) {
    queries += '&all.isActive.in=true';
  }

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

  if (excludeAlcolockId) {
    queries += `&${excludeType}.id.notIn=${excludeAlcolockId}`;
  }
  if (includeAlcolockId) {
    // queries += `&any.id.in=${includeAlcolockId}`;
  }

  if (queryTrimmed.length) {
    queries += `&all.match.contains=${queryTrimmed}`;
  }

  return `${baseUrl}?page=${page || 0}&size=${limit || 20}${queries}&sort=name`;
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
  // isGlobalAdmin,
  query,
}: QueryOptions) {
  const branchId = filterOptions?.branchId;
  const notBranchId = filterOptions?.notBranchId;

  const queryTrimmed = Formatters.removeExtraSpaces(searchQuery ?? '');

  let queries = getSelectBranchQueryUrl({ branchId, notBranch: notBranchId, page: 'assignment' });
  //

  if (startDate) {
    const date = new Date(startDate).toISOString();
    queries += `&all.vehicleBind.createdAt.greaterThanOrEqual=${date}`;
  }

  if (endDate) {
    queries += `&all.vehicleBind.createdAt.lessThanOrEqual=${DateUtils.getEndFilterDate(endDate)}`;
  }

  if (sortBy && order) {
    queries += getSortQuery(sortBy, order);
  } else {
    queries += `&sort=name`;
  }

  const searchOfAdmin = 'администратор'; // Приводим к нижнему регистру один раз
  //
  if (queryTrimmed.length) {
    // Проверяем, содержит ли введённая строка (в нижнем регистре) часть строки "администратор"
    // ИЛИ полностью совпадает с ней (без учёта регистра)
    if (
      searchOfAdmin.includes(queryTrimmed.toLowerCase()) ||
      queryTrimmed.toLowerCase().includes(searchOfAdmin)
    ) {
      // Условие для "администратор" или частичного совпадения
      queries += `&any.vehicleBind.vehicle.match.contains=${queryTrimmed}`;
      queries += `&any.match.contains=${queryTrimmed}`;
      queries += `&any.lastModifiedBy.match.contains=${queryTrimmed}`;
      queries += `&any.vehicleBind.createdBy.match.contains=${queryTrimmed}`;
      queries += `&all.id.notIn=3`;
    } else {
      // Условие для всех остальных запросов
      queries += `&any.vehicleBind.vehicle.match.contains=${queryTrimmed}`;
      queries += `&any.match.contains=${queryTrimmed}`;
      queries += `&any.lastModifiedBy.match.contains=${queryTrimmed}`;
      queries += `&all.id.notIn=3`;
      if ((queryTrimmed.match(/-/g) || []).length === 1) {
        queries += `&any.vehicleBind.vehicle.id.specified=false`;
      }
    }
  } else {
    queries += `&all.id.notIn=3`;
  }

  // if (!isGlobalAdmin) {
  //   queries += `&all.isActive.in=true`;
  // }

  if (query) {
    queries += query;
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

function getSortQueryEvents(orderType: SortTypes | string, order: GridSortDirection) {
  const orderStr = ',' + order.toUpperCase();

  switch (orderType) {
    case SortTypes.NAMING:
      return `&sort=name${orderStr}`;
    case SortTypes.SERIAL_NUMBER:
      return `&sort=device.serialNumber${orderStr}`;
    case SortTypes.TC:
      return `&sort=vehicleRecord.manufacturer,vehicleRecord.model${orderStr}`;
    case SortTypes.ALCOLOKS:
      return `&sort=deviceRecord.name,deviceRecord.serialNumber,${order.toUpperCase()}`;
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

// Сортировка для Сервисного режима:
function getSortQueryByService(orderType: SortTypes | string, order: GridSortDirection) {
  const orderStr = ',' + order.toUpperCase();

  switch (orderType) {
    case SortTypes.NAMING:
      return `&sort=name${orderStr}`;
    case SortTypes.SERIAL_NUMBER:
      return `&sort=device.serialNumber${orderStr}`;
    case SortTypes.TC:
      return `&sort=vehicleRecord.manufacturer,vehicleRecord.model${orderStr}`;
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
      return `&sort=createdBy.surname,createdBy.firstName,createdBy.middleName${orderStr}`;
    default:
      return '';
  }
}

// Сортировка для Истории сервисного режима:
function getSortQueryHistory(orderType: SortTypes | string, order: GridSortDirection) {
  const orderStr = ',' + order.toUpperCase();

  switch (orderType) {
    case SortTypes.TC:
      return `&sort=vehicle.manufacturer,vehicle.model${orderStr}`;
    case SortTypes.ALCOLOKS:
      return `&sort=device.name,device.serialNumber,${order.toUpperCase()}`;
    case SortTypes.TYPE_OF_EVENT:
      return `&sort=eventType.label${orderStr}`;
    case SortTypes.HANDLER:
      return `&sort=handler.surname,handler.firstName,handler.middleName${orderStr}`;
    case SortTypes.CREATED_AT:
      return `&sort=createdAt${orderStr}`;
    case SortTypes.INITIATOR:
      return `&sort=initiator.surname,initiator.firstName,initiator.middleName${orderStr}`;
    default:
      return '';
  }
}
// TODO => написать общую функцию по формированию query параметров
export function getEventsHistoryURL({
  alcolockId,
  carId,
  registrationNumber,
  userId,
  page,
  limit,
  order,
  sortBy,
  filterOptions,
  startDate,
  endDate,
  searchQuery,
}: EventsOptions) {
  const branchId = filterOptions?.branchId;
  const queryTrimmed = Formatters.removeExtraSpaces(searchQuery ?? '');

  // Используем массив для накопления параметров
  const queryParts: string[] = [];

  // Базовые параметры
  queryParts.push(`page=${page || 0}`);
  queryParts.push(`size=${limit || 50}`);

  // Параметры по умолчанию
  queryParts.push(`all.eventsForFront.id.notIn=20,31,54`);
  queryParts.push(`all.id.notIn=3`);

  // Добавляем фильтрацию по филиалу
  if (branchId) {
    queryParts.push(`all.device.branchId.in=${branchId}`);
  }

  // Фильтрация по датам
  if (startDate) {
    const date = new Date(startDate).toISOString();
    queryParts.push(`all.timestamp.greaterThanOrEqual=${date}`);
  }

  if (endDate) {
    queryParts.push(`all.timestamp.lessThanOrEqual=${DateUtils.getEndFilterDate(endDate)}`);
  }

  // Поиск по строке
  if (queryTrimmed.length) {
    queryParts.push(`any.vehicleBind.vehicle.match.contains=${encodeURIComponent(queryTrimmed)}`);
    queryParts.push(`any.match.contains=${encodeURIComponent(queryTrimmed)}`);
    queryParts.push(`any.lastModifiedBy.match.contains=${encodeURIComponent(queryTrimmed)}`);
    queryParts.push(`all.id.notIn=3`); // Дублируется в оригинальном коде
  }

  // Фильтрация по типам событий
  if (filterOptions?.eventsByType?.length > 0) {
    let eventIds = filterOptions.eventsByType
      .map((event) => String(event.value))
      .filter((value) => value.trim() !== '');

    if (eventIds.includes('16')) {
      eventIds = eventIds.filter((id) => id !== '16').concat(['22', '23', '24', '54']);
    }

    if (eventIds.length > 0) {
      queryParts.push(`all.eventsForFront.id.in=${eventIds.join(',')}`);
      if (isOnlyInterruptedSoberityTestEventFilter(eventIds)) {
        queryParts.push(
          `all.extra.exhaleErrorCode.in=${INTERRUPTED_SOBERITY_TEST_EXHALE_ERROR_CODES}`,
        );
      }
    }
  }

  // Остальные параметры фильтрации
  if (userId) {
    queryParts.push(`all.user.id.in=${userId}`);
  }

  if (carId) {
    queryParts.push(`all.vehicle.id.in=${carId}`);
  }

  if (registrationNumber) {
    queryParts.push(
      `all.vehicleRecord.registrationNumber.in=${encodeURIComponent(registrationNumber)}`,
    );
  }

  if (alcolockId) {
    queryParts.push(`all.device.id.in=${alcolockId}`);
  }

  // Параметры сортировки
  if (sortBy && order) {
    if (sortBy === SortTypes.ID) {
      queryParts.push(`sort=eventsForFront.label,${order}`);
    } else {
      queryParts.push(`sort=timestamp,${order}`);
    }
  } else {
    queryParts.push(`sort=timestamp,DESC`);
    queryParts.push(`sort=id,DESC`);
  }

  // Собираем финальный URL
  return `api/device-events?${queryParts.join('&')}`;
}
// ************ История сервисного режима ****************
export function getHistoryApiURL({
  page = 0,
  limit = 20,
  sortBy,
  order,
  startDate,
  searchQuery,
  endDate,
  filterOptions,
}: {
  page?: string | number;
  limit?: string | number;
  sortBy?: string;
  order?: 'asc' | 'desc';
  startDate?: string;
  searchQuery?: string;
  endDate?: string;
  filterOptions?: HistoryFilterOptions;
}) {
  const queryTrimmed = Formatters.removeExtraSpaces(searchQuery ?? '');
  let queries = '';
  const branchId = filterOptions?.branchId;
  const notBranch = filterOptions?.notBranchId;
  if (queryTrimmed.length) {
    // queries += `&any.eventType.match.contains=${queryTrimmed}`;
    queries += `&any.initiator.match.contains=${queryTrimmed}`;
    queries += `&any.handler.match.contains=${queryTrimmed}`;
    queries += `&any.vehicle.match.contains=${queryTrimmed}`;
    queries += `&any.deviceRecord.match.contains=${queryTrimmed}`;
  }
  if (startDate) {
    const startDateISO = new Date(startDate).toISOString();
    queries += `&all.createdAt.greaterThanOrEqual=${startDateISO}`;
  }
  if (endDate) {
    const endDateISO = new Date(endDate).toISOString();
    queries += `&all.createdAt.lessThanOrEqual=${endDateISO}`;
  }
  //Добавление фильтров
  if (filterOptions?.alcolocks?.length) {
    queries += `&all.device.id.in=${filterOptions.alcolocks}`;
  }

  if (filterOptions?.typeEvent?.length) {
    const eventTypes = filterOptions.typeEvent.map((event: { value: number }) => event.value);
    queries += `&all.eventType.id.in=${eventTypes}`;
  }
  if (filterOptions?.driverId?.length) {
    queries += `&all.initiator.id.in=${filterOptions.driverId}`;
  }
  if (filterOptions?.handlerId?.length) {
    queries += `&all.handler.id.in=${filterOptions.handlerId}`;
  }
  if (filterOptions?.carId?.length) {
    queries += `&all.vehicle.id.in=${filterOptions.carId}`;
  }

  if (sortBy || order) {
    const sortByDefault = 'createdAt';
    const orderDefault = 'desc';
    const sortByFinal = sortBy || sortByDefault;
    const orderFinal = order || orderDefault;

    queries += getSortQueryHistory(sortByFinal, orderFinal);
  } else {
    queries += '&sort=createdAt,DESC';
  }

  let branch = '';

  if (branchId && !notBranch) {
    branch += `all.device.assignment.branch.id.in=${branchId}`;
  } else if (notBranch && branchId !== 20) {
    branch += `all.device.assignment.branch.id.notIn=${notBranch}`;
  } else if (notBranch) {
    branch += `all.device.assignment.branch.id.notIn=${notBranch}&all.id.notIn=1`;
  }

  return `api/v1/auto-service-history?page=${page}&size=${limit}&${branch}${queries}`;
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
  currentUserId,
  permission,
  role,
}: QueryOptions & { currentUserId?: number; permission?: string[]; role?: number[] }) {
  const queryTrimmed = Formatters.removeExtraSpaces(searchQuery ?? '');
  const branchId = filterOptions?.branchId;

  // Базовые параметры URL
  let queries = getSelectBranchQueryUrl({
    parameters: ``,
    // page: 'action.device',
    branchId,
  });

  if (
    permission?.some((p) => ['SYSTEM_DRIVER_ACCOUNT', 'SYSTEM_SERVICE_ACCOUNT'].includes(p)) &&
    currentUserId &&
    !role.some((r) => [400, 500, 1053].includes(r))
  ) {
    queries += `&all.user.id.in=${currentUserId}`;
  }

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
    queries += `&any.vehicleRecord.match.contains=${queryTrimmed}`;
    queries += `&any.deviceRecord.match.contains=${queryTrimmed}`;
    // queries += `&any.eventType.match.contains=${queryTrimmed}`;
  }

  if (users) {
    queries += `&all.user.id.in=${users}`;
  }

  if (tc) {
    queries += `&all.vehicle.id.in=${tc}`;
  }

  if (alcolock) {
    queries += `&all.device.id.in=${alcolock}`;
  }

  if (eventClasses && eventClasses.length > 0) {
    const eventClassIds = eventClasses.map((event) => event.value).join(',');
    queries += `&all.eventsForFront.levelType.id.in=${eventClassIds}`;
  }

  let sortParams = '';
  if (sortBy && order && sortBy === 'DATE_OCCURRENT') {
    sortParams = `&sort=id,${order.toUpperCase()}`;
  } else {
    sortParams = '&sort=timestamp,DESC&sort=id,DESC';
  }
  // Исключаем события с указанными ID для всех пользователей, кроме пользователя с ID=1 и филиала 570786
  if (currentUserId !== 1 && branchId === 570786) {
    queries += `&all.eventsForFront.id.notIn=43,44,46,35,19,37,42,47,48,41,25,19,60,15,45,36,38`;
  }

  if (eventsByType && eventsByType.length > 0) {
    let trimmedQuery = eventsByType.map((event) => String(event.value));
    if (trimmedQuery.includes('16')) {
      trimmedQuery = trimmedQuery.filter((id) => id !== '16').concat(['22', '23', '24', '54']);
    }
    let interruptedExhaleQuery = '';
    if (isOnlyInterruptedSoberityTestEventFilter(trimmedQuery)) {
      interruptedExhaleQuery = `&all.extra.exhaleErrorCode.in=${INTERRUPTED_SOBERITY_TEST_EXHALE_ERROR_CODES}`;
    }
    const eventQuery = `api/device-events?page=${page || 0}&size=${limit || 20}&all.eventsForFront.id.in=${trimmedQuery.join(',')}${queries}${interruptedExhaleQuery}${sortParams}`;
    return eventQuery;
  }

  return `api/device-events?page=${page || 0}&size=${limit || 20}${queries}${sortParams}`;
}

export function getEventsApiURLForMap({
  page,
  limit,
  searchQuery,
  startDate,
  endDate,
  // order,
  // sortBy,
  filterOptions,
  currentUserId,
  permission,
  role,
}: QueryOptions & { currentUserId?: number; permission?: string[]; role?: number[] }) {
  const queryTrimmed = Formatters.removeExtraSpaces(searchQuery ?? '');
  const branchId = filterOptions?.branchId;

  // Базовые параметры URL
  let queries = '';

  // Добавляем параметры ветки, если они есть
  if (branchId) {
    queries += getSelectBranchQueryUrl({
      parameters: '',
      branchId,
    });
  }

  // Добавляем фильтр по текущему пользователю, если нужно
  if (
    permission?.some((p) => ['SYSTEM_DRIVER_ACCOUNT', 'SYSTEM_SERVICE_ACCOUNT'].includes(p)) &&
    currentUserId &&
    !role.some((r) => [400, 500, 1053].includes(r))
  ) {
    queries += `&all.user.id.in=${currentUserId}`;
  }

  const users = filterOptions?.users;
  const cars = filterOptions?.cars;
  const tcRegistrationNumbers = filterOptions?.carsRegistrationNumbers;
  const alcolock = filterOptions?.alcolock;
  const eventsByType = filterOptions?.eventsByType;
  const eventClasses = filterOptions?.level;

  // Фильтр по дате начала
  if (startDate) {
    const date = new Date(startDate).toISOString();
    queries += `&all.timestamp.greaterThanOrEqual=${date}`;
  }

  // Фильтр по дате окончания
  if (endDate) {
    queries += `&all.timestamp.lessThanOrEqual=${DateUtils.getEndFilterDate(endDate)}`;
  }

  // Фильтр по поисковому запросу
  if (queryTrimmed.length) {
    queries += `&any.userRecord.match.contains=${queryTrimmed}`;
    queries += `&any.vehicleRecord.match.contains=${queryTrimmed}`;
    queries += `&any.deviceRecord.match.contains=${queryTrimmed}`;
    // queries += `&any.eventType.match.contains=${queryTrimmed}`;
  }

  // Фильтр по пользователям
  if (users) {
    queries += `&all.user.id.in=${users}`;
  }

  // Фильтр по ТС (vehicle ids)
  if (cars) {
    queries += `&all.vehicle.id.in=${cars}`;
  }

  // Фильтр по регистрационным номерам ТС
  if (tcRegistrationNumbers) {
    queries += `&all.vehicle.registrationNumber.in=${tcRegistrationNumbers.join(',')}`;
  }

  // Фильтр по алкозамкам
  if (alcolock) {
    queries += `&all.device.id.in=${alcolock}`;
  }

  // Фильтр по классам событий
  if (eventClasses && eventClasses.length > 0) {
    const eventClassIds = eventClasses.map((event) => event.value).join(',');
    queries += `&all.eventsForFront.levelType.id.in=${eventClassIds}`;
  }

  // Исключаем определенные типы событий (как в getEventsApiURL)
  queries += '&all.eventsForFront.id.notIn=20,31,54';
  queries += '&all.id.notIn=3';

  // Сортировка по timestamp в DESC порядке (как в getEventsApiURL)
  const sortParams = '&sort=timestamp,DESC&sort=id,DESC';

  // Фильтр по типам событий
  if (eventsByType && eventsByType.length > 0) {
    let trimmedQuery = eventsByType.map((event) => String(event.value));
    if (trimmedQuery.includes('16')) {
      trimmedQuery = trimmedQuery.filter((id) => id !== '16').concat(['22', '23', '24', '54']);
    }
    let interruptedExhaleQuery = '';
    if (isOnlyInterruptedSoberityTestEventFilter(trimmedQuery)) {
      interruptedExhaleQuery = `&all.extra.exhaleErrorCode.in=${INTERRUPTED_SOBERITY_TEST_EXHALE_ERROR_CODES}`;
    }
    return `api/device-events?page=${page || 0}&size=${limit || 3}&all.eventsForFront.id.in=${trimmedQuery.join(',')}${queries}${interruptedExhaleQuery}${sortParams}`;
  }

  // Базовый URL с параметрами
  return `api/device-events?page=${page || 0}&size=${limit || 3}${queries}${sortParams}`;
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
    useAssignmentPrefix: true,
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
    queries += getSortQueryByService(sortByFinal, orderFinal);
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

  // Убираем ручное добавление branchId, т.к. оно уже есть в getSelectBranchQueryUrl
  queries += getSelectBranchQueryUrl({
    parameters:
      '?all.type.in=SERVICE_MODE_ACTIVATE,SERVICE_MODE_DEACTIVATE&all.status.in=ACTIVE&all.seen.in=false',
    branchId,
    page: 'device',
    useAssignmentPrefix: true, // ← Добавляем assignment.
  });

  if (startDate) {
    const date = new Date(startDate).toISOString();
    queries += `&all.occurredAt.greaterThanOrEqual=${date}`;
  }

  if (endDate) {
    queries += `&all.occurredAt.lessThanOrEqual=${DateUtils.getEndFilterDate(endDate)}`;
  }

  if (sortBy || order) {
    const sortByDefault = 'name';
    const orderDefault = 'asc';
    const sortByFinal = sortBy || sortByDefault;
    const orderFinal = order || orderDefault;
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
    queries += `&all.id.notIn=${excludeId}`;
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

// Mailings (Рассылки)

export function getEmailNotificationsListURL(
  {
    page,
    limit,
    searchQuery,
    // filterOptions,
    sortBy,
    order,
    startDate,
    endDate,
    query,
  }: QueryOptions,
  branchId?: number,
) {
  const trimmedQuery = Formatters.removeExtraSpaces(searchQuery ?? '');

  let queries = '';

  // Добавляем фильтр по branchId если он передан
  if (branchId) {
    queries += `&all.branch.id.in=${branchId}`;
  }

  if (startDate) {
    const date = new Date(startDate).toISOString();
    queries += `&all.createdAt.greaterThanOrEqual=${date}`;
  }

  if (endDate) {
    queries += `&all.createdAt.lessThanOrEqual=${DateUtils.getEndFilterDate(endDate)}`;
  }

  if (trimmedQuery) {
    queries += `&any.match.contains=${trimmedQuery}`;
  }

  if (query) {
    queries += query;
  }

  if (sortBy && order) {
    queries += getSortQuery(sortBy, order);
  } else {
    queries += `&sort=email,ASC`;
  }

  return `api/v1/email-notification?page=${page || 0}&size=${limit || 20}${queries}`;
}
