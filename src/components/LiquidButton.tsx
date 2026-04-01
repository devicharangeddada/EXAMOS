import { motion } from 'motion/react';
import { ButtonHTMLAttributes } from 'react';
import { cn } from '../lib/utils';

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary';
};

export default function LiquidButton({ variant = 'primary', className, children, ...props }: Props) {
  const base =
    variant === 'primary'
      ? 'bg-accent text-white shadow-[0_1px_2px_rgba(0,0,0,0.05)]'
      : 'bg-[var(--surface-bg)] text-primary border border-border-color';

  return (
    <motion.button
      whileTap={{ scale: 0.97 }}
      whileHover={{ scale: 1.01 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      className={cn(
        'rounded-[12px] font-medium flex items-center justify-center gap-small min-h-[56px] py-3 px-6',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/30 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)]',
        base,
        className
      )}
      {...props}
    >
      {children}
    </motion.button>
  );
}

