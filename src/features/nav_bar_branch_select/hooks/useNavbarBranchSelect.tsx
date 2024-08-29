/* eslint-disable @typescript-eslint/no-unused-vars */
import { useEffect } from 'react';

import { StorageKeys } from '@shared/const/storageKeys';
import { useLocalStorage } from '@shared/hooks/useLocalStorage';
import { appStore } from '@shared/model/app_store/AppStore';
import { ID } from '@shared/types/BaseQueryTypes';
import type { Value } from '@shared/ui/search_multiple_select';
import ArrayUtils from '@shared/utils/ArrayUtils';

import { useUserDataApi } from '../api/useUserDataApi';

export const useNavbarBranchSelect = () => {
  const { selectedBranchState, setState, isAdmin, assignmentBranch, auth } = appStore(
    (state) => state,
  );

  const { isLoading, branchList } = useUserDataApi();

  const { state: office, setItemState: setOffice } = useLocalStorage({
    key: StorageKeys.OFFICE,
    value: assignmentBranch,
  });

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

  useEffect(() => {
    if (isLoading || !branchList || !auth) return;
    const hasBranch = branchList.find(
      (branchInBase: { id: ID }) => branchInBase?.id === office?.id,
    );
    setState({
      selectedBranchState: isAdmin && office && hasBranch ? office : assignmentBranch,
    });
  }, [isLoading, auth]);

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
