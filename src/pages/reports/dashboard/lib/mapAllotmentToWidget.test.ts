import { describe, expect, it } from '@jest/globals';

import {
  allotmentToWidgetBinding,
  pageableSortToReportSortParams,
  reportSortParamsToPageableSort,
} from './mapAllotmentToWidget';

describe('dashboard report sorting', () => {
  it('restores pageableDto sorting when mapping a saved report to a widget', () => {
    const widget = allotmentToWidgetBinding({
      id: 12,
      report: {
        id: 34,
        entityName: 'Vehicle',
        definition: {
          selectedFields: [{ fieldName: 'createdAt' }],
          filters: [],
          pageableDto: {
            sort: [{ field: 'createdAt', direction: 'DESC' }],
          },
        },
      },
    });

    expect(widget?.sort).toEqual(['createdAt,DESC']);
  });

  it('converts report sort parameters to pageableDto and ignores invalid entries', () => {
    expect(
      reportSortParamsToPageableSort([
        'createdAt,DESC',
        'model,ASC',
        'bad',
        ',DESC',
      ]),
    ).toEqual([
      { field: 'createdAt', direction: 'DESC' },
      { field: 'model', direction: 'ASC' },
    ]);
    expect(
      pageableSortToReportSortParams({
        sort: [
          { field: 'createdAt', direction: 'DESC' },
          { field: 'model', direction: 'sideways' },
          'manual,ASC',
        ],
      }),
    ).toEqual(['createdAt,DESC', 'manual,ASC']);
  });
});
