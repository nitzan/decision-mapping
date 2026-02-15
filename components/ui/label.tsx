import React from 'react';

export const Label = ({ children, className = '', ...props }: React.LabelHTMLAttributes<HTMLLabelElement> & { children?: React.ReactNode }) => (
  <label
    className={`block text-sm font-medium text-foreground ${className}`}
    {...props}
  >
    {children}
  </label>
);
