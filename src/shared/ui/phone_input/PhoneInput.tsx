import { type FC } from 'react';
import PhoneInput, { type DefaultInputComponentProps } from 'react-phone-number-input';
import ru from 'react-phone-number-input/locale/ru.json';
import 'react-phone-number-input/style.css';

import { type TextFieldProps } from '@mui/material';

import style from './PhoneInput.module.scss';

type PhoneInputProps = {
  setValue: (value: string | null) => void;
  testid?: string;
  value?: string;
  TextFieldProps?: TextFieldProps;
  error?: string;
} & DefaultInputComponentProps;

export const PhoneInputSet: FC<PhoneInputProps> = ({ setValue, value, error }) => {
  const handleChange = (phoneValue: string | undefined) => {
    if (phoneValue && phoneValue.length <= 4) {
      setValue(undefined);
    } else {
      setValue(phoneValue);
    }
  };

  return (
    <div>
      <PhoneInput
        international
        countryCallingCodeEditable={false}
        withCountryCallingCode
        useNationalFormatForDefaultCountryValue
        limitMaxLength
        labels={ru}
        placeholder="Введите номер телефона"
        value={value}
        style={{
          padding: 14,
        }}
        defaultCountry="RU"
        onChange={handleChange}
        className={style.input}
      />
      {error && value && value.length > 4 && <span className={style.error}>{error}</span>}
    </div>
  );
};
