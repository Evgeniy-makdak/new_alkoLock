import dayjs, { type Dayjs } from 'dayjs';

export class DateUtils {
  // TODO => понять почему прибавляют 1 день
  // TODO => сделать на dayjs
  static getEndFilterDate(dateStr: string) {
    const date = new Date(dateStr);
    date.setDate(date.getDate() + 1);

    return date.toISOString();
  }

  static isValidDate(date: string | Date | Dayjs | number) {
    const dateDayjs = dayjs(date);

    if ('isValid' in dateDayjs && !dayjs(date).isValid()) return false;
    return true;
  }

  static dateSortArray(dateOne: Dayjs | string, dateTwo: Dayjs | string) {
    const isValidDate = this.isValidDate(dateOne) && this.isValidDate(dateTwo);

    if (!isValidDate) {
      return 0;
    }
    const firstDayjsDate = dayjs(dateOne);
    const secondDayjsDate = dayjs(dateTwo);

    const numberDateFirst = firstDayjsDate.valueOf();
    const numberDateSecond = secondDayjsDate.valueOf();

    if (numberDateFirst < numberDateSecond) {
      return 1;
    } else if (numberDateFirst === numberDateSecond) {
      return 0;
    } else {
      return -1;
    }
  }
}
