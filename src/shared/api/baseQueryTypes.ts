import axios, {
  type AxiosError,
  AxiosHeaders,
  type AxiosRequestConfig,
  AxiosResponse,
} from 'axios';

import { RoutePaths } from '@shared/config/routePathsEnum';
import { StatusCode } from '@shared/const/statusCode';
// import { appStore } from '@shared/model/app_store/AppStore';
import type { IError } from '@shared/types/BaseQueryTypes';
import type { HeaderReq } from '@shared/types/QueryTypes';
import { getBearerToken } from '@shared/utils/cookie_manager';

// import { enqueueSnackbar } from 'notistack';
import { configLoader } from '../../config/configLoader';

export const getApiUrl = (): string => {
  try {
    let url = configLoader.getConfig().apiUrl?.trim() ?? '';
    // Если apiUrl уже содержит /api (бэк подставляет полный путь к API), убираем его —
    // иначе получится дублирование: .../api/api/account
    url = url.replace(/\/api\/?$/, '');
    // Убираем завершающий слэш для единообразной конкатенации
    url = url.replace(/\/$/, '') || url;
    return url ? `${url}/` : `${window.location.origin}/`;
  } catch {
    return `${window.location.origin}/`;
  }
};

export type AppAxiosResponse<T> = {
  isError?: boolean;
  message?: string;
  detail?: string;
} & AxiosResponse<T, IError>;

// let countOfSnacksOfAuthError = 0;
axios.defaults.timeout = 1000000;
axios.defaults.maxRedirects = 10;

export function viewResErrors<T>(error: AxiosError<IError>): AppAxiosResponse<T> {
  const data = error?.response?.data;
  const message = typeof data === 'string' ? data : '';
  const status = error?.response?.status;
  const detail = data?.detail || '';
  const isAuthError = status === StatusCode.UNAUTHORIZED;
  const currentPath = window.location.pathname;

  // 409 «Функция Чат заблокирована…» — сразу скрыть чат у оператора без перезагрузки
  if (status === StatusCode.CONFLICT) {
    void import('@shared/lib/handleChatBlockedByAdmin').then(({ handleChatBlockedByAdminResponse }) => {
      handleChatBlockedByAdminResponse({
        status,
        detail: data?.detail,
        message: typeof data === 'object' && data ? (data as IError).message ?? message : message,
        title: typeof data === 'object' && data ? (data as { title?: string }).title : undefined,
        path: typeof data === 'object' && data ? (data as { path?: string }).path : undefined,
      });
    });
  }

  const excludedPaths = [
    RoutePaths.resetPassword,
    RoutePaths.confirmPassword,
    RoutePaths.forgetPassword,
    RoutePaths.auth,
  ];
  if (isAuthError && !excludedPaths.some((path) => currentPath.includes(path))) {
    localStorage.setItem('authError', 'Сессия авторизации закончена, авторизуйтесь заново');
    window.location.href = `${window.location.origin}${RoutePaths.auth}`;
  }

  return {
    data: null as unknown as T,
    message,
    detail,
    status: error?.response?.status ?? 0,
    config: error?.config as unknown as AxiosRequestConfig<IError>,
    headers: error?.request ?? {},
    statusText: error?.response?.statusText ?? '',
    isError: true,
  } as AppAxiosResponse<T>;
}

export const returnHeaders = (headers?: HeaderReq): HeaderReq => {
  const isAuth = headers?.isAuth ?? true;
  const token = isAuth ? getBearerToken() : null;

  return new AxiosHeaders({
    ...headers,
    Authorization: token ? `Bearer ${token}` : '',
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
  const requestUrl = widthApiUrl ? `${getApiUrl()}${url}` : url;
  const headersReg = returnHeaders(config?.headers);

  return axios
    .get<IError, AppAxiosResponse<T>>(requestUrl, {
      ...config,
      headers: headersReg,
    })
    .catch((e) => {
      if (axios.isAxiosError(e) && e.code === 'ERR_CANCELED') {
        return Promise.reject(e);
      }
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
  const requestUrl = `${getApiUrl()}${url}`;
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
  config,
}: {
  headers?: HeaderReq;
  url: string;
  config?: AxiosRequestConfig;
  data?: D;
}) {
  const requestUrl = `${getApiUrl()}${url}`;
  return axios
    .put<IError, AppAxiosResponse<T>>(requestUrl, data, {
      ...config,
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
  const requestUrl = `${getApiUrl()}${url}`;
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

export function patchQuery<T>({
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
  const requestUrl = `${getApiUrl()}${url}`;

  return axios
    .patch<IError, AppAxiosResponse<T>>(requestUrl, data, {
      ...config,
      headers: returnHeaders(headers),
    })
    .catch((e) => {
      return viewResErrors(e);
    });
}
