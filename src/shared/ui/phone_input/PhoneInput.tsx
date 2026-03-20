import { FC, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import PhoneInput, {
  Country,
  DefaultInputComponentProps,
  isValidPhoneNumber,
} from 'react-phone-number-input';
import en from 'react-phone-number-input/locale/en.json';
import ru from 'react-phone-number-input/locale/ru.json';
import 'react-phone-number-input/style.css';

import { parsePhoneNumber } from 'libphonenumber-js';

import { TextFieldProps } from '@mui/material';

import style from './PhoneInput.module.scss';

const LOCALE_LABELS: Record<string, typeof ru> = {
  ru,
  kk: ru,
  ky: ru,
  be: ru,
  uz: en,
  en,
};

const DEFAULT_COUNTRY_BY_LOCALE: Record<string, Country> = {
  ru: 'RU',
  kk: 'KZ',
  ky: 'KG',
  be: 'BY',
  uz: 'UZ',
  en: 'US',
};

type PhoneInputProps = {
  setValue: (value: string | null) => void;
  testid?: string;
  value?: string;
  TextFieldProps?: TextFieldProps;
  error?: string;
} & DefaultInputComponentProps;

let isMount = false;

export const PhoneInputSet: FC<PhoneInputProps> = ({ setValue, value, error }) => {
  const { t, i18n } = useTranslation();
  const lang = (i18n.language || 'ru').split('-')[0].toLowerCase();
  const defaultCountry = DEFAULT_COUNTRY_BY_LOCALE[lang] ?? 'RU';
  const labels = LOCALE_LABELS[lang] ?? ru;

  const getCountryFromValue = (phoneValue: string | undefined): Country | null => {
    if (!phoneValue) return null;
    try {
      const parsed = parsePhoneNumber(phoneValue);
      return (parsed?.country ?? null) as Country | null;
    } catch {
      return null;
    }
  };

  const [currentCountry, setCurrentCountry] = useState<Country>(
    () => getCountryFromValue(value) ?? defaultCountry,
  );
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => (isMount = true), 300);
    return () => {
      isMount = false;
      clearTimeout(timer);
    };
  }, []);

  useEffect(() => {
    const countryFromValue = getCountryFromValue(value);
    setCurrentCountry(countryFromValue ?? defaultCountry);
  }, [value, defaultCountry]);

  const handleChange = (newValue: string | undefined) => {
    if (
      (newValue?.startsWith('+86123') && newValue.length > 13) ||
      (newValue?.startsWith('+7') && newValue.length > 12) ||
      (newValue?.startsWith('+996') && newValue.length > 13)
    ) {
      setValidationError(t('validation.notValidPhone'));
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
        labels={labels}
        placeholder={t('info.phonePlaceholder')}
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
