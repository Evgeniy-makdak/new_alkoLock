import CryptoJS from 'crypto-js';
import { enqueueSnackbar } from 'notistack';

import type { ImageState } from '../hooks/useUploadImg';

export async function getFileHashAndEncodeBase64(file: File | Blob) {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);

    // Вычисление MD5 хэша
    const wordArray = CryptoJS.lib.WordArray.create(uint8Array); // Преобразование в формат, подходящий для crypto-js
    const hash = CryptoJS.MD5(wordArray);

    // Кодирование хэша в строку Base64url
    const base64EncodedHash = CryptoJS.enc.Base64url.stringify(hash);

    return base64EncodedHash;
  } catch (error) {
    console.error('Ошибка при получении хэша файла:', error);
  }
}

export const filterListImages = (images: ImageState[]): ImageState[] => {
  if (images?.length < 2) return images;
  return images.reduce((acc: ImageState[], value) => {
    const hash = value?.hash;

    if (!hash) return [...acc, value];
    const hasElement = acc.find((item) => item?.hash === hash);
    if (hasElement) {
      const text = hasElement.image instanceof File ? hasElement?.image?.name : false;
      text && enqueueSnackbar(`Фото ${text} уже существует `, { variant: 'warning' });

      return acc;
    }
    return [...acc, value];
  }, []);
};

const distance = 150;
const speed = 30;
export const handleScroll = (
  e: React.WheelEvent<HTMLDivElement>,
  ref: React.MutableRefObject<HTMLDivElement>,
) => {
  if (!ref.current) return;
  e.preventDefault();

  const startScrollLeft = ref.current.scrollLeft;
  const endScrollLeft = e.deltaY > 0 ? startScrollLeft + distance : startScrollLeft - distance;
  let count = startScrollLeft;
  const animateScroll = () => {
    // Линейная интерполяция между начальной и конечной позициями скролла
    const scrollPosition = startScrollLeft + (count - startScrollLeft);
    count = e.deltaY > 0 ? count + speed : count - speed;
    ref.current.scrollLeft = scrollPosition;
    if (scrollPosition < endScrollLeft && e.deltaY > 0) {
      requestAnimationFrame(animateScroll);
    } else if (scrollPosition > endScrollLeft && e.deltaY < 0) {
      requestAnimationFrame(animateScroll);
    }
  };

  requestAnimationFrame(animateScroll);
};
export const prevent = (
  e: React.DragEvent<HTMLFormElement> | React.ChangeEvent<HTMLInputElement>,
) => {
  e.preventDefault();
  e.stopPropagation();
};
