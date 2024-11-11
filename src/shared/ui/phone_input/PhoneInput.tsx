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

export const PhoneInputSet: FC<PhoneInputProps> = ({ setValue, value, error }) => {
  const [currentCountry, setCurrentCountry] = useState<Country>('RU');
  const [prevCountry, setPrevCountry] = useState<Country>(currentCountry);
  const [innerValue, setInnerValue] = useState(value);
  const [countryCode, setCountryCode] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [previousValidValue, setPreviousValidValue] = useState(value || '');

  const handleChange = (newValue: string | undefined) => {
    if (newValue?.startsWith('+86123') && newValue.length > 13) {
      setValidationError('Некорректный номер');
      setInnerValue(previousValidValue);
      setValue(previousValidValue);
      return;
    }

    if (newValue?.startsWith('+7') && newValue.length > 12) {
      setValidationError('Некорректный номер');
      setInnerValue(previousValidValue);
      setValue(null);
      return;
    }

    // Если номер корректный, сохраняем его как предыдущее значение и сбрасываем ошибки
    setValidationError(null);
    setInnerValue(newValue);
    setPreviousValidValue(newValue || ''); // Обновляем предыдущее корректное значение
    setValue(newValue);
  };

  useEffect(() => {
    if (prevCountry !== currentCountry) {
      setPrevCountry(currentCountry);
      setCountryCode(innerValue || '');
    }
  }, [currentCountry, innerValue]);

  useEffect(() => {
    if (countryCode !== innerValue) {
      setValue(innerValue);
    } else {
      setValue('');
    }
  }, [countryCode, innerValue]);

  const handleCountryChange = (newCountry: Country | undefined) => {
    if (value && isValidPhoneNumber(value)) {
      setPrevCountry(currentCountry);
    }
    setCurrentCountry(newCountry);
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
        value={innerValue}
        defaultCountry={currentCountry}
        onCountryChange={handleCountryChange}
        onChange={handleChange}
        limitMaxLength
        className={style.input}
        style={{ padding: 14 }}
      />
      {/* Если номер некорректен, выводим сообщение об ошибке */}
      {(validationError || (error && innerValue && !isValidPhoneNumber(innerValue))) && (
        <span className={style.error}>{validationError || error}</span>
      )}
    </div>
  );
};
