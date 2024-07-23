import React, { type ReactNode } from 'react';

import { Card, CardContent, Divider } from '@mui/material';

import {
  type Field,
  getTypeOfRowIconLabel,
  summaryExhaleResult,
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
  return (
    <Card className={style.card}>
      {headerCard}
      <CardContent className={`${style.info}`}>
        {fields.map((field, i) => {
          const summaryExhaleResultText = field?.summaryExhaleResult;
          const value = field?.value;
          const valueIsArray = Array.isArray(value);

          return (
            <React.Fragment key={i}>
              <div className={style.row}>
                <span className={style.label}>
                  {field?.type ? getTypeOfRowIconLabel(field?.type, field?.label) : field?.label}
                </span>
                <span className={style.value} style={field?.style}>
                  {summaryExhaleResultText && summaryExhaleResult[summaryExhaleResultText]}
                  {!summaryExhaleResultText && !valueIsArray && getTypeOfRowIconValue(value)}
                  {valueIsArray && (
                    <div className={style.labelWrapper}>
                      {value.map((val, i) => (
                        <React.Fragment key={i}>{getTypeOfRowIconValue(val)}</React.Fragment>
                      ))}
                    </div>
                  )}
                </span>
              </div>
              <Divider />
            </React.Fragment>
          );
        })}
      </CardContent>
    </Card>
  );
};
