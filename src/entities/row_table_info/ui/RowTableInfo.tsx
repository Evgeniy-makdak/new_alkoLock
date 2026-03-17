import { type FC, ReactNode, useRef, useState } from 'react';

import style from './RowTableInfo.module.scss';

type Tab = {
  name: string;
  testid?: string;
  content: ReactNode | string;
};

type RowTableInfoProps = {
  tabs: Tab[];
  activeTab?: number; // Делаем необязательным
  onTabChange?: (index: number) => void; // Делаем необязательным
  style?: React.CSSProperties;
  className?: string; // Добавляем проп className
};

type MappedTabs = {
  nameTabs: { name: string; testid?: string }[];
  contentTabs: ReactNode[];
};

export const RowTableInfo: FC<RowTableInfoProps> = ({
  tabs,
  activeTab: externalActiveTab,
  onTabChange,
  className, // Получаем className из пропсов
}) => {
  const internalActiveTabRef = useRef<number>(0);
  const [internalActiveTab, setInternalActiveTab] = useState(internalActiveTabRef.current);

  // Используем внешний activeTab если передан, иначе внутренний
  const activeTab = externalActiveTab !== undefined ? externalActiveTab : internalActiveTab;

  const dataTabs: MappedTabs = {
    nameTabs: [],
    contentTabs: [],
  };

  tabs.forEach((tab) => {
    dataTabs.nameTabs.push({ name: tab.name, testid: tab?.testid });
    dataTabs.contentTabs.push(tab.content);
  });

  const handleChangeActiveTab = (tabIndex: number) => {
    internalActiveTabRef.current = tabIndex;
    if (onTabChange) {
      onTabChange(tabIndex); // Если есть внешний обработчик
    } else {
      setInternalActiveTab(tabIndex); // Иначе используем внутреннее состояние
    }
  };

  return (
    <div className={`${style.rowTableInfo} ${className || ''}`}>
      {' '}
      {/* Добавляем className */}
      <div className={style.tabs}>
        {dataTabs.nameTabs.map(({ name, testid }, i) => (
          <button
            data-testid={testid}
            key={name}
            className={`${activeTab === i ? style.active : ''} ${style.buttonTab}`}
            onClick={() => handleChangeActiveTab(i)}>
            {name}
          </button>
        ))}
      </div>
      {dataTabs.contentTabs.map(
        (content, i) =>
          activeTab === i && (
            <div key={i} className={activeTab !== i ? style.contentHidden : style.content}>
              {Array.isArray(content)
                ? content.map((item, index) =>
                    typeof item === 'object' && item?.type === 'HEADER' ? (
                      <div key={index} className={style.headerRow}>
                        {item.label}
                      </div>
                    ) : (
                      <div key={index} className={style.rowItem}>
                        {item.label}: {item.value?.label}
                      </div>
                    ),
                  )
                : content}
            </div>
          ),
      )}
    </div>
  );
};
