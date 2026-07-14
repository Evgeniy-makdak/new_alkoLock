import React, { type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import { Card, CardContent, Divider, useMediaQuery } from '@mui/material';
import { useTheme } from '@mui/material/styles';

import {
  type Field,
  getSummaryExhaleResult,
  getTypeOfRowIconLabel,
} from '../lib/getTypeOfRowIconLabel';
import { getTypeOfRowIconValue } from '../lib/getTypeOfRowIconValue';
import style from './Info.module.scss';

/**
 * @prop fields - поля которые будут отрисованы
 * @prop src - картинка при налии которая будет отрисована в карточке (можно посмотреть {@link https://mui.com/material-ui/react-|card ТУТ})
 * @prop altText - текст который будет показываться если картинка не загрузится
 */
type InfoProps = {
  fields: Field[];
  headerCard?: ReactNode;
  /** Чипы значений по ширине контента (только для явно переданных экранов) */
  compactValueChips?: boolean;
};

export const Info = ({ fields, headerCard, compactValueChips = false }: InfoProps) => {
  const { t } = useTranslation();
  const theme = useTheme();
  const isMobile = useMediaQuery('(max-width:768px)');
  const summaryExhaleResult = getSummaryExhaleResult(t);

  return (
    <Card className={`${style.card}${compactValueChips ? ` ${style.cardCompactValues}` : ''}`}>
      {headerCard}
      <CardContent className={`${style.info}`}>
        {fields.map((field, i) => {
          const summaryExhaleResultText = field?.summaryExhaleResult;
          const value = field?.value;
          const valueIsArray = Array.isArray(value);
          const isSectionTitle = field.rowLayout === 'sectionTitle';
          const isLastField = i === fields.length - 1;

          return (
            <React.Fragment key={i}>
              <div className={`${style.row} ${isSectionTitle ? style.sectionTitleRow : ''}`}>
                <span className={style.label}>
                  {isSectionTitle ? (
                    <span className={style.sectionTitle}>{field.label}</span>
                  ) : field?.type ? (
                    getTypeOfRowIconLabel(
                      field?.type,
                      field?.label,
                      undefined,
                      typeof field.tooltip === 'string'
                        ? field.tooltip
                        : typeof field.label === 'string' || typeof field.label === 'number'
                          ? String(field.label)
                          : undefined,
                    )
                  ) : (
                    field?.label
                  )}
                </span>
                {!isSectionTitle ? (
                  <span className={style.value} style={field?.style}>
                    {summaryExhaleResultText && summaryExhaleResult[summaryExhaleResultText]}
                    {!summaryExhaleResultText &&
                      !valueIsArray &&
                      getTypeOfRowIconValue(value, theme, { isMobile, compact: compactValueChips })}
                    {valueIsArray && (
                      <div className={style.labelWrapper}>
                        {value.map((val, j) => (
                          <React.Fragment key={j}>
                            {getTypeOfRowIconValue(val, theme, {
                              isMobile,
                              compact: compactValueChips,
                            })}
                          </React.Fragment>
                        ))}
                      </div>
                    )}
                  </span>
                ) : null}
              </div>
              {!(isMobile && isLastField) ? <Divider /> : null}
            </React.Fragment>
          );
        })}
      </CardContent>
    </Card>
  );
};
