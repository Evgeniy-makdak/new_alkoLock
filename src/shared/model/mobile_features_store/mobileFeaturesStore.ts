import { create } from 'zustand';

import type { MobileFeature } from '@shared/api/mobileFeaturesApi';
import { MobileFeaturesApi } from '@shared/api/mobileFeaturesApi';
import type { ID } from '@shared/types/BaseQueryTypes';

export type MobileFeatureFlags = {
  /** CHAT isEnabled — если false, иконка чата не рендерится */
  chatEnabled: boolean;
  /** CREATE_BINDING isEnabled — если false, «+» на Привязках неактивен для всех */
  createBindingEnabled: boolean;
  /**
   * Заявки на сервисный режим (SERVICE_MODE_DRIVER / SERVICE_MODE_SERVICE_WORKER).
   * Если любой из них isEnabled=false — кнопка «Включить» неактивна для всех.
   */
  serviceModeRequestsEnabled: boolean;
};

type MobileFeaturesStore = {
  features: MobileFeature[];
  flags: MobileFeatureFlags;
  loadedBranchId: ID | null;
  isLoading: boolean;
  setFeatures: (features: MobileFeature[], branchId?: ID | null) => void;
  upsertFeature: (feature: MobileFeature) => void;
  loadForBranch: (branchId: ID) => Promise<void>;
  reset: () => void;
};

const DEFAULT_FLAGS: MobileFeatureFlags = {
  chatEnabled: true,
  createBindingEnabled: true,
  serviceModeRequestsEnabled: true,
};

const computeFlags = (features: MobileFeature[]): MobileFeatureFlags => {
  const byType = (type: string) =>
    features.filter((f) => String(f.featureType || '').toUpperCase() === type);

  const chat = byType('CHAT');
  const createBinding = byType('CREATE_BINDING');
  const serviceModeDriver = byType('SERVICE_MODE_DRIVER');
  const serviceModeWorker = byType('SERVICE_MODE_SERVICE_WORKER');

  const isEnabledOrAbsent = (items: MobileFeature[]) =>
    items.length === 0 ? true : items.every((f) => f.isEnabled === true);

  // если хотя бы одна из «Заявки на сервисный режим» выключена — запрет для всех
  const serviceModeItems = [...serviceModeDriver, ...serviceModeWorker];
  const serviceModeRequestsEnabled =
    serviceModeItems.length === 0
      ? true
      : serviceModeItems.every((f) => f.isEnabled === true);

  return {
    chatEnabled: isEnabledOrAbsent(chat),
    createBindingEnabled: isEnabledOrAbsent(createBinding),
    serviceModeRequestsEnabled,
  };
};

export const mobileFeaturesStore = create<MobileFeaturesStore>()((set, get) => ({
  features: [],
  flags: { ...DEFAULT_FLAGS },
  loadedBranchId: null,
  isLoading: false,

  setFeatures: (features, branchId) => {
    set({
      features,
      flags: computeFlags(features),
      loadedBranchId: branchId ?? get().loadedBranchId,
    });
  },

  upsertFeature: (feature) => {
    const prev = get().features;
    const id = String(feature.id);
    const next = prev.some((f) => String(f.id) === id)
      ? prev.map((f) => (String(f.id) === id ? { ...f, ...feature } : f))
      : [...prev, feature];
    set({
      features: next,
      flags: computeFlags(next),
    });
  },

  loadForBranch: async (branchId) => {
    if (branchId == null || branchId === '') return;

    const current = get();
    // не дергаем повторно тот же филиал без нужды, пока уже грузится
    if (current.isLoading && String(current.loadedBranchId) === String(branchId)) return;

    set({ isLoading: true });
    try {
      const response = await MobileFeaturesApi.getList({
        branchId,
        page: 0,
        size: 100,
      });
      if (response?.isError) {
        set({ isLoading: false });
        return;
      }
      const content = response?.data?.content ?? [];
      set({
        features: content,
        flags: computeFlags(content),
        loadedBranchId: branchId,
        isLoading: false,
      });
    } catch {
      set({ isLoading: false });
    }
  },

  reset: () =>
    set({
      features: [],
      flags: { ...DEFAULT_FLAGS },
      loadedBranchId: null,
      isLoading: false,
    }),
}));

export const selectMobileFeatureFlags = (state: MobileFeaturesStore) => state.flags;
