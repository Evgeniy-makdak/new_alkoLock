import style from './index.module.scss';

export const TouchLoader = () => {
  return (
    <div className={style.loaderWrapper}>
      <span className={style.loader}></span>
    </div>
  );
};
