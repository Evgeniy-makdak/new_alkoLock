import type { DashboardWidgetBinding } from '../types';

export type DashboardColumnHeaderLabelSnapshot = {
  selectedFields: DashboardWidgetBinding['body']['selectedFields'];
  columnHeaderLabels: NonNullable<DashboardWidgetBinding['columnHeaderLabels']>;
};

function selectedFieldsFingerprint(fields: DashboardWidgetBinding['body']['selectedFields']): string {
  return JSON.stringify(
    fields
      .map((field) => [field.fieldName, field.alias ?? '', field.aggregation ?? ''])
      .sort(([leftName, leftAlias, leftAggregation], [rightName, rightAlias, rightAggregation]) =>
        `${leftName}\0${leftAlias}\0${leftAggregation}`.localeCompare(
          `${rightName}\0${rightAlias}\0${rightAggregation}`,
        ),
      ),
  );
}

export function applyDashboardColumnHeaderLabelSnapshot(
  widget: DashboardWidgetBinding,
  snapshots: Record<string, DashboardColumnHeaderLabelSnapshot>,
): DashboardWidgetBinding {
  if (widget.reportId == null) return widget;

  const snapshot = snapshots[String(widget.reportId)];
  if (
    !snapshot ||
    selectedFieldsFingerprint(snapshot.selectedFields) !==
      selectedFieldsFingerprint(widget.body.selectedFields ?? [])
  ) {
    return widget;
  }

  return { ...widget, columnHeaderLabels: snapshot.columnHeaderLabels };
}
