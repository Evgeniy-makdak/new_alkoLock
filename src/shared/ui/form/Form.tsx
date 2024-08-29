import { ReactNode, useEffect } from 'react';

interface FormProps {
  children: ReactNode;
  formSelectors: { useSetOnValidSubmit: () => (collback: () => void) => void };
  onValidSubmit: () => void;
  className: string;
  testid?: string;
}

export const Form = ({
  children,
  formSelectors,
  onValidSubmit,
  className = '',
  testid,
}: FormProps) => {
  const setOnValidSubmit = formSelectors.useSetOnValidSubmit();

  useEffect(() => {
    setOnValidSubmit(onValidSubmit);
  }, [onValidSubmit]);

  return (
    <div className={`${className}`}>
      <form
        data-testid={testid}
        onKeyDown={(e) => {
          if (e.code === 'Enter') e.preventDefault();
        }}>
        {children}
      </form>
    </div>
  );
};
