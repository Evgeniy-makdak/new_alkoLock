import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';

import type { ICar, IUser } from '@shared/types/BaseQueryTypes';
import type { Values } from '@shared/ui/search_multiple_select';

export class Formatters {
  static formatISODate(isoDate: string | Date) {
    if (!isoDate) return '-';
    const date = new Date(isoDate);

    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();

    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');

    return `${day}.${month}.${year} ${hours}:${minutes}:${seconds}`;
  }

  static formatToISODate(date: Dayjs | null | undefined) {
    if (!date) return '';
    if (!dayjs(date).isValid()) return '';

    return dayjs(date).toISOString();
  }

  static convertDateFormat(dateStr: string) {
    if (!dateStr) return '-';
    const dateParts = dateStr.split('-');

    return dateParts.reverse().join('.');
  }

  static nameFormatter(user: Partial<IUser>, withPlaceholder = true) {
    
    const placeholder = withPlaceholder ? '-' : '';
    if (!user) return placeholder;
    const name = user?.firstName ?? '';
    const surname = user?.surname ?? '';
    const middleName = user?.middleName ?? '';

    if (!name.length && !surname.length && !middleName.length) return placeholder;

    return `${surname} ${name} ${middleName}`;
  }

  static carNameFormatter(
    car: ICar,
    withoutRegistrationNumber = false,
    read = true,
    vieBranch = false,
  ) {
    if (!car) return '-';

    const getBrnach = (string: string) => {
      if (!vieBranch) return string;
      const branch = car?.assignment?.branch?.name;
      return `${string} - ${branch}`;
    };

    if (!read && !withoutRegistrationNumber) {
      return getBrnach(`${car.manufacturer} ${car.model} ${car.registrationNumber}`);
    }
    if (withoutRegistrationNumber) {
      return getBrnach(`${car.manufacturer} ${car.model}`);
    } else if (read && !withoutRegistrationNumber) {
      return getBrnach(`${car.manufacturer} ${car.model} ( ${car.registrationNumber} )`);
    }
  }

  static parseISO8601Duration(isoDuration: string) {
    if (!isoDuration) return null;
    const regex = /P(?:(\d+)Y)?(?:(\d+)M)?(?:(\d+)D)?T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/;
    const matches = isoDuration.match(regex);

    return {
      hours: parseInt(matches[4])
        ? parseInt(matches[4]).toString().length === 1
          ? `0${parseInt(matches[4])}`
          : parseInt(matches[4])
        : '00',
      minutes: parseInt(matches[5])
        ? parseInt(matches[5]).toString().length === 1
          ? `0${parseInt(matches[5])}`
          : parseInt(matches[5])
        : '00',
      seconds: parseInt(matches[6])
        ? parseInt(matches[6]).toString().length === 1
          ? `0${parseInt(matches[6])}`
          : parseInt(matches[6])
        : '00',
    };
  }

  static removeExtraSpaces(str: string) {
    return str.replace(/\s+/g, ' ').trim();
  }
  static getStringForQueryParams(arr: Values) {
    if (!Array.isArray(arr)) return '';
    if (arr.length === 0) return '';
    const arrIds = arr.map((value) => value?.value || '');
    return arrIds.join(',');
  }
}
