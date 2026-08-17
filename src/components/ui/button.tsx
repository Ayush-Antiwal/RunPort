import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-1.5 whitespace-nowrap text-xs font-medium transition-all duration-150 disabled:pointer-events-none disabled:opacity-40 cursor-pointer rounded-lg active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40',
  {
    variants: {
      variant: {
        default:
          'bg-[#16161b] border border-[#2d2d38] text-zinc-200 hover:bg-[#22222a] hover:text-white hover:border-[#3f3f4e]',
        primary:
          'bg-white text-black hover:bg-zinc-200 border border-zinc-200 font-semibold shadow-sm',
        destructive:
          'bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 hover:text-red-300',
        ghost:
          'bg-transparent border-none text-zinc-400 hover:text-white hover:bg-[#16161b]',
        success:
          'bg-zinc-100 text-zinc-900 border border-zinc-300 hover:bg-zinc-200 font-semibold shadow-sm',
      },
      size: {
        sm: 'h-7 px-3 py-1 text-xs',
        md: 'h-8 px-3.5 py-1.5 text-xs',
        lg: 'h-9 px-4 py-2 text-sm',
        icon: 'h-7 w-7 p-0',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };
