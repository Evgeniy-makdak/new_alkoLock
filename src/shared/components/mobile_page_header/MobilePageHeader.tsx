import AddIcon from '@mui/icons-material/Add';
import { IconButton } from '@mui/material';

import { ThemeToggleControl } from '@shared/theme/colorMode';

import styles from './MobilePageHeader.module.scss';

type MobilePageHeaderProps = {
  title: string;
  onAddClick?: () => void;
  addAriaLabel?: string;
};

export function MobilePageHeader({ title, onAddClick, addAriaLabel }: MobilePageHeaderProps) {
  return (
    <div className={styles.header}>
      <h2 className={styles.title}>{title}</h2>
      <div className={styles.actions}>
        {onAddClick ? (
          <IconButton
            className={styles.addButton}
            aria-label={addAriaLabel ?? 'Add'}
            onClick={onAddClick}>
            <AddIcon />
          </IconButton>
        ) : (
          <div className={styles.addSpacer} aria-hidden />
        )}
        <ThemeToggleControl variant="toolbarCircle" />
      </div>
    </div>
  );
}
