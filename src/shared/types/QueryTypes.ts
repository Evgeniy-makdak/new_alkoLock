import type { AxiosRequestConfig, AxiosResponse } from 'axios';

import type { GridSortDirection } from '@mui/x-data-grid';

import type { SortTypes } from '@shared/config/queryParamsEnums';
import type { Values } from '@shared/ui/search_multiple_select';
import type { QueryObserverResult } from '@tanstack/react-query';

import type { ID } from './BaseQueryTypes';

export type RefetchType<T> = () => Promise<
  QueryObserverResult<
    | AxiosResponse<T, any>
    | {
        data: any;
      },
    Error
  >
>;

/**
 * * @prop QueryOptions - @description опции для запроса (query параметры)
  @field  page? - @description страница на которой находится пользователь
  @field  equals?: string;
  @field  limit? - @description количество элементов на 1 странице (25, 50, 75 или 100);
  @field  sortBy? - смотри описание типа SortTypes в shared/config/queryParamsEnums;
  @field  searchQuery? - строка из поля поиска рядом с таблице - вставляется как query параметр;
  @field  order? - порядок сортировки элементов таблице ASK или DESK или null;
  @field  startDate? - дата ОТ которой сортируются сущности в таблице по созданию/добавлению/изменению... сущностей
  @field  endDate? дата ДО которой сортируются сущности в таблице по созданию/добавлению/изменению... сущностей
  @field  selectedBranch? - офис в котором искать сущности;
  @field  filterOptions? - дополнительные query параметры для непосредственного указания на сущности
    {
     ** @field drivers? ID водителей;
     ** @field   users? ID пользователей через запятую например 1,2,3;
     ** @field   brandCar? - ID марок машин через запятую например 1,2,3;
     ** @field   gosNumber? - строка гос номеров через запятую для поиска машин например С333ВВ 32,B111CC 111;
     ** @field   typeOfEvent?: - ключ строка тип событий через запятую напрямую - ALCOLOCK_EVENT_MAINTENANCE_MODE_ON,ALCOLOCK_EVENT_STARTED_MAINTENANCE_MODE;
     ** @field   cars? -  ID машин через запятую например 1,2,3;
     ** @field   alcolock? -  ID алкозамков через запятую например 1,2,3;
     ** @field   createLink? - дата в ISO формате создание привязки 1 сущности к другой
     ** @field   dateLink? - ;
     ** @field   carsByMake? - ID марок машин через запятую;
     ** @field   carsByLicense?: string;
     ** @field   eventsByType?: Values;
     ** @field   branchId?: ID;
     ** @field   notBranchId?: ID;
     ** @field   groupId?: string;
     ** @field   excludeId?: ID;
     ** @field   driverSpecified?: boolean;
    };
  @field  id?: ID;
  @field  headers?: HeaderReq;
 */
export type QueryOptions = {
  page?: number;
  equals?: string;
  limit?: number | string;
  sortBy?: SortTypes | string;
  searchQuery?: string;
  order?: GridSortDirection;
  startDate?: string;
  endDate?: string;
  selectedBranch?: ID;
  filterOptions?: {
    drivers?: string;
    users?: string;
    brandCar?: string;
    gosNumber?: string;
    typeOfEvent?: string;
    cars?: string;
    alcolock?: string;
    createLink?: string;
    dateLink?: string;
    carsByMake?: string;
    carsByLicense?: string;
    eventsByType?: Values;
    branchId?: ID;
    notBranchId?: ID;
    groupId?: string;
    excludeId?: ID;
    driverSpecified?: boolean;
  };
  id?: ID;
  headers?: HeaderReq;
};

export type HeaderReq = AxiosRequestConfig['headers'];
