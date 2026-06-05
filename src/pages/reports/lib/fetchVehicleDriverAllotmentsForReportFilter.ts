import { AttachmentsApi } from '@shared/api/baseQuerys';
import { appStore } from '@shared/model/app_store/AppStore';
import type { IAttachmentItems } from '@shared/types/BaseQueryTypes';

import { fetchAllReportReferencePages } from './fetchAllReportReferencePages';
import { REPORT_REFERENCE_LIST_PAGE_SIZE } from './reportReferencePageSize';

/**
 * Справочник привязок водитель–ТС для фильтров отчёта (VehicleBind, device.vehicleBind.id).
 * GET api/vehicle-driver-allotments?page=&size=&all.vehicle.assignment.branch.id.in=…&all.isActive.equals=true
 */
export async function fetchVehicleDriverAllotmentsForReportFilter(
  searchQuery?: string,
): Promise<IAttachmentItems[]> {
  const branchId = appStore.getState().selectedBranchState?.id;
  const pageSize = REPORT_REFERENCE_LIST_PAGE_SIZE;

  try {
    return await fetchAllReportReferencePages<IAttachmentItems>(
      (page) =>
        AttachmentsApi.getList({
          page,
          limit: pageSize,
          searchQuery,
          filterOptions: branchId != null ? { branchId } : {},
        }),
      pageSize,
    );
  } catch {
    return [];
  }
}
