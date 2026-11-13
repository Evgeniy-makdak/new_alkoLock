import { beforeEach, describe, expect, it, jest } from '@jest/globals';

import { dashboardStore } from './dashboardStore';
import { localDashboardRepository } from '../api/dashboardRepository';
import {
  createReportDashboardAllotment,
  deleteReportDashboardAllotment,
  fetchReportDashboardAllotments,
} from '../api/reportDashboardAllotmentsApi';
import {
  deleteSavedReport,
  fetchSavedReportById,
  saveReportForEntity,
  updateSavedReport,
} from '../api/savedReportsApi';
import { reportGenerationStore } from '../../model/reportGenerationStore';
import type { ReportDashboard } from '../types';

jest.mock('@shared/model/app_store/AppStore', () => ({
  appStore: { getState: (): { authId: number | null } => ({ authId: null }) },
}));
jest.mock('../api/dashboardRepository', () => {
  // Jest evaluates factories before imports; load mock function locally.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { fn } = require('jest-mock');
  return { localDashboardRepository: { list: fn() } };
});
jest.mock('../api/dashboardAccessesApi', () => ({
  grantDashboardAccess: async (): Promise<void> => undefined,
  revokeDashboardAccess: async (): Promise<void> => undefined,
}));
jest.mock('../api/reportDashboardAllotmentsApi', () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { fn } = require('jest-mock');
  return {
    createReportDashboardAllotment: fn(),
    deleteReportDashboardAllotment: fn(),
    fetchReportDashboardAllotments: fn(),
  };
});
jest.mock('../api/savedReportsApi', () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { fn } = require('jest-mock');
  return {
    deleteSavedReport: fn(),
    fetchSavedReportById: fn(),
    isDuplicateReportNameError: fn(),
    saveReportForEntity: fn(),
    updateSavedReport: fn(),
  };
});
jest.mock('../../api/reportsApi', () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { fn } = require('jest-mock');
  return { executeReportQuery: fn(), exportReport: fn() };
});
jest.mock('../../lib/buildReportColumnHeaderLabels', () => ({
  buildReportColumnHeaderLabels: () => ({}),
}));
jest.mock('../../model/reportsStore', () => ({
  reportsStore: { getState: () => ({ viewMode: 'table' }) },
}));

describe('dashboardStore report entity changes', () => {
  const dashboard: ReportDashboard = {
    id: '9',
    name: 'Vehicles',
    description: '',
    ownerUserId: 1,
    ownerLabel: '',
    createdAt: '',
    updatedAt: '',
    access: [],
    layout: {
      preset: 'fixed_2x2',
      rows: 2,
      cols: 2,
      cells: [
        {
          id: 'cell-0',
          row: 0,
          col: 0,
          widget: {
            title: 'Vehicle report',
            entityName: 'Vehicle',
            body: { selectedFields: [{ fieldName: 'id' }], filters: [] },
            preferredViewMode: 'table',
            reportId: 11,
            allotmentId: 201,
          },
        },
      ],
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    dashboardStore.setState({
      items: [dashboard],
      columnHeaderLabelSnapshots: {},
      layoutPreferences: {},
    });
    jest.mocked(localDashboardRepository.list).mockResolvedValue([dashboard]);
    jest.mocked(fetchSavedReportById).mockResolvedValue({
      id: 11,
      name: 'Vehicle report',
      entityName: 'Vehicle',
      visibility: 'private',
      definition: {
        entityName: 'Vehicle',
        selectedFields: [{ fieldName: 'id' }],
        filters: [],
        pageableDto: { limit: 25, offset: 0, sort: [] },
      },
    });
    jest.mocked(fetchReportDashboardAllotments).mockResolvedValue([
      { id: 201, dashboard: { id: 9 } },
    ]);
    jest.mocked(saveReportForEntity).mockResolvedValue({
      id: 22,
      name: 'Vehicle report',
    });
    jest.mocked(createReportDashboardAllotment).mockResolvedValue([
      { id: 202, dashboard: { id: 9 } },
    ]);
    jest.mocked(deleteReportDashboardAllotment).mockResolvedValue(undefined);
    jest.mocked(deleteSavedReport).mockResolvedValue(undefined);
    jest.mocked(updateSavedReport).mockResolvedValue({
      id: 11,
      name: 'Vehicle report',
    });
    reportGenerationStore.getState().setQueryContext({
      entityName: 'Driver',
      savedReportEntityName: 'Vehicle',
      savedReportId: 11,
      savedDashboardId: '9',
      body: { selectedFields: [{ fieldName: 'driver.id' }], filters: [] },
    });
  });

  it('creates a report for the new entity and moves its dashboard bindings', async () => {
    jest.mocked(localDashboardRepository.list).mockResolvedValue([
      {
        ...dashboard,
        layout: {
          ...dashboard.layout,
          cells: dashboard.layout.cells.map((cell) =>
            cell.widget
              ? {
                  ...cell,
                  widget: {
                    ...cell.widget,
                    entityName: 'Driver',
                    body: { selectedFields: [{ fieldName: 'driver.id' }], filters: [] },
                    reportId: 22,
                    allotmentId: 202,
                  },
                }
              : cell,
          ),
        },
      },
    ]);

    await dashboardStore.getState().syncOpenedFullReportToDashboards({
      entityName: 'Driver',
      savedReportEntityName: 'Vehicle',
      savedReportId: 11,
      savedDashboardId: '9',
      body: { selectedFields: [{ fieldName: 'driver.id' }], filters: [] },
    });

    expect(saveReportForEntity).toHaveBeenCalledWith(
      'Driver',
      expect.objectContaining({ name: 'Vehicle report', entityName: 'Driver' }),
    );
    expect(createReportDashboardAllotment).toHaveBeenCalledWith({
      reportId: 22,
      dashboardId: 9,
    });
    expect(fetchReportDashboardAllotments).toHaveBeenCalledWith({
      page: 0,
      size: 500,
      reportId: { equals: 11 },
      dashboardId: { equals: 9 },
      isActiveEquals: true,
    });
    expect(deleteReportDashboardAllotment).toHaveBeenCalledWith(201);
    expect(updateSavedReport).not.toHaveBeenCalled();
    expect(dashboardStore.getState().items[0]?.layout.cells[0]?.widget).toMatchObject({
      entityName: 'Driver',
      reportId: 22,
      allotmentId: 202,
    });
    expect(reportGenerationStore.getState().queryContext?.savedReportId).toBe(22);
    expect(reportGenerationStore.getState().queryContext?.savedReportEntityName).toBe('Driver');
  });
});
