import 'react-router-dom';

import { create } from 'zustand';

import { RoutePaths } from '@shared/config/routePathsEnum';
import { routers } from '@shared/config/routers';
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
  // TODO => переделать работу с доступами
  permissions: string[];
  setState: (data: {
    selectedBranchState?: SelectedBranchState;
    auth?: boolean;
    assignmentBranch?: SelectedBranchState;
    isAdmin?: boolean;
    email?: string;
    permissions?: string[];
  }) => void;
  logout: () => void;
}

const isNotUndefined = (value: unknown): value is undefined => {
  return typeof value !== 'undefined';
};

// TODO => убрать его когда кукки будут на бэке
const defaultData: Omit<AppStore, 'setState' | 'logout'> = {
  selectedBranchState: null,
  assignmentBranch: null,
  permissions: null,
  auth: false,
  isAdmin: false,
  email: null,
};

export const appStore = create<AppStore>()((set, get) => ({
  ...defaultData,
  setState: (data) => {
    const state = get();
    const selectedBranchState = data?.selectedBranchState || state.selectedBranchState;
    const auth = isNotUndefined(data?.auth) ? data.auth : state.auth;
    const isAdmin = isNotUndefined(data?.isAdmin) ? data?.isAdmin : state.isAdmin;
    const email = isNotUndefined(data?.email) ? data?.email : null;
    const permissions = data?.permissions ? data?.permissions : state?.permissions;
    const assignmentBranch = data?.assignmentBranch
      ? data?.assignmentBranch
      : state?.assignmentBranch;
    const newState = {
      ...state,
      selectedBranchState,
      auth,
      isAdmin,
      email,
      permissions,
      assignmentBranch,
    };
    set(newState);
  },
  logout: () => {
    set({
      selectedBranchState: null,
      auth: false,
      email: null,
      isAdmin: false,
      assignmentBranch: null,
      permissions: [],
    });

    cookieManager.removeAll();
    routers.navigate(RoutePaths.auth);
    window.location.reload();
  },
}));
