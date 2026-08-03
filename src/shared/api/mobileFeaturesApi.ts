import type { ID } from '@shared/types/BaseQueryTypes';

import { getQuery, putQuery } from './baseQueryTypes';

export type MobileFeatureLevel = 'GLOBAL' | 'ROLE' | string;

export type MobileFeatureType = string;

export interface MobileFeatureGroup {
  id: ID;
  name: string;
  systemGenerated?: boolean;
}

export interface MobileFeature {
  id: ID;
  featureType: MobileFeatureType;
  label: string;
  group: MobileFeatureGroup | null;
  isEnabled: boolean;
  defaultValue?: boolean;
  isActive?: boolean;
  inactiveSince?: string | null;
  createdAt?: string;
  featureLevel: MobileFeatureLevel;
}

export interface MobileFeaturesPage {
  content: MobileFeature[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
  numberOfElements: number;
  empty: boolean;
}

export type UpdateMobileFeatureBody = {
  branchId: ID;
  isEnabled: boolean;
};

export type GetMobileFeaturesParams = {
  page?: number;
  size?: number;
  sort?: string | string[];
  distinct?: boolean;
};

export class MobileFeaturesApi {
  static getList({ page = 0, size = 100, sort, distinct }: GetMobileFeaturesParams = {}) {
    return getQuery<MobileFeaturesPage>({
      url: 'api/mobile-features',
      config: {
        params: {
          page,
          size,
          ...(sort != null ? { sort } : {}),
          ...(distinct != null ? { distinct } : {}),
        },
      },
    });
  }

  static updateFeature(id: ID, data: UpdateMobileFeatureBody) {
    return putQuery<MobileFeature, UpdateMobileFeatureBody>({
      url: `api/mobile-features/${id}`,
      data,
    });
  }

  /** Сброс фич к значениям по умолчанию одним запросом. */
  static resetToDefaults(branchId: ID, ids: ID[]) {
    return putQuery<MobileFeature[], { branchId: ID; ids: ID[] }>({
      url: 'api/mobile-features/reset',
      data: { branchId, ids },
    });
  }
}
