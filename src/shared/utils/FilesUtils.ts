/* eslint-disable @typescript-eslint/no-unused-vars */
import { enqueueSnackbar } from 'notistack';

export class FilesUtils {
  static getUrlFromBlob(blob?: Blob | File | null | undefined) {
    if (!blob) return '';
    const isBlob = blob instanceof Blob;
    const isFile = blob instanceof File;
    if (isBlob || isFile) {
      return URL.createObjectURL(blob);
    }
    return '';
  }
  static checkFormats(availableFormats: string[]) {
    return function (arr: File[]): File[] {
      // массив где будут файлы только допустимого формата
      const filterArr: File[] = [];
      // set для того чтобы отображать только 1 раз недопустимый формат
      const notValidFormat = new Set();
      for (const file of arr) {
        const format = file.type;
        if (!availableFormats.includes(format)) {
          const hasError = notValidFormat.has(format);
          if (hasError) continue;
          notValidFormat.add(format);
          const formatView = format.split('/')[1];

          enqueueSnackbar(`Недопустимый формат файла ${formatView}`, { variant: 'error' });
        } else {
          filterArr.push(file);
        }
      }
      return filterArr;
    };
  }
}
