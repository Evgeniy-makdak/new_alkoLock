import axios, {
  type AxiosError,
  AxiosHeaders,
  type AxiosRequestConfig,
  AxiosResponse,
} from 'axios';
import { enqueueSnackbar } from 'notistack';

import { API_URL } from '@shared/config/permissionsEnums';
import { RoutePaths } from '@shared/config/routePathsEnum';
import { StatusCode } from '@shared/const/statusCode';
import { appStore } from '@shared/model/app_store/AppStore';
import type { IError } from '@shared/types/BaseQueryTypes';
import type { HeaderReq } from '@shared/types/QueryTypes';
import { cookieManager } from '@shared/utils/cookie_manager';

export type AppAxiosResponse<T> = {
  isError?: boolean;
  message?: string;
  detail?: string;
} & AxiosResponse<T, IError>;

let countOfSnacksOfAuthError = 0;
axios.defaults.timeout = 1000000;
axios.defaults.maxRedirects = 10;

export function viewResErrors<T>(error: AxiosError<IError>): AppAxiosResponse<T> {
  const data = error?.response?.data;
  const message = typeof data === 'string' ? data : '';
  const fieldErrors = data?.fieldErrors;
  const status = error?.response?.status;
  const detail = data?.detail || '';
  const isAuthError = status === StatusCode.UNAUTHORIZED;
  const url = window.location.href;
  const isAuthPage = url.includes(RoutePaths.auth);

  if (isAuthError && countOfSnacksOfAuthError === 0 && !isAuthPage) {
    countOfSnacksOfAuthError += 1;
    const logout = appStore.getState().logout;
    const snackExit = () => {
      logout();
      countOfSnacksOfAuthError = 0;
    };
    enqueueSnackbar(`Сессия авторизации закончена, авторизуйтесь заново`, {
      onClose: snackExit,
      onExit: snackExit,
      variant: 'error',
    });
  }
  fieldErrors &&
    !isAuthError &&
    fieldErrors.map((e) => {
      enqueueSnackbar(e.message, {
        preventDuplicate: true,
        variant: 'error',
      });
    });

  return {
    data: null,
    message,
    detail,
    status,
    config: error?.config,
    headers: error?.request,
    statusText: error?.response?.statusText,
    isError: true,
  };
}

const returnHeaders = (headers: HeaderReq): HeaderReq => {
  const isAuth = headers?.isAuth ?? true;

  return new AxiosHeaders({
    ...headers,
    Authorization: isAuth ? `Bearer ${cookieManager.get('bearer')}` : '',
    Accept: '*/*',
  });
};

export function getQuery<T>({
  url,
  config,
  widthApiUrl = true,
}: {
  url: string;
  config?: AxiosRequestConfig;
  widthApiUrl?: boolean;
}): Promise<AppAxiosResponse<T>> {
  const requestUrl = widthApiUrl ? `${API_URL}${url}` : url;
  const headersReg = returnHeaders(config?.headers);

  return axios
    .get<IError, AppAxiosResponse<T>>(requestUrl, {
      ...config,
      headers: headersReg,
    })
    .catch((e) => {
      return viewResErrors(e);
    });
}

export function postQuery<T, D>({
  headers,
  url,
  data,
}: {
  headers?: HeaderReq;
  url: string;
  data?: D;
}) {
  const requestUrl = `${API_URL}${url}`;
  return axios
    .post<IError, AppAxiosResponse<T>>(requestUrl, data, {
      headers: returnHeaders(headers),
    })
    .catch((e) => {
      return viewResErrors<T>(e);
    });
}

export function putQuery<T, D>({
  headers,
  url,
  data,
}: {
  headers?: HeaderReq;
  url: string;
  data?: D;
}) {
  const requestUrl = `${API_URL}${url}`;
  return axios
    .put<IError, AppAxiosResponse<T>>(requestUrl, data, {
      headers: returnHeaders(headers),
    })
    .catch((e) => {
      return viewResErrors(e);
    });
}

export function deleteQuery<T>({
  headers,
  url,
  data,
  config,
}: {
  headers?: HeaderReq;
  url: string;
  data?: unknown;
  config?: AxiosRequestConfig;
}) {
  const requestUrl = `${API_URL}${url}`;
  return axios
    .delete<IError, AppAxiosResponse<T>>(requestUrl, {
      ...config,
      httpsAgent: 'fetch',
      data,
      headers: returnHeaders(headers),
    })
    .catch((e) => {
      return viewResErrors(e);
    });
}
