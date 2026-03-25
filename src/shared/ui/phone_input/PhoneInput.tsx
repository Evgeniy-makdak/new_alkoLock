import { FC, useState } from 'react';
import { useTranslation } from 'react-i18next';
import PhoneInput, {
  type Country,
  type DefaultInputComponentProps,
  isValidPhoneNumber,
} from 'react-phone-number-input';
import flags from 'react-phone-number-input/flags';
import en from 'react-phone-number-input/locale/en.json';
import ru from 'react-phone-number-input/locale/ru.json';
import 'react-phone-number-input/style.css';

import type { TextFieldProps } from '@mui/material';

import { PhoneCountrySelect } from './PhoneCountrySelect';
import style from './PhoneInput.module.scss';

const LOCALE_LABELS: Record<string, typeof ru> = {
  ru,
  kk: ru,
  ky: ru,
  be: ru,
  uz: en,
  en,
};

/** Дефолтная страна только для пустого номера (новый пользователь / поле не заполнено). */
const DEFAULT_COUNTRY_BY_LOCALE: Record<string, Country> = {
  ru: 'RU',
  kk: 'KZ',
  ky: 'KG',
  be: 'BY',
  uz: 'UZ',
  en: 'US',
};

/**
 * Если номер начинается с префикса, но libphonenumber не выставляет country (невалидная длина/шаблон),
 * react-phone-number-input подставляет defaultCountry только при couldNumberBelongToCountry.
 * Для +61 при defaultCountry=RU это ложь — флаг пропадает. Для Австралии задаём AU.
 */
const DEFAULT_COUNTRY_BY_E164_PREFIX: { prefix: string; country: Country }[] = [
  { prefix: '+61', country: 'AU' },
];

function defaultCountryForValue(value: string | undefined, lang: string): Country {
  const v = value?.trim() ?? '';
  for (const { prefix, country } of DEFAULT_COUNTRY_BY_E164_PREFIX) {
    if (v.startsWith(prefix)) return country;
  }
  return DEFAULT_COUNTRY_BY_LOCALE[lang] ?? 'RU';
}

type PhoneInputProps = {
  setValue: (value: string) => void;
  testid?: string;
  value?: string;
  TextFieldProps?: TextFieldProps;
  error?: string;
} & DefaultInputComponentProps;

export const PhoneInputSet: FC<PhoneInputProps> = ({ setValue, value, error }) => {
  const { t, i18n } = useTranslation();
  const lang = (i18n.language || 'ru').split('-')[0].toLowerCase();
  const defaultCountry = defaultCountryForValue(value, lang);
  const labels = LOCALE_LABELS[lang] ?? ru;

  const [validationError, setValidationError] = useState<string | null>(null);

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
    setValue(newValue ?? '');
  };

  return (
    <div className={style.root}>
      <PhoneInput
        international
        countryCallingCodeEditable={false}
        withCountryCallingCode
        labels={labels}
        flags={flags}
        countrySelectComponent={PhoneCountrySelect}
        placeholder={t('info.phonePlaceholder')}
        value={value?.trim() ? value : undefined}
        defaultCountry={defaultCountry}
        onChange={handleChange}
        limitMaxLength
        className={style.input}
      />
      {(validationError || (error && value && !isValidPhoneNumber(value))) && (
        <span className={style.error}>{validationError || error}</span>
      )}
    </div>
  );
};
