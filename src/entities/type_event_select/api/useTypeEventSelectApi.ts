import { EventsApi } from '@shared/api/baseQuerys';
import { QueryKeys } from '@shared/const/storageKeys';
import { useConfiguredQuery } from '@shared/hooks/useConfiguredQuery';
import { Values } from '@shared/ui/search_multiple_select';

export const useTypeEventSelectApi = (
  match: string,
  excludedIds?: number[],
  isIn?: boolean,
  useNewEndpoint: boolean = false,
  levelEvent?: Values,
  currentUserId?: number,
  currentBranchId?: number,
) => {
  // "Слабый выдох" (id 63) всегда исключаем из фильтра — он только в карточке "Тестирование прервано".
  // События 22, 23, 24 (Тестирование пройдено/не пройдено/прервано) отображаются в списке.
  const finalExcludedIds = Array.from(new Set([...(excludedIds ?? []), 63]));
  const finalIsIn = isIn || false;

  const { data, isLoading } = useConfiguredQuery(
    // @ts-expect-error: "Временное решение"
    [QueryKeys.EVENTS_TYPE_LIST, match, finalExcludedIds, levelEvent],
    () =>
      EventsApi.getEventsTypeList(
        { filterOptions: { match, level: levelEvent } },
        finalExcludedIds,
        finalIsIn,
        useNewEndpoint,
        currentUserId,
        currentBranchId,
      ),
    {},
  );

  return { events: data?.data, isLoading, isError: data?.isError };
};
