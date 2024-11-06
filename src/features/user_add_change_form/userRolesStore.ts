import create from 'zustand';

interface UserRolesStore {
  selectedRoleIds: string[];
  setSelectedRoleIds: (ids: string[]) => void;
}

export const useUserRolesStore = create<UserRolesStore>((set) => ({
  selectedRoleIds: [],
  setSelectedRoleIds: (ids) => set({ selectedRoleIds: ids }),
}));
