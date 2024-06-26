import type { AxiosError } from 'axios';

import { QueryKeys } from '@shared/const/storageKeys';
import { appStore } from '@shared/model/app_store/AppStore';
import type { ID, IError } from '@shared/types/BaseQueryTypes';
import type { QueryOptions } from '@shared/types/QueryTypes';
import { type QueryKey, type UndefinedInitialDataOptions, useQuery } from '@tanstack/react-query';

const isOptionsValue = (options: QueryOptions | ID): options is QueryOptions => {
  if (typeof options === 'object') return true;
  return false;
};

const getOptions = (options: QueryOptions, queryBranch: ID): QueryOptions => {
  const filterOp = (options && options?.filterOptions) || {};
  return {
    ...options,
    filterOptions: {
      ...filterOp,
      branchId: queryBranch,
    },
  };
};

/**
 * @prop settings - параметры настроек хука useQuery
 * @prop triggerOnBranchChange - нужно ли делать запрос при смене офиса (обычно нужно)
 * @prop options - обычно это query параметры для запроса, но иногда это может быть ID или что другое в зависимости от требований запроса (смотри в swagger)
 */
type OtherArgs<T, D> = {
  settings?: Omit<
    UndefinedInitialDataOptions<T, AxiosError<IError>, T, QueryKey>,
    'queryKey' | 'queryFn'
  >;
  triggerOnBranchChange?: boolean;
  options?: QueryOptions | ID | D;
};

/**
 *
 * @param key - ключи запроса которые хранятся в enum {@link QueryKeys} - для сохранение и управлением запросами из вне или другого запроса
 * @param fn - функция Promise которая и отправляет запрос на бэк - используется  Axios и все они описываются shared/api/baseQuerys.ts в соответствущем классе
 * @param param2 - объект с полями -
 * @field settings - параметры настроек хука useQuery
 * @field triggerOnBranchChange - нужно ли делать запрос при смене офиса (обычно нужно)
 * @field  options - обычно это query параметры для запроса, но иногда это может быть ID или что другое в зависимости от требований запроса (смотри в swagger)
 * @returns вернет объект UseQueryResult<T, AxiosError<IError>> - можно посмотреть в документации {@link https://tanstack.com/query/v5/docs/framework/react/reference/|useQuery tanstack/react-query}
 */
export const useConfiguredQuery = <T, D extends QueryOptions>(
  key: QueryKeys[],
  fn: (options?: QueryOptions | ID) => Promise<T>,
  { options, settings, triggerOnBranchChange = true }: OtherArgs<T, D>,
) => {
  const isOptions = isOptionsValue(options);
  const filterOptions = isOptions && options?.filterOptions;
  const branchId = filterOptions && filterOptions?.branchId;
  const selectedBranchState = appStore((state) => state.selectedBranchState);
  const queryBranch = branchId ? branchId : selectedBranchState?.id;
  const newOptions = isOptions ? getOptions(options, queryBranch) : options;

  const readyOptions = isOptions ? Object.values(newOptions) : newOptions;

  const readyBranch = triggerOnBranchChange ? queryBranch : null;

  const readyOptionsArr = Array.isArray(readyOptions) ? readyOptions : [readyOptions];

  const data = useQuery<T, AxiosError<IError>, T, QueryKey>({
    queryKey: [...key, readyBranch, ...readyOptionsArr],
    queryFn: () => {
      return fn(newOptions ? newOptions : {});
    },
    ...(settings || {}),
  });

  return data;
};
