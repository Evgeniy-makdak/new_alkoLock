import { useTranslation } from 'react-i18next';

import { Logo as LogoMark } from '@shared/images/logo';
import { brandNameLabel } from '@shared/lib/brandNameLabel';

import style from './Logo.module.scss';

interface LogoProps {
  testid?: string;
}

/** Логотип для страниц авторизации: знак LS + название (ru — из ru; be — русский; иначе EN). */
export const Logo = ({ testid }: LogoProps) => {
  const { t, i18n } = useTranslation();

  return (
    <div className={style.brand} data-testid={testid}>
      <LogoMark className={style.brandIcon} />
      <span className={style.brandText}>{brandNameLabel(t, i18n.language)}</span>
    </div>
  );
};
