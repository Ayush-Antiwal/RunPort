import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center gap-1 px-1.5 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wider rounded-[var(--radius)] border transition-colors',
  {
    variants: {
      variant: {
        default: 'bg-[#18181d] border-[#272730] text-[#94a3b8]',
        running: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400',
        starting: 'bg-amber-500/10 border-amber-500/30 text-amber-400',
        idle: 'bg-zinc-800/50 border-zinc-700/50 text-zinc-400',
        stopped: 'bg-zinc-800/50 border-zinc-700/50 text-zinc-400',
        failed: 'bg-red-500/10 border-red-500/30 text-red-400',
        primary: 'bg-blue-500/10 border-blue-500/30 text-blue-400',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant, ...props }, ref) => (
    <span ref={ref} className={cn(badgeVariants({ variant }), className)} {...props} />
  )
);
Badge.displayName = 'Badge';

export { Badge, badgeVariants };
