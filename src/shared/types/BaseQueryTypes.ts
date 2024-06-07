import { Permissions } from '../config/permissionsEnums';
import type { QueryOptions } from './QueryTypes';

interface IUserDataMain {
  email: string;
  firstName: string;
  id: ID;
  lastName: string;
  middleName: string;
}

interface IDriver {
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

export type IEventsType = IEventType[];

export interface Role {
  id: ID;
  createdAt: string;
  createdBy: IUserDataMain;
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
  middleName: string;
  lastName: string;
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
            createdBy: {
              id: ID;
              email: string;
              firstName: string;
              middleName: string;
              lastName: string;
            };
            group: string;
          },
        ];
        createdAt: string;
        createdBy: IUserDataMain;
        lastModifiedAt: string;
        lastModifiedBy: IUserDataMain;
      };
      user: {
        id: ID;
        login: string;
        firstName: string;
        middleName: string;
        lastName: string;
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
          createdBy: IUserDataMain;
        };
        createdAt: string;
        createdBy: IUserDataMain;
        lastModifiedAt: string;
        lastModifiedBy: IUserDataMain;
      };
      createdAt: string;
      createdBy: IUserDataMain;
    },
  ];
  assignment: {
    branch: IBranch;
    createdAt: string;
    createdBy: IUserDataMain;
  };
  createdAt: string;
  createdBy: IUserDataMain;
  lastModifiedAt: string;
  lastModifiedBy: IUserDataMain;
  permissions: string[];
}

export interface IUser {
  firstName: string;
  middleName: string;
  lastName: string;
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
    createdBy: IUserDataMain;
  };
  driver: IDriver;
  disabled: boolean;
}

export interface IAttachmentItems {
  createdAt: string;
  createdBy: IUser;
  id: ID;
  driver: IDriver;
  vehicle: ICar;
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
  createdBy: IUser;
}

type IErrors = {
  field: string;
  message: string;
};

export type IAuthenticate = {
  response: {
    data: {
      fieldErrors: IErrors[];
    };
  };
  idToken: string;
  refreshToken: string;
};

export interface IAlcolock {
  modeResetAt?: string;
  id: ID;
  name: string;
  serialNumber: number;
  serviceId: string;
  mode: string;
  modeUpdatedAt: string;
  lastModifiedAt: string;
  activeActions: IActiveActions[];
  createdAt: string;
  vehicleBind: {
    createdBy: IUser;
    createdAt: string;
    vehicle: ICar;
  };

  assignment: {
    branch: Branch;
    createdAt: string;
    createdBy: IUserDataMain;
  };

  createdBy: IUser;

  lastModifiedBy: {
    id: ID;
    email: string;
    firstName: string;
    middleName: string;
    lastName: string;
  };
}

export enum EventType {
  APP_ACKNOWLEDGED = 'APP_ACKNOWLEDGED',
  SERVER_REQUEST = 'SERVER_REQUEST',
  APP_REQUEST = 'APP_REQUEST',
  REJECTED = 'REJECTED',
  ACCEPTED = 'ACCEPTED',
  OFFLINE_DEACTIVATION = 'OFFLINE_DEACTIVATION',
  OFFLINE_ACTIVATION = 'OFFLINE_ACTIVATION',
  MAINTENANCE = 'MAINTENANCE',
}
/**
 * @type IEvent - сущность "событие" которое приходит с бэка
 *  @field eventType - тип события
 *  */
export type IEvent = {
  eventType: EventType;
  extra: {
    qrCode: string;
    duration: string;
  };
  id: ID;
  latitude: number;
  longitude: number;
  occurredAt: string;
  createdEventAt: string;
  reportedAt: string;
  userRecord: {
    email: string;
    firstName: string;
    lastName: string;
    middleName: string | null;
  };
  user: { id: ID; branchId: ID };
};

export type IEvents = IEvent[];

export interface ISummary {
  photoFileName: string;
  testResult?: string;
  stateError?: string;
  stateErrorCode?: string;
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
  occurredAt: unknown;
  createdEventAt: unknown;
  createdAt: string;
  finishedAt: string;
  id: string;
  seen: boolean;
  startedAt: string;
  status: string;
  type: string;
  uuid: string;
  createdBy: IUser;
  device: IAlcolock;
  events: IEvents;
  summary: ISummary;
  vehicleRecord: ICar;
  action: { type: string };
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
  createdBy: IUser;
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
  lastName: string;
  login: string;
  middleName: string;
  permissions: IPermissions;
}

export interface IBranch {
  id: ID;
  name: string;
  parentOffice: string;
  childOffices: string[];
  createdAt: string;
  createdBy: {
    id: ID;
    email: string;
    firstName: string;
    middleName: string;
    lastName: string;
  };
  lastModifiedAt: string;
  lastModifiedBy: {
    id: ID;
    email: string;
    firstName: string;
    middleName: string;
    lastName: string;
  };
  systemGenerated: boolean;
}

export interface IUserGroupPermission {
  createdAt: string;
  createdBy: { id: ID; email: string; firstName: string; lastName: string };
  id: ID;
  permission: {
    manuallyAssignable: boolean;
    name: Permissions;
  };
}

export type IPermissions = Permissions[];

export interface IRole {
  createdAt: string;
  createdBy: { id: ID; email: string; firstName: string; lastName: string };
  id: ID;
  lastModifiedAt: string;
  lastModifiedBy: { id: ID; email: string; firstName: string; lastName: string };
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
  middleName: string;
  lastName?: string;
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
  [key: string]: any; // Индексная сигнатура
};

export type CreateRoleData = {
  name: string;
  permissions: IPermissions;
};
export type ChangeRoleData = CreateRoleData;

export type ChangePasswordData = {
  currentPassword: string;
  newPassword: string;
};
export type UserDataLogin = {
  username: string | null;
  password: string | null;
  rememberMe: boolean;
};

export type AddPhotoItemResponse = {
  hash: string;
  id: ID;
  fileName: string;
  createdAt: string;
  createdBy: {
    id: ID;
    email: string;
    firstName: string;
    middleName: string;
    lastName: string;
  };
  userId: ID;
  photoUrl: string;
  default: boolean;
};

export type AddPhotoResponse = AddPhotoItemResponse[];

export type PhotoUrlsFromGalleryResponse = {
  body: string;
};
