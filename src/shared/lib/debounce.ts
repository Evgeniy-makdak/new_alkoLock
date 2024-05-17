import type { MouseEventHandler } from 'react';

const timer: { timer: null | number | NodeJS.Timeout } = { timer: null };

interface DebounceProps {
  time: number;
  callBack?: (value?: string) => void;
  eventHandler?: MouseEventHandler<HTMLButtonElement>;
}

export const debounce = ({ time, callBack, eventHandler }: DebounceProps) => {
  if (!callBack && !eventHandler) return;
  return function (value?: string) {
    if (!timer.timer) {
      if (typeof value === 'string') {
        callBack(value);
      } else {
        eventHandler(value || {});
      }

      timer.timer = setTimeout(() => {
        clearTimeout(timer.timer);
        timer.timer = null;
      }, time || 500);
    } else {
      clearTimeout(timer.timer);

      timer.timer = setTimeout(() => {
        if (typeof value === 'string') {
          callBack(value);
        } else {
          eventHandler(value || {});
        }
        clearTimeout(timer.timer);
        timer.timer = null;
      }, time || 500);
    }
  };
};
