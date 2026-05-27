import type { ReportExportFormat } from '../api/reportsApi';

const FORMAT_EXTENSIONS: Record<ReportExportFormat, string> = {
  CSV: 'csv',
  XLS: 'xlsx',
  PDF: 'pdf',
};

const FORMAT_MIME: Record<ReportExportFormat, string> = {
  CSV: 'text/csv;charset=utf-8;',
  XLS: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  PDF: 'application/pdf',
};

export function downloadReportFile(blob: Blob, fileName: string, format: ReportExportFormat): void {
  const ext = FORMAT_EXTENSIONS[format];
  const fullName = fileName.trim() ? `${fileName.trim()}.${ext}` : `report.${ext}`;
  const mimeType = FORMAT_MIME[format];

  const blobWithType = new Blob([blob], { type: mimeType });
  const url = window.URL.createObjectURL(blobWithType);
  const link = document.createElement('a');
  link.href = url;
  link.download = fullName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}
