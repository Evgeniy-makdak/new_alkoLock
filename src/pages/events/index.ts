/* eslint-disable @typescript-eslint/no-explicit-any */
import { lazy } from 'react';

const retryChunkLoad = (
  importFunction: () => Promise<{ default: React.ComponentType<any> }>,
  retries = 3,
  delay = 1000,
): Promise<{ default: React.ComponentType<any> }> => {
  return new Promise((resolve, reject) => {
    importFunction()
      .then(resolve)
      .catch((error) => {
        if (retries > 0) {
          if (typeof window !== 'undefined') {
            caches.delete('your-cache-name').then(() => {
              setTimeout(
                () => retryChunkLoad(importFunction, retries - 1, delay).then(resolve),
                delay,
              );
            });
          } else {
            setTimeout(
              () => retryChunkLoad(importFunction, retries - 1, delay).then(resolve),
              delay,
            );
          }
        } else {
          reject(error);
        }
      });
  });
};

export const Events = lazy(() => retryChunkLoad(() => import('./ui/Events')));
