import { create } from 'zustand';

import type { MobileFeature } from '@shared/api/mobileFeaturesApi';
import { MobileFeaturesApi } from '@shared/api/mobileFeaturesApi';
import { isServiceModeRequestsFeature } from '@shared/lib/mobileFeatureKinds';

export type MobileFeatureFlags = {
  /** CHAT isEnabled — если false, иконка чата не рендерится */
  chatEnabled: boolean;
  /** CREATE_BINDING isEnabled */
  createBindingEnabled: boolean;
  /**
   * Заявки на сервисный режим — только featureType SERVICE_MODE_DRIVER.
   * SERVICE_MODE_SERVICE_WORKER и прочие фичи не влияют.
   */
  serviceModeRequestsEnabled: boolean;
  /**
   * То же условие, что serviceModeRequestsEnabled (баннер на алкозамках).
   */
  serviceModeDriverRequestsEnabled: boolean;
};

type MobileFeaturesStore = {
  features: MobileFeature[];
  flags: MobileFeatureFlags;
  isLoaded: boolean;
  isLoading: boolean;
  setFeatures: (features: MobileFeature[]) => void;
  upsertFeature: (feature: MobileFeature) => void;
  /** Мгновенно скрыть чат (иконка + окна) без ожидания повторного GET mobile-features */
  disableChat: () => void;
  /** Мгновенно заблокировать «Включить» сервисный режим + показать надпись о блокировке */
  disableServiceModeRequests: () => void;
  loadFeatures: () => Promise<void>;
  reset: () => void;
};

const DEFAULT_FLAGS: MobileFeatureFlags = {
  chatEnabled: true,
  createBindingEnabled: true,
  serviceModeRequestsEnabled: true,
  serviceModeDriverRequestsEnabled: true,
};

const computeFlags = (features: MobileFeature[]): MobileFeatureFlags => {
  const byType = (type: string) =>
    features.filter((f) => String(f.featureType || '').toUpperCase() === type);

  const chat = byType('CHAT');
  const createBinding = byType('CREATE_BINDING');
  const serviceModeRequests = features.filter(isServiceModeRequestsFeature);

  const isEnabledOrAbsent = (items: MobileFeature[]) =>
    items.length === 0 ? true : items.every((f) => f.isEnabled === true);

  const serviceModeRequestsEnabled = isEnabledOrAbsent(serviceModeRequests);

  return {
    chatEnabled: isEnabledOrAbsent(chat),
    createBindingEnabled: isEnabledOrAbsent(createBinding),
    serviceModeRequestsEnabled,
    serviceModeDriverRequestsEnabled: serviceModeRequestsEnabled,
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

  disableChat: () => {
    const prev = get().features;
    const next = prev.map((feature) =>
      String(feature.featureType || '').toUpperCase() === 'CHAT'
        ? { ...feature, isEnabled: false }
        : feature,
    );
    set({
      features: next,
      flags: { ...get().flags, chatEnabled: false },
    });
  },

  disableServiceModeRequests: () => {
    const prev = get().features;
    const next = prev.map((feature) =>
      isServiceModeRequestsFeature(feature) ? { ...feature, isEnabled: false } : feature,
    );
    set({
      features: next,
      flags: {
        ...get().flags,
        serviceModeRequestsEnabled: false,
        serviceModeDriverRequestsEnabled: false,
      },
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
