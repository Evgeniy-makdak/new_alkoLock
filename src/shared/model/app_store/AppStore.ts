import 'react-router-dom';

import { enqueueSnackbar } from 'notistack';
import { create } from 'zustand';

import { writeGhostPrankRuntimeEnabled } from '@pages/events/config/eventsGhostPrankEnabled';
import { RoutePaths } from '@shared/config/routePathsEnum';
import { routers } from '@shared/config/routers';
import { StorageKeys } from '@shared/const/storageKeys';
import type { ID } from '@shared/types/BaseQueryTypes';
import { cookieManager } from '@shared/utils/cookie_manager';

export type SelectedBranchState = {
  id: ID;
  name: string;
};

export interface AppStore {
  selectedBranchState: SelectedBranchState | null;
  auth: boolean;
  isAdmin: boolean;
  email: string | null;
  assignmentBranch: SelectedBranchState | null;
  authId: ID | null;
  permissions: string[];
  authError: string | null;
  fullName: string | null;
  setState: (data: {
    selectedBranchState?: SelectedBranchState;
    auth?: boolean;
    assignmentBranch?: SelectedBranchState;
    isAdmin?: boolean;
    email?: string;
    permissions?: string[];
    id?: ID;
    fullName?: string;
  }) => void;
  logout: (showSnackbar?: boolean) => void;
  setAuthError: (message: string | null) => void;
  setUserFullName: (fullName: string) => void;
}

const isNotUndefined = (value: unknown): value is undefined => {
  return typeof value !== 'undefined';
};

const defaultData: Omit<AppStore, 'setState' | 'logout' | 'setAuthError' | 'setUserFullName'> = {
  selectedBranchState: null,
  assignmentBranch: null,
  permissions: [],
  auth: false,
  isAdmin: false,
  email: null,
  authId: null,
  authError: null,
  fullName: null,
};

export const appStore = create<AppStore>()((set, get) => ({
  ...defaultData,
  setState: (data) => {
    const state = get();
    const authId = data?.id || state.authId;
    const selectedBranchState = data?.selectedBranchState || state.selectedBranchState;
    const auth = isNotUndefined(data?.auth) ? data.auth : state.auth;
    const isAdmin = isNotUndefined(data?.isAdmin) ? data?.isAdmin : state.isAdmin;
    const email = isNotUndefined(data?.email) ? data?.email : null;
    const permissions = data?.permissions ? data?.permissions : state?.permissions;
    const assignmentBranch = data?.assignmentBranch
      ? data?.assignmentBranch
      : state?.assignmentBranch;
    const userFullName = data?.fullName || state.fullName;

    const newState = {
      ...state,
      selectedBranchState,
      auth,
      isAdmin,
      email,
      permissions,
      assignmentBranch,
      authId,
      userFullName,
    };
    set(newState);
  },
  logout: (showSnackbar) => {
    if (showSnackbar) {
      enqueueSnackbar('Сессия авторизации закончена, авторизуйтесь заново', {
        variant: 'error',
        persist: true,
        autoHideDuration: null,
      });
    }

    set({
      selectedBranchState: null,
      auth: false,
      email: null,
      isAdmin: false,
      assignmentBranch: null,
      authId: null,
      permissions: [],
      fullName: null,
    });

    cookieManager.removeAll();
    routers.navigate(RoutePaths.auth);
    localStorage.removeItem(StorageKeys.OFFICE);
    /* Шутка только по горячим клавишам; после выхода флаг сбрасывается. */
    writeGhostPrankRuntimeEnabled(false);
  },
  setAuthError: (message) => set({ authError: message }),
  setUserFullName: (fullName: string) => set({ fullName: fullName }),
}));
