import { type QueryKey, type UndefinedInitialDataOptions } from '@tanstack/react-query';
import type { AxiosError } from 'axios';
import type { IError } from '@shared/types/BaseQueryTypes';

type A = Omit<UndefinedInitialDataOptions<unknown, AxiosError<IError>, unknown, QueryKey>, 'queryKey' | 'queryFn'>;
const s1: A = { enabled: true };
type B = Omit<UndefinedInitialDataOptions<any, AxiosError<IError>, any, QueryKey>, 'queryKey' | 'queryFn'>;
const s2: B = { enabled: true };
console.log(s1, s2);
