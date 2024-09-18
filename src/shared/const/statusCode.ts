export enum StatusCode {
  BAD_REQUEST = 400,
  UNAUTHORIZED = 401,
  FORBIDDEN = 403,
  NOT_FOUND = 404,
  CONFLICT = 409,
  SERVER_ERROR = 500,
  PASSWORD_CHANGE = 426,
  SUCCESS = 200, 
}

export const isSuccessStatus = (status: number): boolean => {
  return status === StatusCode.SUCCESS || status === 201;
};
