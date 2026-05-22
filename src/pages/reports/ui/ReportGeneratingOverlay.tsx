import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';

import styles from './Reports.module.scss';

/** Индикатор формирования отчёта по центру области таблицы. */
export function ReportGeneratingOverlay() {
  return (
    <div className={styles.generatingOverlay} role="status" aria-live="polite" aria-busy="true">
      <div className={styles.hourglassFlip}>
        <HourglassEmptyIcon className={styles.hourglassIcon} />
      </div>
    </div>
  );
}
