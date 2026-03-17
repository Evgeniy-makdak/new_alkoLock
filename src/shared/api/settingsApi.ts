/* eslint-disable @typescript-eslint/no-explicit-any */
import type { ID } from '@shared/types/BaseQueryTypes';

import { getQuery, patchQuery } from './baseQueryTypes';

export interface Setting {
  id: number;
  label: string;
  currentValue: number;
  defaultValue: number;
  unit: 'MINUTES' | 'DAYS' | 'ATTEMPTS';
  minValue: number;
  maxValue: number;
}

export class SettingsApi {
  static async getAllSettings(branchId?: ID) {
    const params: Record<string, any> = { sort: 'id' };
    // static async getAllSettings() {
    //   const params: Record<string, any> = { sort: 'id' };

    if (branchId) {
      params['any.assignment.branch.id.in'] = branchId;
    }

    const response = await getQuery<Setting[]>({
      url: 'api/v1/settings',
      config: {
        params,
      },
    });
    return response.data;
  }

  static async getSettingsById(id: number) {
    const response = await getQuery<Setting>({
      url: `api/v1/settings/${id}`,
    });
    return response.data;
  }

  static async updateSettings(updates: { id: number; value: number }[]) {
    return patchQuery({
      url: 'api/v1/settings',
      data: updates,
    });
  }

  static async resetSettings(ids: number[]) {
    return patchQuery({
      url: 'api/v1/settings/reset',
      data: { ids },
    });
  }
}
