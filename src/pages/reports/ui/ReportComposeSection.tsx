import type { ReactNode } from 'react';

import type { SvgIconComponent } from '@mui/icons-material';

import composeStyles from './ReportComposeModal.module.scss';

type ReportComposeSectionProps = {
  icon: SvgIconComponent;
  iconTone?: 'rose' | 'violet' | 'blue' | 'amber';
  title: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
};

const toneClass: Record<NonNullable<ReportComposeSectionProps['iconTone']>, string> = {
  rose: composeStyles.sectionIconRose,
  violet: composeStyles.sectionIconViolet,
  blue: composeStyles.sectionIconBlue,
  amber: composeStyles.sectionIconAmber,
};

export function ReportComposeSection({
  icon: Icon,
  iconTone = 'blue',
  title,
  action,
  children,
  className,
}: ReportComposeSectionProps) {
  return (
    <section className={[composeStyles.composeSection, className].filter(Boolean).join(' ')}>
      <div className={composeStyles.sectionHead}>
        <div className={composeStyles.sectionHeadMain}>
          <span className={[composeStyles.sectionIcon, toneClass[iconTone]].join(' ')}>
            <Icon fontSize="small" />
          </span>
          <h3 className={composeStyles.sectionTitle}>{title}</h3>
        </div>
        {action ? <div className={composeStyles.sectionAction}>{action}</div> : null}
      </div>
      <div className={composeStyles.sectionBody}>{children}</div>
    </section>
  );
}
