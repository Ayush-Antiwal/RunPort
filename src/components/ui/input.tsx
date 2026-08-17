import * as React from 'react';
import { cn } from '@/lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  mono?: boolean;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, mono, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          'flex w-full bg-[#141418] border border-[#24242e] px-3 py-2 text-xs text-white rounded-lg',
          'placeholder:text-zinc-500 outline-none transition-all duration-150',
          'focus:border-blue-500/60 focus:ring-2 focus:ring-blue-500/20 focus:bg-[#16161c]',
          'disabled:opacity-40 disabled:pointer-events-none',
          mono && 'font-mono text-cyan-300',
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = 'Input';

export { Input };
