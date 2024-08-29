interface Storage {
  getItem(key: string): string;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
  clear(): void;
}

let storage: Storage;

export const setStore = (stor: Storage) => {
  storage = stor;
};

function getItem<T>(key: string): T | null {
  if (!storage) return;
  const data = storage.getItem(key);
  if (data === 'undefined' || data === null) return null;

  return JSON.parse(data);
}

function setItem<T>(key: string, value: T) {
  if (!storage) return;
  storage.setItem(key, JSON.stringify(value));
}

function removeItem(key: string) {
  if (!storage) return;
  storage.removeItem(key);
}

function clear() {
  if (!storage) return;
  storage.clear();
}
export { clear, getItem, removeItem, setItem };
