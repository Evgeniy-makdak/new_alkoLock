import { describe, expect, it, jest } from '@jest/globals';

jest.mock('./reportCoordinateComposite', () => ({
  COORDINATES_COMPOSITE_KIND: 'coordinates',
}));

import {
  buildReportFieldAggregationMap,
  resolveReportColumnDisplayAggregation,
} from './reportAggregationDisplay';

describe('report aggregation display', () => {
  it('keeps the original and clone aggregation labels independent', () => {
    const aggregations = buildReportFieldAggregationMap([
      { fieldName: 'timestamp', aggregation: 'min' },
      { fieldName: 'timestamp', alias: 'timestamp_1', aggregation: 'max' },
    ]);

    expect(resolveReportColumnDisplayAggregation('timestamp', undefined, aggregations, new Set()))
      .toBe('min');
    expect(
      resolveReportColumnDisplayAggregation('timestamp_1', undefined, aggregations, new Set()),
    ).toBe('max');
  });

  it('does not apply a clone aggregation to an unaggregated original field', () => {
    const aggregations = buildReportFieldAggregationMap([
      { fieldName: 'timestamp' },
      { fieldName: 'timestamp', alias: 'timestamp_1', aggregation: 'max' },
    ]);

    expect(
      resolveReportColumnDisplayAggregation('timestamp', undefined, aggregations, new Set()),
    ).toBeNull();
    expect(
      resolveReportColumnDisplayAggregation('timestamp_1', undefined, aggregations, new Set()),
    ).toBe('max');
  });
});
