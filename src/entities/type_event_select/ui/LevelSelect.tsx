import { useMemo } from 'react';

import { appStore } from '@shared/model/app_store/AppStore';
import {
  SearchMultipleSelect,
  type SearchMultipleSelectProps,
} from '@shared/ui/search_multiple_select';
import { useEventClasses } from '@widgets/events_table/hooks/useEventClasses';

type LevelSelectProps<T> = Omit<SearchMultipleSelectProps<T>, 'values'>;

export const LevelSelect = <T,>(props: LevelSelectProps<T>) => {
  const { eventClasses, loading, setSearchTerm } = useEventClasses();

  // Получаем данные о пользователе и филиале
  const { authId } = appStore();
  const currentBranchId = appStore.getState().selectedBranchState?.id as number;
  const currentUserId = authId ? Number(authId) : undefined;

  // Фильтруем eventClasses в зависимости от условий
  const filteredClasses = useMemo(() => {
    return eventClasses.filter((eventClass) => {
      // Если currentUserId !== 1 И currentBranchId = 570786, скрываем "Ошибка"
      if (currentUserId !== 1 && currentBranchId === 570786) {
        return eventClass.label !== 'Ошибка';
      }
      // Во всех остальных случаях показываем все
      return true;
    });
  }, [eventClasses, currentUserId, currentBranchId]);

  const transformedClasses = filteredClasses.map((item) => ({
    value: item.id,
    label: item.label,
  }));

  return (
    <SearchMultipleSelect
      isLoading={loading}
      values={transformedClasses}
      onReset={() => {}}
      onInputChange={(e) => setSearchTerm(e)}
      {...props}
    />
  );
};
