import type { FC } from 'react';

import styles from './MpoConfigTable.module.scss';

type FeatureSwitchProps = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
};

export const FeatureSwitch: FC<FeatureSwitchProps> = ({
  checked,
  onChange,
  label,
  disabled = false,
}) => (
  <div
    className={styles.featureSwitch}
    onClick={() => {
      if (disabled) return;
      onChange(!checked);
    }}
    style={{ cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.6 : 1 }}
    role="switch"
    aria-checked={checked}
    aria-disabled={disabled}>
    <div
      className={`${styles.featureSwitchTrack} ${
        checked ? styles.featureSwitchTrackOn : styles.featureSwitchTrackOff
      }`}>
      <div
        className={`${styles.featureSwitchThumb} ${
          checked ? styles.featureSwitchThumbChecked : ''
        }`}
      />
    </div>
    {label ? <span className={styles.featureSwitchLabel}>{label}</span> : null}
  </div>
);
