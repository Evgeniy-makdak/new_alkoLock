import { useState } from 'react';

export function useCreateAttachInput() {
  const [inputValue, setInputValue] = useState('');

  const handleInputChange = (value: string) => {
    setInputValue(value); 
  };
  console.log(inputValue);

  return {
    inputValue, 
    handleInputChange,
  };
}
