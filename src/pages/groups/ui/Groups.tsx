import { useRef, useEffect } from 'react';
import { RowTableInfo } from '@entities/row_table_info';
import { PageWrapper } from '@layout/page_wrapper';
import { Aside } from '@shared/ui/aside';
import { Loader } from '@shared/ui/loader';
import { GroupTable } from '@widgets/group_table';

import { useGroups } from '../hooks/useGroups';
import style from './Group.module.scss';
import { appStore } from '@shared/model/app_store/AppStore';
import { ID } from '@shared/types/BaseQueryTypes';

const Groups = () => {
  const prevBranch = useRef<ID | null>(null);
  const { 
    selectedGroupId, 
    onCloseAside, 
    onClickRow, 
    tabs, 
    groupName, 
    isLoading 
  } = useGroups();
  const { selectedBranchState } = appStore((state) => state);

  useEffect(() => {
    if (prevBranch.current !== selectedBranchState?.id) {
      prevBranch.current = selectedBranchState?.id;
      onCloseAside(); 
    }
  }, [selectedBranchState?.id, onCloseAside]);

  return (
    <>
      <PageWrapper>
        <GroupTable handleClickRow={onClickRow} />
      </PageWrapper>

      {selectedGroupId && (
        <Loader isLoading={isLoading}>
          <Aside onClose={onCloseAside}>
            <div className={style.infoTab}>
              <div className={style.name}>
                <span>{groupName}</span>
              </div>
              <RowTableInfo tabs={tabs} />
            </div>
          </Aside>
        </Loader>
      )}
    </>
  );
};

export default Groups;
