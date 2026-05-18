import React, { type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import { Card, CardContent, Divider } from '@mui/material';
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
};

export const Info = ({ fields, headerCard }: InfoProps) => {
  const { t } = useTranslation();
  const theme = useTheme();
  const summaryExhaleResult = getSummaryExhaleResult(t);

  return (
    <Card className={style.card}>
      {headerCard}
      <CardContent className={`${style.info}`}>
        {fields.map((field, i) => {
          const summaryExhaleResultText = field?.summaryExhaleResult;
          const value = field?.value;
          const valueIsArray = Array.isArray(value);
          const isSectionTitle = field.rowLayout === 'sectionTitle';

          return (
            <React.Fragment key={i}>
              <div className={`${style.row} ${isSectionTitle ? style.sectionTitleRow : ''}`}>
                <span className={style.label}>
                  {isSectionTitle ? (
                    <span className={style.sectionTitle}>{field.label}</span>
                  ) : field?.type ? (
                    getTypeOfRowIconLabel(field?.type, field?.label)
                  ) : (
                    field?.label
                  )}
                </span>
                {!isSectionTitle ? (
                  <span className={style.value} style={field?.style}>
                    {summaryExhaleResultText && summaryExhaleResult[summaryExhaleResultText]}
                    {!summaryExhaleResultText && !valueIsArray && getTypeOfRowIconValue(value, theme)}
                    {valueIsArray && (
                      <div className={style.labelWrapper}>
                        {value.map((val, j) => (
                          <React.Fragment key={j}>{getTypeOfRowIconValue(val, theme)}</React.Fragment>
                        ))}
                      </div>
                    )}
                  </span>
                ) : null}
              </div>
              <Divider />
            </React.Fragment>
          );
        })}
      </CardContent>
    </Card>
  );
};
