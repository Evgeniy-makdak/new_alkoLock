/* eslint-disable react-hooks/exhaustive-deps */

/* eslint-disable @typescript-eslint/no-unused-vars */
import { appStore } from '@shared/model/app_store/AppStore';
import type { Value } from '@shared/ui/search_multiple_select';
import ArrayUtils from '@shared/utils/ArrayUtils';

import { useSelectedBranchOfficeSync } from './useSelectedBranchOfficeSync';

export const useNavbarBranchSelect = () => {
  const { selectedBranchState, setState, isAdmin } = appStore((state) => state);

  const { setOffice } = useSelectedBranchOfficeSync();

  const onChangeBranch = (_type: string, value: string | Value | (string | Value)[]) => {
    if (!isAdmin) return;
    const arrVal = ArrayUtils.getArrayValues(value);

    if (arrVal.length === 0) return;

    const selectedBranchState = {
      id: arrVal[0].value,
      name: arrVal[0].label,
    };
    setState({
      selectedBranchState,
    });
    setOffice(selectedBranchState);
  };

  return {
    value: [
      {
        value: selectedBranchState?.id,
        label: selectedBranchState?.name,
      },
    ],
    isGlobalAdmin: isAdmin,
    onChangeBranch,
  };
};
