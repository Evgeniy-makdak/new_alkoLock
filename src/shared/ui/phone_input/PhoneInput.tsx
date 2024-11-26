import { FC, useEffect, useState } from 'react';
import PhoneInput, {
  Country,
  DefaultInputComponentProps,
  isValidPhoneNumber,
} from 'react-phone-number-input';
import ru from 'react-phone-number-input/locale/ru.json';
import 'react-phone-number-input/style.css';

import { TextFieldProps } from '@mui/material';

import style from './PhoneInput.module.scss';

type PhoneInputProps = {
  setValue: (value: string | null) => void;
  testid?: string;
  value?: string;
  TextFieldProps?: TextFieldProps;
  error?: string;
} & DefaultInputComponentProps;

let isMount = false;

export const PhoneInputSet: FC<PhoneInputProps> = ({ setValue, value, error }) => {
  const [currentCountry, setCurrentCountry] = useState<Country>('RU');
  // const [innerValue, setInnerValue] = useState(value || '');
  const [validationError, setValidationError] = useState<string | null>(null);

useEffect(() => {
  const timer = setTimeout (() => isMount = true, 300)
  return () => {
    isMount = false;
    clearTimeout(timer);
  }
}, [])

  const handleChange = (newValue: string | undefined) => {
    if ((newValue?.startsWith('+86123') && newValue.length > 13) || (newValue?.startsWith('+7') && newValue.length > 12)) {
      setValidationError('Некорректный номер');
      return;
    }

    setValidationError(null);
    setValue(newValue);
  };

  const handleCountryChange = (newCountry: Country | undefined) => {
    
    setCurrentCountry(newCountry);
    isMount && setTimeout(() => setValue(''), 100);
  };

  return (
    <div>
      <PhoneInput
        international
        countryCallingCodeEditable={false}
        withCountryCallingCode
        useNationalFormatForDefaultCountryValue
        labels={ru}
        placeholder="Введите номер телефона"
        value={value}
        defaultCountry={currentCountry}
        onCountryChange={handleCountryChange}
        onChange={handleChange}
        limitMaxLength
        className={style.input}
        style={{ padding: 14 }}
      />
      {/* Если номер некорректен, выводим сообщение об ошибке */}
      {(validationError || (error && value && !isValidPhoneNumber(value))) && (
        <span className={style.error}>{validationError || error}</span>
      )}
    </div>
  );
};
