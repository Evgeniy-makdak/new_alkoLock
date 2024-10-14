import type { AxiosRequestConfig } from 'axios';

import {
  getAlcolockListURL,
  getAlcolocksURL,
  getAlkolockURL,
  getAttachmentURL,
  getAttachmentsDeleteItemURL,
  getBranchListUrl,
  getCarListURL,
  getCarSwitchBranchUrl,
  getCreateAlkolocksURL,
  getCreateAttachmentApiURL,
  getDriverAllotmentsByBranchId,
  getEventListCountForAutoServiceURL,
  getEventListForAutoServiceURL,
  getEventsApiURL,
  getEventsHistoryURL,
  getEventsTypeUrl,
  getMarksCarURL,
  getRolesListURL,
  getUrlCountEventsQuery,
  getUserListURL,
  getUserListURLToAttachments,
} from '@shared/lib/getUrlForQueries';
import type { QueryOptions } from '@shared/types/QueryTypes';

import {
  type ActivateServiceModeOptions,
  AddPhotoResponse,
  type AttachmentsCreateData,
  type ChangeCarBody,
  type ChangePasswordData,
  type CreateAlcolockData,
  type CreateCarBody,
  type CreateRoleData,
  type EventsOptions,
  type IAccount,
  type IAccountUser,
  type IAlcolock,
  type IAttachmentItems,
  type IAuthenticate,
  type IBranch,
  ICar,
  type ID,
  type IDeviceAction,
  type IEventsType,
  type IRole,
  IUser,
  type PhotoUrlsFromGalleryResponse,
  type ResetPasswordData,
  type UserDataLogin,
} from '../types/BaseQueryTypes';
import { deleteQuery, getQuery, patchQuery, postQuery, putQuery } from './baseQueryTypes';

// import { number } from 'yup';

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
  static changeAvatarById(photoId: ID, userId: ID) {
    return putQuery({
      url: `api/v1/users/photos/${userId}/photos/${photoId}`,
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
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  }
  static setPhotoAsAvatar(photoId: ID, userId: ID) {
    return putQuery({ url: `api/v1/users/photos/${userId}/photos/${photoId}` });
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

  static getList(options: QueryOptions, widthCars = false) {
    return getQuery<{ content: IUser[]; totalElements: number }>({
      url: getUserListURL(options, widthCars),
    });
  }

  static getListToAttachments(options: QueryOptions, widthCars = false) {
    return getQuery<{ content: IUser[]; totalElements: number }>({
      url: getUserListURLToAttachments(options, widthCars, false),
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
  static resetPassword(data: ResetPasswordData) {
    return postQuery({ url: `api/account`, data });
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
  static getCarsList(options: QueryOptions) {
    return getQuery<{ content: ICar[]; totalElements: number }>({ url: getCarListURL(options) });
  }

  static getMarksCarList(options: QueryOptions) {
    return getQuery<string[]>({ url: getMarksCarURL(options) });
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
  static getList(options: QueryOptions) {
    return getQuery<{ content: IDeviceAction[]; totalElements: number }>({
      url: getEventsApiURL(options),
    });
  }
  static getCount(options: QueryOptions) {
    return getQuery<number>({ url: getUrlCountEventsQuery(options) });
  }
  static getEventItem(id: ID) {
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

  static getEventsHistory(options: EventsOptions) {
    return getQuery<{ content: IDeviceAction[]; totalElements: number }>({
      url: getEventsHistoryURL(options),
    });
  }

  static getEventsTypeList() {
    return getQuery<IEventsType>({ url: getEventsTypeUrl() });
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
  static deleteBranch(id: ID) {
    return deleteQuery<unknown>({ url: `api/branch-offices/${id}` });
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
}
