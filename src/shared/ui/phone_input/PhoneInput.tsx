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

  const handleChange = (newValue: string | undefined) => {
    if (value?.startsWith('+8612') && value.length > 14) {
      setValue(value.slice(0, 14));
    } else if (value?.startsWith('+7') && value.length > 12) {
      setValue(value.slice(0, 12));
    } else if (newValue && newValue.length >= 15 && isValidPhoneNumber(newValue)) {
      setValue(newValue);
    } else {
      setValue(newValue);
    }
  };

  const handleCountryChange = (newCountry: Country | undefined) => {
    if (value && isValidPhoneNumber(value)) {
      setPrevCountry(currentCountry); 
    } 
    else {
      setValue(''); // Если номер не валиден, очищаем его при смене страны
    }
    setCurrentCountry(newCountry); // Обновляем текущее значение страны
  };
  
  useEffect(() => {
      if (prevCountry !== currentCountry) {
        if (value) {
          setValue(undefined);
        }
    }
  }, [currentCountry, prevCountry]);
  console.log(value);
  

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
        style={{
          padding: 14,
        }}
      />
      {error && value && !isValidPhoneNumber(value) && <span className={style.error}>{error}</span>}
    </div>
  );
};
