import { create } from 'zustand';

import type { MobileFeature } from '@shared/api/mobileFeaturesApi';
import { MobileFeaturesApi } from '@shared/api/mobileFeaturesApi';

export type MobileFeatureFlags = {
  /** CHAT isEnabled — если false, иконка чата не рендерится */
  chatEnabled: boolean;
  /** CREATE_BINDING isEnabled */
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
  isLoaded: boolean;
  isLoading: boolean;
  setFeatures: (features: MobileFeature[]) => void;
  upsertFeature: (feature: MobileFeature) => void;
  loadFeatures: () => Promise<void>;
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
  isLoaded: false,
  isLoading: false,

  setFeatures: (features) => {
    set({
      features,
      flags: computeFlags(features),
      isLoaded: true,
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

  loadFeatures: async () => {
    const current = get();
    if (current.isLoading) return;

    set({ isLoading: true });
    try {
      const response = await MobileFeaturesApi.getList({
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
        isLoaded: true,
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
      isLoaded: false,
      isLoading: false,
    }),
}));

export const selectMobileFeatureFlags = (state: MobileFeaturesStore) => state.flags;
