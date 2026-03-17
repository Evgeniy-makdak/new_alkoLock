import { useEffect, useRef } from 'react';

import { PageWrapper } from '@layout/page_wrapper';
import { appStore } from '@shared/model/app_store/AppStore';
import { MailingsTable } from '@widgets/mailings_table';

import { useMailings } from '../hooks/useMailings';

const Mailings = () => {
  const prevBranch = useRef(null);
  const {
    // onClickRow,
    // selectedMailingId,
    handleCloseAside,
    // Получаем данные модальных окон из хука useMailingsTable через useMailings
    // addModalData,
    // deleteUserModalData,
  } = useMailings();
  const { selectedBranchState } = appStore((state) => state);

  const handleResetFilters = () => {
    const event = new CustomEvent('resetFilters');
    window.dispatchEvent(event);
  };

  // const handleDeleteMailing = (id: string | number) => {
  //   // Находим рассылку по ID и открываем модальное окно удаления
  //   const mailing = { id, text: `рассылку с ID: ${id}` };
  //   // Используем правильное имя метода для открытия модального окна
  //   deleteUserModalData.handleClickDeletetUser(id, mailing.text);
  // };

  if (prevBranch.current !== selectedBranchState?.id) {
    prevBranch.current = selectedBranchState?.id;
    handleCloseAside();
  }

  useEffect(() => {
    // Очистка фильтров при изменении выбранного филиала
    handleResetFilters();
  }, [selectedBranchState?.id]);

  return (
    <PageWrapper>
      <MailingsTable onBranchChange={handleResetFilters} />
    </PageWrapper>
  );
};

export default Mailings;
