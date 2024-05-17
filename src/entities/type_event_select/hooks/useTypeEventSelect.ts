import { AppConstants } from '@app/index';
import { mapOptions } from '@shared/ui/search_multiple_select';

import { useTypeEventSelectApi } from '../api/useTypeEventSelectApi';

export const useTypeEventSelect = () => {
  const { events, isLoading, isError } = useTypeEventSelectApi();
  // TODO => поле data.event поменять на data.value когда на бэке поменяется api
  // TODO => убрать isError когда поменяется  api => сейчас с 2-разных бэков приходит поля либо
  // event либо value соответственно, поэтому сделан такой вариант  isError ? data.value : data.event
  const marksCarList = mapOptions(isError ? AppConstants.eventTypesList : events, (data) => [
    data.label,
    isError ? data.value : data.event,
  ]);

  return { marksCarList, isLoading };
};
