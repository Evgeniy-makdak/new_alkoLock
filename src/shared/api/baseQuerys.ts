import type { AxiosRequestConfig } from 'axios';

import type { EmailTemplate } from '@pages/templates/EmailTemplatesPage';
import {
  getAlcolockListURL,
  getAlcolocksURL,
  getAlkolockURL,
  getAttachmentURL,
  getAttachmentsDeleteItemURL,
  getBranchListUrl,
  getCarListURL,
  getCarSwitchBranchUrl,
  getChatTransferOperatorsListURL,
  getCreateAlkolocksURL,
  getCreateAttachmentApiURL,
  getDriverAllotmentsByBranchId,
  getEmailNotificationsListURL,
  getEventListCountForAutoServiceURL,
  getEventListForAutoServiceURL,
  getEventsApiURL,
  getEventsApiURLForMap,
  getEventsHistoryURL,
  getHistoryApiURL,
  getMarksCarURL,
  getRolesListURL,
  getUrlCountEventsQuery,
  getUserListURL,
  getUserListURLToAttachments,
  getUserListURLToChat,
} from '@shared/lib/getUrlForQueries';
import type { HistoryFilterOptions, QueryOptions } from '@shared/types/QueryTypes';

import {
  type ActivateServiceModeOptions,
  AddPhotoResponse,
  type AttachmentsCreateData,
  type ChangeCarBody,
  type ChangePasswordData,
  type CreateAlcolockData,
  type CreateCarBody,
  type CreateRoleData,
  type EmailNotificationResponse,
  ForgetPasswordData,
  type IAccount,
  type IAccountUser,
  type IAlcolock,
  type IAttachmentItems,
  type IAuthenticate,
  type IBranch,
  ICar,
  type ID,
  type IDeviceAction,
  type IEmailNotification,
  type IEventsType,
  type IRole,
  IUser,
  type PhotoUrlsFromGalleryResponse,
  type ResetPasswordData,
  type SetPasswordData,
  type UserDataLogin,
} from '../types/BaseQueryTypes';
import { deleteQuery, getQuery, patchQuery, postQuery, putQuery } from './baseQueryTypes';

export interface UsersResponse {
  content: IUser[];
}

export default class PhotosApi {
  static getItem(url: string) {
    return getQuery<Blob>({
      url: `api/photos/${url}`,
      config: {
        responseType: 'blob',
      },
    });
  }
}
export class AttachmentsApi {
  static getList(options: QueryOptions) {
    const url = getAttachmentURL(options);
    return getQuery<{ content: IAttachmentItems[]; totalElements: number }>({ url });
  }

  static createItem(data: AttachmentsCreateData, headers?: AxiosRequestConfig['headers']) {
    return postQuery({ url: getCreateAttachmentApiURL(), data, headers });
  }

  static deleteItem(id: ID, headers?: AxiosRequestConfig['headers']) {
    return deleteQuery<void>({ url: getAttachmentsDeleteItemURL(id), headers });
  }

  static getDriverAllotments(options: QueryOptions) {
    const url = getDriverAllotmentsByBranchId(options);
    return getQuery<{ content: IAttachmentItems[]; totalElements: number }>({ url });
  }
}

/** POST/GET фото для чата (`/chats/photos/...`). Галерея пользователя — `UsersApi` (`/users/photos/...`). */
export class ChatsApi {
  static addPhoto(data: FormData, userId: ID) {
    return postQuery<AddPhotoResponse, FormData>({
      url: `api/v1/chats/photos/${userId}`,
      data,
      headers: {},
    });
  }

  static getPhotoByFileName(photoId: string) {
    return getQuery<Blob>({
      url: `api/v1/chats/photos/${photoId}`,
      config: {
        responseType: 'blob',
        headers: { 'Cache-Control': 'no-cache' },
      },
    });
  }
}

export class UsersApi {
  static getAvatar(id: ID) {
    return getQuery<Blob>({
      url: `api/v1/users/photos/photos/${id}`,
      config: {
        responseType: 'blob',
        headers: { 'Cache-Control': 'no-cache' },
      },
    });
  }
  static changeAvatarById(photoId: ID, userId: ID, isDefault = true) {
    return putQuery({
      url: `api/v1/users/photos/${userId}/photos/${photoId}?isDefault=${isDefault}`,
      config: {
        responseType: 'blob',
        headers: { 'Cache-Control': 'no-cache' },
      },
    });
  }
  static addPhoto(data: FormData, id: ID) {
    return postQuery<AddPhotoResponse, FormData>({
      url: `api/v1/users/photos/${id}`,
      data,
      headers: {},
    });
  }
  /** PUT назначения/снятия аватара: ?isDefault=true при установке, false при снятии */
  static setPhotoAsAvatar(photoId: ID, userId: ID, isDefault = true) {
    return putQuery({
      url: `api/v1/users/photos/${userId}/photos/${photoId}?isDefault=${isDefault}`,
      config: {
        responseType: 'blob',
        headers: { 'Cache-Control': 'no-cache' },
      },
    });
  }
  static deletePhotosFromGallery(fotos: string) {
    return deleteQuery({
      url: `api/v1/users/photos?photoIds=${fotos}`,
      data: fotos,
      config: {
        headers: {
          'Cache-Control': 'no-cache',
        },
      },
    });
  }

  static getPhotoFromGallery(url: string) {
    return getQuery<Blob>({
      url: `api/v1/users/photos/${url}`,
      config: {
        responseType: 'blob',
        headers: {
          'Cache-Control': 'no-cache',
        },
      },
    });
  }

  static getPhotoUrlsFromGallery(userId: ID) {
    return getQuery<PhotoUrlsFromGalleryResponse[]>({
      url: `api/v1/users/photos/reference/${userId}`,
    });
  }
  static changeAvatar(data: FormData, userId: ID) {
    return putQuery({ url: `api/v1/users/photos/${userId}/update`, data });
  }

  static deleteUserImages(data: FormData, userId: ID) {
    return deleteQuery({ url: `api/users/${userId}/photo`, data });
  }

  static getPhotoByFileName(fileName: string) {
    return getQuery<Blob>({
      url: `api/v1/users/photos/${fileName}`,
      config: {
        responseType: 'blob',
        headers: { 'Cache-Control': 'no-cache' },
      },
    });
  }

  static getList(options: QueryOptions, widthCars = false) {
    return getQuery<{ content: IUser[]; totalElements: number }>({
      url: getUserListURL(options, widthCars),
    });
  }

  static getListToAttachments(
    options: QueryOptions & { isAttachment?: boolean },
    widthCars = false,
  ) {
    return getQuery<{ content: IUser[]; totalElements: number }>({
      url: getUserListURLToAttachments(options, widthCars),
    });
  }

  static getListToChat(options: QueryOptions & { isAttachment?: boolean }, widthCars = false) {
    return getQuery<{ content: IUser[]; totalElements: number }>({
      url: getUserListURLToChat(options, widthCars),
    });
  }

  static getListForChatTransfer(options: QueryOptions & { excludeUserId?: ID }) {
    return getQuery<{ content: IUser[]; totalElements: number }>({
      url: getChatTransferOperatorsListURL(options),
    });
  }

  static getUser(userId: ID) {
    return getQuery<IUser>({ url: `api/users/${userId}` });
  }

  static switchBranch({ id: userId, filterOptions: { branchId } }: QueryOptions) {
    return postQuery<ICar, unknown>({ url: `api/users/${userId}/assign/${branchId}` });
  }

  static createUser(data: FormData) {
    return postQuery<IUser, unknown>({
      url: `api/users`,
      data,
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  }

  static changeUser(data: FormData, userId: ID) {
    return putQuery<IUser, unknown>({
      url: `api/users/${userId}`,
      data,
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  }

  static deleteUser(userId: ID) {
    return deleteQuery({ url: `api/users/${userId}` });
  }

  static deactivateUser(userId: ID) {
    return patchQuery({
      url: `api/users/${userId}/deactivate-user`,
      data: { isActive: false },
    });
  }

  static activateUser(userId: ID) {
    return patchQuery({
      url: `api/users/${userId}/activate-user`,
      data: { isActive: true },
    });
  }

  static getInfo() {
    return getQuery<IAccountUser>({ url: `api/account` });
  }

  static changePassword(data: ChangePasswordData) {
    return postQuery({ url: `api/account/change-password`, data });
  }

  static forgetPassword(data: ForgetPasswordData) {
    return putQuery({
      url: `api/account/reset-password/finish`,
      data: {
        email: data.email,
        password: data.password,
      },
      headers: {
        isAuth: false, // Явно отключаем авторизацию
        'Content-Type': 'application/json',
      },
    });
  }

  static resetPassword(data: ResetPasswordData) {
    return putQuery({
      url: `api/account/reset-password/init?email=${encodeURIComponent(data.email)}`, // Добавляем email в URL
      data: {}, // Тело запроса оставляем пустым
      headers: {
        isAuth: false,
        'Content-Type': 'application/json',
      },
    });
  }

  static confirmPassword(data: { email: string; verificationCode: string }) {
    return putQuery({
      url: `api/account/reset-password/check`,
      data: {
        email: data.email,
        code: data.verificationCode, // Сервер ожидает поле "code"
      },
      headers: {
        isAuth: false,
        'Content-Type': 'application/json',
      },
    });
  }

  static setPassword(data: SetPasswordData) {
    return putQuery({ url: `api/account/reset-password/finish`, data });
  }
  static authenticate(data: UserDataLogin) {
    return postQuery<IAuthenticate, unknown>({
      url: `api/authenticate`,
      data,
      headers: { isAuth: false },
    });
  }
}

export class CarsApi {
  static getCarsList(options: QueryOptions & { isAttachment?: boolean }) {
    return getQuery<{ content: ICar[]; totalElements: number }>({ url: getCarListURL(options) });
  }

  static getMarksCarList(options: QueryOptions) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return getQuery<any>({ url: getMarksCarURL(options) });
  }

  static getGetManufacturer() {
    return getQuery<string[]>({ url: `api/vehicles/manufacturers` });
  }

  static getCar(carId: ID) {
    return getQuery<ICar>({ url: `api/vehicles/${carId}` });
  }

  static getCarForDeactivate(carId: ID) {
    if (carId) return getQuery<ICar>({ url: `api/vehicles/${carId}` });
  }

  static changeCar(data: ChangeCarBody, carId: ID) {
    return putQuery({ url: `api/vehicles/${carId}`, data });
  }

  static deleteCar(carId: ID) {
    return deleteQuery({
      url: `api/vehicles/${carId}`,
    });
  }

  static deactivateCar(carId: ID) {
    return patchQuery({
      url: `api/vehicles/${carId}/deactivate-vehicle`,
      data: { isActive: false },
    });
  }

  static activateCar(carId: ID) {
    return patchQuery({
      url: `api/vehicles/${carId}/activate-vehicle`,
      data: { isActive: true },
    });
  }

  static createCar(data: CreateCarBody) {
    return postQuery({ url: `api/vehicles`, data });
  }

  static switchBranch(options: QueryOptions, isPairSwitch: boolean) {
    return postQuery<ICar, unknown>({ url: getCarSwitchBranchUrl(options, isPairSwitch) });
  }

  static getVehicleColors() {
    return getQuery<
      {
        value: string;
        key: string;
        colors: { label: string; value: string };
      }[]
    >({ url: 'api/v1/front-data/vehicle-color' });
  }

  static getVehicleTypes() {
    return getQuery<
      {
        value: string;
        key: string;
        types: { label: string; value: string };
      }[]
    >({ url: 'api/v1/front-data/vehicle-types' });
  }
}

export class AlcolocksApi {
  static getList(options: QueryOptions) {
    return getQuery<{ content: IAlcolock[]; totalElements: number }>({
      url: getAlcolocksURL(options),
    });
  }

  static getListAlcolocks(options: QueryOptions) {
    return getQuery<{ content: IAlcolock[]; totalElements: number }>({
      url: getAlcolockListURL(options),
    });
  }

  static deleteAlkolock(id: ID) {
    return deleteQuery({ url: getAlkolockURL(id) });
  }

  static deactivateAlkolock(id: ID) {
    return patchQuery({
      url: `api/monitoring-devices/${id}/deactivate-device`,
      data: { isActive: false },
    });
  }

  static activateAlkolock(id: ID) {
    return patchQuery({
      url: `api/monitoring-devices/${id}/activate-device`,
      data: { isActive: true },
    });
  }

  static getAlkolock(id: ID) {
    return getQuery<IAlcolock>({ url: getAlkolockURL(id) });
  }

  static createItem(data: CreateAlcolockData) {
    return postQuery({ url: getCreateAlkolocksURL(), data });
  }

  static changeItem(data: CreateAlcolockData, id: ID) {
    return putQuery({ url: getAlkolockURL(id), data });
  }

  static switchBranch({ id, filterOptions: { branchId } }: QueryOptions, withVehicle = false) {
    return postQuery<IAlcolock, unknown>({
      url: `api/monitoring-devices/${id}/assign/${branchId}?withVehicle=${withVehicle}`,
    });
  }
}

export class EventsApi {
  static getList(options: QueryOptions, axiosConfig?: AxiosRequestConfig) {
    return getQuery<{ content: IDeviceAction[]; totalElements: number }>({
      url: getEventsApiURL(options),
      config: axiosConfig,
    });
  }

  static getListForMap(options: QueryOptions) {
    return getQuery<{ content: IDeviceAction[]; totalElements: number }>({
      url: getEventsApiURLForMap(options),
    });
  }

  static getHistoryList(options: HistoryFilterOptions) {
    return getQuery<{ content: IDeviceAction[]; totalElements: number }>({
      url: getHistoryApiURL(options),
    });
  }

  static getEventClasses() {
    return getQuery<string[]>({
      url: 'api/v1/front-data/event-classes',
    });
  }

  static getCount(options: QueryOptions) {
    return getQuery<number>({ url: getUrlCountEventsQuery(options) });
  }

  static getEventItem(id: ID) {
    return getQuery<IDeviceAction>({ url: `api/device-actions/${id}` });
  }

  static getEventItemForAutoServise(id: ID) {
    return getQuery<IDeviceAction>({ url: `api/device-actions/${id}` });
  }

  static getEventListForAutoService(options: QueryOptions) {
    return getQuery<{ content: IDeviceAction[]; totalElements: number }>({
      url: getEventListForAutoServiceURL(options),
    });
  }

  static getEventListCountForAutoServiceURL(options: QueryOptions) {
    return getQuery<number>({ url: getEventListCountForAutoServiceURL(options) });
  }

  static getEventsHistory(options: HistoryFilterOptions) {
    return getQuery<{ content: IDeviceAction[]; totalElements: number }>({
      //@ts-expect-error: "Временное решение"
      url: getEventsHistoryURL(options),
    });
  }

  static getEventsTypeList(
    { filterOptions }: QueryOptions,
    excludedIds: number[] | null = null,
    isIn: boolean = false,
    useNewEndpoint: boolean = false,
    currentUserId?: number,
    currentBranchId?: number,
  ) {
    let url = useNewEndpoint
      ? 'api/v1/front-data/service-history-event-types'
      : 'api/v1/front-data/event-types';

    const params: string[] = [];
    const level = filterOptions?.level;
    const match = filterOptions?.match;

    if (excludedIds && excludedIds.length > 0) {
      const excludedIdsString = excludedIds.join(',');
      params.push(`all.id.${isIn ? 'in' : 'notIn'}=${excludedIdsString}`);
    }

    // Добавляем исключение событий ТОЛЬКО если:
    // 1. currentUserId НЕ равен 1 (currentUserId !== 1)
    // 2. currentBranchId равен 570786 (currentBranchId === 570786)
    if (currentUserId !== 1 && currentBranchId === 570786) {
      params.push(`all.id.notIn=43,44,46,35,19,37,42,47,48,41,25,19,60,15,45,36,38`);
    }
    // Во всех остальных случаях (currentUserId === 1 ИЛИ currentBranchId !== 570786)
    // исключение НЕ добавляется
    if (!level || level.length === 0) {
      params.push('sort=label');
    }

    if (match) {
      params.push(useNewEndpoint ? `match=${match}` : `all.match.contains=${match}`);
    }

    if (level && level.length > 0) {
      const levelTypeIds = level.map((event) => event.value).join(',');
      params.push(`all.levelType.id.in=${levelTypeIds}&sort=label`);
    }

    if (params.length > 0) {
      url += `?${params.join('&')}`;
    }

    return getQuery<IEventsType>({ url });
  }

  static activateServiceMode({
    duration,
    deviceId,
    isDeactivate = false,
  }: ActivateServiceModeOptions) {
    const requestData = isDeactivate
      ? {
          deviceId,
          type: 'SERVICE_MODE_DEACTIVATE',
        }
      : {
          duration: duration * 3600,
          deviceId,
          type: 'SERVICE_MODE_ACTIVATE',
        };
    return postQuery<IDeviceAction, unknown>({ url: `api/device-actions`, data: requestData });
  }
  static cancelActivateService(id: ID) {
    return postQuery<IDeviceAction, unknown>({ url: `api/device-actions/${id}/cancel` });
  }

  static rejectActivateService(id: ID) {
    return postQuery<IDeviceAction, unknown>({ url: `api/device-actions/${id}/reject` });
  }

  static acceptActivateService(id: ID) {
    return postQuery<IDeviceAction, unknown>({ url: `api/device-actions/${id}/accept` });
  }
  static seenAutoService(id: ID) {
    return postQuery<IDeviceAction, unknown>({ url: `api/device-actions/${id}/seen` });
  }
}

export class AccountApi {
  static getAccountData() {
    return getQuery<IAccount>({ url: `api/account` });
  }

  static getBackandVersion() {
    return getQuery<unknown>({ url: `api/v1/backend-version` });
  }
}

export class BranchApi {
  static getBranchList(options: QueryOptions) {
    return getQuery<{
      find(arg0: (branchInBase: { id: ID }) => boolean): unknown;
      content: IBranch[];
      totalElements: number;
    }>({ url: getBranchListUrl(options) || '' });
  }
  static createBranch(name: string) {
    return postQuery<IBranch, { name: string }>({ data: { name }, url: `api/branch-offices` });
  }
  static deleteBranch(id: ID, deactivateRecords: boolean) {
    return deleteQuery<unknown>({
      url: `api/branch-offices/${id}?deactivateRecords=${deactivateRecords}`,
    });
  }
  static editBranch(id: ID, name: string) {
    return putQuery<IBranch, { id: ID; name: string }>({
      url: `api/branch-offices/${id}`,
      data: {
        id,
        name,
      },
    });
  }
  static getBranch(id: ID) {
    return getQuery<IBranch>({ url: `api/branch-offices/${id}` });
  }
  static moveItem(branchId: ID, ids: ID[]) {
    return postQuery({ url: `api/branch-offices/${branchId}/move`, data: { entities: ids } });
  }
}

export class RolesApi {
  static getList(options: QueryOptions) {
    return getQuery<{ content: IRole[]; totalElements: number }>({
      url: getRolesListURL(options),
    });
  }
  static getPermissionFormat() {
    return getQuery<{
      create: Record<string, string[]>;
      read: Record<string, string[]>;
      edit: Record<string, string[]>;
      delete: Record<string, string[]>;
      system: Record<string, string[]>;
    }>({ url: `api/permissions/format` });
  }
  static getItem(id: ID) {
    return getQuery<IRole>({ url: `api/user-groups/${id}` });
  }
  static deleteItem(id: ID) {
    return deleteQuery({ url: `api/user-groups/${id}` });
  }
  static changeItem(data: CreateRoleData, id: ID) {
    return putQuery({ url: `api/user-groups/${id}`, data });
  }

  static createItem(data: CreateRoleData) {
    return postQuery({ url: `api/user-groups`, data });
  }

  static getDriverRole(id: ID) {
    return getQuery<IRole>({ url: `api/user/check-driver-role/${id}` });
  }

  static checkDriverRole(ids: ID) {
    return getQuery<{ hasDriverRole: boolean }>({
      url: `api/users/check-driver-role`,
      config: { params: { ids } },
    });
  }

  static getPermissions() {
    return getQuery<string[]>({
      url: 'api/v1/front-data/permissions',
    });
  }
}

export class TemplatesApi {
  static getTemplates(queryParams?: string) {
    const defaultParams = 'sort=name,ASC';
    const url = `api/v1/email-templates?${queryParams || defaultParams}`;
    return getQuery<EmailTemplate[]>({ url });
  }

  static createTemplate(data: Omit<EmailTemplate, 'id'>) {
    return postQuery<EmailTemplate, Omit<EmailTemplate, 'id'>>({
      url: 'api/v1/email-templates',
      data,
    });
  }

  static updateTemplate(data: Partial<EmailTemplate>) {
    return putQuery<EmailTemplate, Partial<EmailTemplate>>({
      url: `api/v1/email-templates`,
      data,
    });
  }

  static deleteTemplate(id: number) {
    return deleteQuery({
      url: `api/v1/email-templates/${id}`,
    });
  }

  static getTemplateTypes() {
    const url = 'api/v1/email-templates/types';
    return getQuery<{ id: number; type: string; name: string }[]>({
      url,
    });
  }

  static toggleTemplateActual(id: number) {
    return putQuery<EmailTemplate, Partial<EmailTemplate>>({
      url: `api/v1/email-templates/${id}`,
    });
  }
}

export class MonitoringDevicesApi {
  static getDeviceStatus(deviceId: ID) {
    return getQuery<boolean>({
      url: `api/monitoring-devices/${deviceId}/status`,
    });
  }
}

// Рассылки
export class EmailNotificationsApi {
  static getList(options: QueryOptions, branchId?: number) {
    return getQuery<EmailNotificationResponse>({
      url: getEmailNotificationsListURL(options, branchId),
    });
  }

  static deleteNotification(id: ID) {
    return deleteQuery({
      url: `api/v1/email-notification/${id}`,
    });
  }

  static recoverNotification(id: ID) {
    return putQuery({
      url: `api/v1/email-notification/${id}/recover`,
    });
  }

  static trueDeleteNotification(id: ID) {
    return deleteQuery({
      url: `api/v1/email-notification/${id}/true-delete`,
    });
  }

  // ДОБАВИТЬ: метод для деактивации/активации
  static deactivateNotification(email: string) {
    return patchQuery({
      url: `api/v1/email-notification/${email}/deactivate-notification`,
    });
  }

  static activateNotification(email: string) {
    return patchQuery({
      url: `api/v1/email-notification/${email}/activate-notification`,
    });
  }

  static createNotification(data: Partial<IEmailNotification>) {
    return postQuery<IEmailNotification, Partial<IEmailNotification>>({
      url: 'api/v1/email-notification',
      data,
    });
  }

  static updateNotification(id: ID, data: Partial<IEmailNotification>) {
    return putQuery<IEmailNotification, Partial<IEmailNotification>>({
      url: `api/v1/email-notification/${id}`,
      data,
    });
  }

  static getNotificationById(id: ID) {
    return getQuery<IEmailNotification>({
      url: `api/v1/email-notification/${id}`,
    });
  }

  // ДОБАВЛЯЕМ: метод для удаления по email
  static deleteNotificationByEmail(email: string) {
    return deleteQuery({
      url: `api/v1/email-notification/email/${email}`,
    });
  }

  // ДОБАВЛЯЕМ: метод для восстановления по email
  static recoverNotificationByEmail(email: string) {
    return putQuery({
      url: `api/v1/email-notification/${email}/recover`,
    });
  }

  // ДОБАВЛЯЕМ: метод для полного удаления по email
  static trueDeleteNotificationByEmail(email: string) {
    return deleteQuery({
      url: `api/v1/email-notification/${email}/true-delete`,
    });
  }
}
