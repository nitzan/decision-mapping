import React from 'react';

interface SliderProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
  value?: number[] | number;
  onValueChange?: (value: number[]) => void;
}

export const Slider = React.forwardRef<
  HTMLInputElement,
  SliderProps
>(({ className = '', value, onValueChange, ...props }, ref) => {
  const numValue = Array.isArray(value) ? value[0] : value || 0;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    if (onValueChange) {
      onValueChange([val]);
    }
  };

  return (
    <input
      ref={ref}
      type="range"
      value={numValue}
      onChange={handleChange}
      className={`w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary ${className}`}
      {...props}
    />
  );
});

Slider.displayName = 'Slider';
