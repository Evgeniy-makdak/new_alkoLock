/* eslint-disable @typescript-eslint/no-unused-vars */
import { RowTableInfo } from '@entities/row_table_info';
import { PageWrapper } from '@layout/page_wrapper';
import { Aside } from '@shared/ui/aside';
import { Loader } from '@shared/ui/loader';
import { GroupTable } from '@widgets/group_table';

import { useGroups } from '../hooks/useGroups';
import style from './Group.module.scss';

const Groups = () => {
  const { selectedGroupId, onCloseAside, onClickRow, tabs, groupName, isLoading } = useGroups();

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
