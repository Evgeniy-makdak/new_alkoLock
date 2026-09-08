import { type QueryKey, type UndefinedInitialDataOptions, type UseQueryOptions } from '@tanstack/react-query';
import type { AxiosError } from 'axios';

type A = UndefinedInitialDataOptions<any, AxiosError<any>, any, QueryKey>;
type K = keyof A;
const k: K = 'enabled';
type B = UseQueryOptions<any, any, any, any>;
const k2: keyof B = 'enabled';
console.log(k, k2);
