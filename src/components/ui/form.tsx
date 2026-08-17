import * as React from 'react';
import { cn } from '@/lib/utils';

const FormField = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('flex flex-col gap-1', className)} {...props} />
);

const FormLabel = ({ className, children, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) => (
  <label
    className={cn('text-[0.72rem] font-medium text-zinc-400 block tracking-tight', className)}
    {...props}
  >
    {children}
  </label>
);

const FormGrid = ({ className, cols = 2, ...props }: React.HTMLAttributes<HTMLDivElement> & { cols?: number }) => (
  <div
    className={cn('grid gap-3', cols === 2 && 'grid-cols-2', cols === 1 && 'grid-cols-1', className)}
    {...props}
  />
);

const ToggleRow = ({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: () => void;
}) => (
  <div className="flex items-center justify-between px-3 py-2.5 bg-[#1a1a1d] border border-[#26262b] rounded-[var(--radius)]">
    <div>
      <div className="text-xs font-medium text-white">{label}</div>
      {description && <div className="text-[0.7rem] text-[--text-dim] mt-0.5">{description}</div>}
    </div>
    <button
      type="button"
      onClick={onChange}
      style={{
        width: '36px',
        height: '20px',
        borderRadius: '10px',
        background: checked ? 'var(--accent-primary)' : '#2e2e36',
        border: 'none',
        cursor: 'pointer',
        position: 'relative',
        transition: 'background 0.2s',
        flexShrink: 0,
      }}
    >
      <div
        style={{
          width: '14px',
          height: '14px',
          borderRadius: '50%',
          background: '#ffffff',
          position: 'absolute',
          top: '3px',
          left: checked ? '19px' : '3px',
          transition: 'left 0.2s',
        }}
      />
    </button>
  </div>
);

export { FormField, FormLabel, FormGrid, ToggleRow };
