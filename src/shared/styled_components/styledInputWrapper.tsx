import { ReactNode } from 'react';

import styled from '@emotion/styled';

interface InputWrapperProps {
  children: ReactNode;
}

const Wrapper = styled.div`
  width: 100%;
  background: transparent;
  display: flex;
  align-items: center;
`;

const Content = styled.div`
  flex: 1;
`;

export const InputWrapper = ({ children }: InputWrapperProps) => (
  <Wrapper>
    <Content>{children}</Content>
  </Wrapper>
);
