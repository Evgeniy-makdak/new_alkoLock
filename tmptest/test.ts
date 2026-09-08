import { type UseQueryOptions } from '@tanstack/react-query';
type X = Omit<UseQueryOptions<any, any, any, any>, 'queryKey' | 'queryFn'>;
const t: X = { enabled: true };
console.log(t);
