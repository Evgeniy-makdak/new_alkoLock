import React, { useState } from 'react';

type SwitchProps = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  className?: string;
  disabled?: boolean;
};

export const Switch = ({
  checked = false,
  onChange,
  label,
  className = '',
  disabled = false,
}: SwitchProps) => {
  const [isChecked, setIsChecked] = useState(checked);

  const handleToggle = () => {
    if (disabled) return;
    const newChecked = !isChecked;
    setIsChecked(newChecked);
    onChange(newChecked);
  };

  return (
    <div
      className={`flex items-center gap-2 ${className}`}
      onClick={handleToggle}
      style={{ cursor: disabled ? 'not-allowed' : 'pointer' }}>
      <div
        className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors ${
          isChecked ? 'bg-blue-500' : 'bg-gray-300'
        } ${disabled ? 'opacity-50' : ''}`}>
        <span
          className={`inline-block w-4 h-4 transform transition-transform bg-white rounded-full ${
            isChecked ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </div>
      {label && <span className={`text-sm ${disabled ? 'opacity-50' : ''}`}>{label}</span>}
    </div>
  );
};
