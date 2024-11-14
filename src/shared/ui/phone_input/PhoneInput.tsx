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
  const [innerValue, setInnerValue] = useState(value || '');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [previousValidValue, setPreviousValidValue] = useState(value || '');
  const [isCountryChanging, setIsCountryChanging] = useState(false); // Флаг для отслеживания смены страны

  useEffect(() => {
    if (value !== innerValue) {
      setInnerValue(value || '');
      setPreviousValidValue(value || '');
    }
  }, [value]);

  const handleChange = (newValue: string | undefined) => {
    if (isCountryChanging) {
      // Если идет смена страны, не валидируем номер
      setValidationError(null);
      setInnerValue(newValue || '');
      setValue(newValue);
      return;
    }

    if (newValue?.startsWith('+86123') && newValue.length > 13) {
      setValidationError('Некорректный номер');
      setInnerValue(previousValidValue);
      setValue(previousValidValue);
      return;
    }

    if (newValue?.startsWith('+7') && newValue.length > 12) {
      setValidationError('Некорректный номер');
      setInnerValue(previousValidValue);
      setValue(previousValidValue);
      return;
    }

    setValidationError(null);
    setInnerValue(newValue || '');
    setPreviousValidValue(newValue || '');
    setValue(newValue);
  };

  const handleCountryChange = (newCountry: Country | undefined) => {
    setIsCountryChanging(true); // Устанавливаем флаг смены страны
    setCurrentCountry(newCountry);
    setTimeout(() => {
      setIsCountryChanging(false); // Ожидаем завершения смены страны
    }, 300); // Фиксируем задержку для корректного перехода
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
