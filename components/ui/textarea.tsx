import React from 'react';

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className = '', ...props }, ref) => (
  <textarea
    ref={ref}
    className={`px-3 py-2 rounded-md border border-gray-300 text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-vertical ${className}`}
    {...props}
  />
));

Textarea.displayName = 'Textarea';
