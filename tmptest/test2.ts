import { type QueryKey, type UndefinedInitialDataOptions, type UseQueryOptions } from '@tanstack/react-query';
import type { AxiosError } from 'axios';

type A = Omit<UndefinedInitialDataOptions<any, AxiosError<any>, any, QueryKey>, 'queryKey' | 'queryFn'>;
const s1: A = { enabled: true };
type B = Omit<UseQueryOptions<any, any, any, any>, 'queryKey' | 'queryFn'>;
const s2: B = { enabled: true };
console.log(s1, s2);
