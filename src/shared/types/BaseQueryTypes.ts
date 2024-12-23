import { SnackbarMessage } from 'notistack';

import { Permissions } from '../config/permissionsEnums';
import type { QueryOptions } from './QueryTypes';

interface IUserDataMain {
  email: string;
  firstName: string;
  id: ID;
  middleName: string;
  surname: string;
}

interface IDriver {
  isActive: boolean;
  id: ID;
  licenseCode: string;
  licenseIssueDate: string;
  licenseClass: string[];
  userAccount: IAccountUser;
  vehicleAllotments: { vehicle: ICar }[];
  licenseExpirationDate: string;
}

export type IEventType = {
  id?: ID;
  label: string;
  // TODO => изменить название ключа event когда на бэке поменяется api на value
  event?: string;
  value?: string;
};

export type IEventsType = {
  content: IEventType[]; // Массив событий
  pageable: object; // Типизируйте более строго, если знаете структуру
  totalElements: number;
  totalPages: number;
  last: boolean;
  first: boolean;
};

// export type IEventsType = IEventType[];

export interface Role {
  id: ID;
  createdAt: string;
  userAction: IUserDataMain;
  group: {
    createdAt: string;
    id: ID;
    lastModifiedAt: string;
    name: string;
    systemGenerated: boolean;
  };
}

export interface IAccountUser {
  id: ID;
  login: string;
  firstName: string;
  surname: string;
  middleName: string;
  email: string;
  phone: string;
  birthDate: string;
  activated: boolean;
  disabled: boolean;
  driver: IDriver;
  groupMembership: [
    {
      id: ID;
      group: {
        id: ID;
        name: string;
        systemGenerated: boolean;
        userGroupPermissions: [
          {
            id: ID;
            permission: {
              name: string;
              manuallyAssignable: boolean;
            };
            createdAt: string;
            userAction: {
              id: ID;
              email: string;
              firstName: string;
              surname: string;
              middleName: string;
            };
            group: string;
          },
        ];
        createdAt: string;
        userAction: IUserDataMain;
        lastModifiedAt: string;
        lastModifiedBy: IUserDataMain;
      };
      user: {
        id: ID;
        login: string;
        firstName: string;
        surname: string;
        middleName: string;
        email: string;
        phone: string;
        birthDate: string;
        activated: boolean;
        disabled: boolean;
        driver: string;
        groupMembership: [string];
        assignment: {
          branch: IBranch;
          createdAt: string;
          userAction: IUserDataMain;
        };
        createdAt: string;
        userAction: IUserDataMain;
        lastModifiedAt: string;
        lastModifiedBy: IUserDataMain;
      };
      createdAt: string;
      userAction: IUserDataMain;
    },
  ];
  assignment: {
    branch: IBranch;
    createdAt: string;
    userAction: IUserDataMain;
  };
  createdAt: string;
  userAction: IUserDataMain;
  lastModifiedAt: string;
  lastModifiedBy: IUserDataMain;
  permissions: string[];
}

export interface IUser {
  firstName: string;
  surname: string;
  middleName: string;
  fullName: string;
  branchOffice: any;
  activated: boolean;
  phone?: string;
  createdAt: string;
  birthDate?: string;
  email: string;
  login: string;
  id: ID;
  groupMembership: Role[];
  lastModifiedBy: IUserDataMain;
  assignment: {
    branch: Branch;
    createdAt: string;
    userAction: IUserDataMain;
  };
  driver: IDriver;
  disabled: boolean;
}

export interface IAttachmentItems {
  vehicleBind: any;
  createdAt: string;
  createdBy: {
    id: number;
    email: string;
    firstName: string;
    surname: string;
    middleName: string;
  };
  userAction: IUser;
  id: ID;
  driver: IDriver;
  vehicle: ICar;
  surname: string;
  firstName: string;
  middleName: string;
  email: string;
}

export interface AttachmentsCreateData {
  driverId: ID;
  vehicleId: ID;
}

export interface ICar {
  color: string;
  id: ID;
  manufacturer: string;
  model: string;
  registrationNumber: string;
  type: string;
  vin: string;
  year: number;
  createdAt: string;
  monitoringDevice: {
    id: string;
    name: string;
    serialNumber: string;
    serviceId: string;
    mode: string;
    modeUpdatedAt: string;
  };
  assignment?: {
    branch: Branch;
    createdAt: string;
  };
  action?: {
    device: {
      serialNumber: string;
    };
  };
}

interface IActiveActions {
  id: ID;
  uuid: string;
  type: string;
  status: string;
  startedAt: string;
  finishedAt: string;
  vehicleRecord: {
    registrationNumber: string;
    manufacturer: string;
    model: string;
    year: number;
    vin: string;
  };
  vehicle: {
    id: ID;
    branchId: ID;
  };
  seen: boolean;
  events: IEvents;
  createdAt: string;
  userAction: IUser;
}

type IErrors = {
  field: string;
  message: string;
  detail?: string;
};

export type IAuthenticate = {
  response: {
    detail: SnackbarMessage;
    status: number;
    data: {
      detail: SnackbarMessage;
      fieldErrors: IErrors[];
    };
  };
  idToken: string;
  refreshToken: string;
  needChangePassword: boolean;
};

export interface IAlcolock {
  longitude: string | number;
  latitude: string | number;
  modeResetAt?: string;
  id: ID;
  name: string;
  serialNumber: number;
  serviceId: string;
  mode: string;
  modeUpdatedAt: string;
  lastModifiedAt: string;
  activeActions: IActiveActions[];
  createdBy: {
    id: number;
    email: string;
    firstName: string;
  };
  createdAt: string;
  vehicleBind: {
    userAction: IUser;
    createdAt: string;
    vehicle: ICar;
    createdBy: IUser;
  };

  assignment: {
    branch: Branch;
    createdAt: string;
    userAction: IUserDataMain;
  };

  userAction: IUser;

  lastModifiedBy: {
    id: ID;
    email: string;
    firstName: string;
    surname: string;
    middleName: string;
  };
}

export enum EventType {
  APP_ACKNOWLEDGED = 'Подтверждение приложением',
  SERVER_REQUEST = 'Запрос сервера',
  APP_REQUEST = 'Запрос приложения',
  REJECTED = 'Заявка на сервисный режим отклонена',
  ACCEPTED = 'Заявка на сервисный режим обработана',
  OFFLINE_DEACTIVATION = 'OFFLINE_DEACTIVATION',
  OFFLINE_ACTIVATION = 'OFFLINE_ACTIVATION',
  MAINTENANCE = 'Сервисный',
}
/**
 * @type IEvent - сущность "событие" которое приходит с бэка
 *  @field eventType - тип события
 *  */
export type IEvent = {
  timestamp: string | number | Date;
  eventType: EventType;
  extra: {
    qrCode: string;
    duration: string;
  };
  id: ID;
  latitude: number;
  longitude: number;
  occurredAt: string;
  reportedAt: string;
  userRecord: {
    email: string;
    firstName: string;
    middleName: string;
    surname: string | null;
  };
  user: { id: ID; branchId: ID };
  action: {
    eventType: string;
  };
};

export type IEvents = IEvent[];

export interface ISummary {
  longitude: string | number;
  photoFileName: string;
  testResult?: string;
  stateError?: string;
  stateErrorCode?: string;
  latitude: string | number;
  appErrorCode: string;
  appErrorMessage: string;
  exhaleError: string;
  exhaleErrorCode: number;
  initiator: number;
  lat: number;
  lon: number;
  qrCode: string;
  result: string;
}

export interface IDeviceAction {
  vehicle: ICar;
  initiator: Partial<IUser>;
  handler: Partial<IUser>;
  level: string;
  eventType: string;
  latitude: number;
  longitude: number;
  occurredAt: string | Date;
  timestamp: string | Date;
  createdAt: string;
  finishedAt: string;
  id: string;
  seen: boolean;
  startedAt: string;
  status: string;
  type: string;
  uuid: string;
  userAction: IUser;
  userRecord: IUser;
  device: IAlcolock;
  events: IEvents;
  summary: ISummary;
  vehicleRecord: ICar;
  action: {
    id: any;
    device: any;
    vehicleRecord: ICar;
  };
}

type FieldError = {
  objectName: string;
  field: string;
  message: string;
};

export interface IError {
  detail: string;
  instance: string;
  message: string;
  path: string;
  status: number;
  title: string;
  type: string;
  fieldErrors: FieldError[];
}

export interface AuthError {
  field: string;
  message: string;
  objectName: string;
}

export interface Branch {
  id: ID;
  name: string;
}

interface Assignment {
  branch: Branch;
  createdAt: string;
  userAction: IUser;
}

interface GroupMembership {
  id: 11;
  group: { id: ID; name: string; systemGenerated: boolean };
}

export type ID = string | number | null | undefined;

export interface IAccount {
  activated: boolean;
  assignment: Assignment;
  disabled: boolean;
  email: string;
  firstName: string;
  groupMembership: GroupMembership[];
  id: ID;
  middleName: string;
  login: string;
  surname: string;
  permissions: IPermissions;
}

export interface IBranch {
  id: ID;
  name: string;
  parentOffice: string;
  childOffices: string[];
  createdAt: string;
  createdBy: {
    id: number;
    email: string;
    firstName: string;
    middleName: string;
  };
  userAction: {
    id: ID;
    email: string;
    firstName: string;
    surname: string;
    middleName: string;
  };
  lastModifiedAt: string;
  lastModifiedBy: {
    id: ID;
    email: string;
    firstName: string;
    surname: string;
    middleName: string;
  };
  systemGenerated: boolean;
}

export interface IUserGroupPermission {
  createdAt: string;
  userAction: { id: ID; email: string; firstName: string; middleName: string };
  id: ID;
  permission: {
    manuallyAssignable: boolean;
    name: Permissions;
  };
}

export type IPermissions = Permissions[];

export interface IRole {
  createdAt: string;
  userAction: { id: ID; email: string; firstName: string; middleName: string };
  id: ID;
  lastModifiedAt: string;
  lastModifiedBy: { id: ID; email: string; firstName: string; middleName: string };
  name: string;
  systemGenerated: boolean;
  userGroupPermissions: IUserGroupPermission[];
}

/// RESPONSES

export interface CreateCarBody extends ChangeCarBody {
  branchId: ID;
}

export interface ChangeCarBody {
  registrationNumber: string;
  manufacturer: string;
  model: string;
  year: number;
  vin: string;
  type: ID;
  color: ID;
}

export interface VehicleColor {
  key: any;
  label: string;
  value: number;
}

export interface CreateAlcolockData {
  vehicleId?: ID;
  branchId: ID;
  name: string;
  serviceId: string | number;
  serialNumber: number | string;
}

export interface EventsOptions extends QueryOptions {
  userId?: ID;
  carId?: ID;
  alcolockId?: ID;
}

export interface ActivateServiceModeOptions {
  duration: number | undefined | null;
  deviceId: ID;
  isDeactivate: boolean;
}

/**
 * @field hash - чек сумма файла кодирована с помощью MD5 и Base64url
 * @field image - сам фаил с input type file без изменений
 */
export type UserPhotoDTO = {
  hash: string;
  image: File | Blob;
};

export type UserPhotoDTOs = UserPhotoDTO[];

export type CreateUserData = {
  firstName: string;
  surname: string;
  middleName?: string;
  email: string;
  disabled: boolean;
  phone?: string;
  birthDate?: string;
  driver?: {
    licenseCode?: string;
    licenseIssueDate?: string;
    licenseExpirationDate?: string;
    licenseClass?: string[];
  };
  password?: string;
  userGroups?: ID[];
  branchId: ID;
  userPhotoDTO?: UserPhotoDTO;
  [key: string]: any;
};

export type CreateRoleData = {
  name: string;
  permissions: IPermissions;
  branchOfficeId?: ID;
};
export type ChangeRoleData = CreateRoleData;

export type ChangePasswordData = {
  currentPassword: string;
  newPassword: string;
  confirmNewPassword: string;
};

export type ResetPasswordData = {
  email: string;
};

export type ChangePassword = {
  currentPassword: string;
  newPassword: string;
  repeatNewPassword: string;
  confirmNewPassword: string;
};

export type UserDataLogin = {
  detail?: string;
  username: string | null;
  password: string | null;
  rememberMe: boolean;
  email: string;
};

export type AddPhotoItemResponse = {
  hash: string;
  id: ID;
  fileName?: string;
  createdAt: string;
  userAction: {
    id: ID;
    email: string;
    firstName: string;
    surname: string;
    middleName: string;
  };
  userId: ID;
  photoUrl: string;
  default: boolean;
};

export type AddPhotoResponse = AddPhotoItemResponse[];

export type PhotoUrlsFromGalleryResponse = {
  body: string;
};
