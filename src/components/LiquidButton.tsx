import { motion } from 'motion/react';
import { ButtonHTMLAttributes } from 'react';
import { cn } from '../lib/utils';

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary';
};

export default function LiquidButton({ variant = 'primary', className, children, ...props }: Props) {
  const base =
    variant === 'primary'
      ? 'bg-accent text-white shadow-lg shadow-accent/20'
      : 'bg-action-light dark:bg-action-dark text-primary border border-border-color';

  return (
    <motion.button
      whileTap={{ scale: 0.95 }}
      whileHover={{ scale: 1.02 }}
      transition={{ type: 'spring', stiffness: 400, damping: 28 }}
      className={cn(
        'rounded-2xl font-medium flex items-center justify-center gap-small h-14 px-medium',
        'focus:outline-none focus-visible:ring-2 ring-accent/40',
        base,
        className
      )}
      {...props}
    >
      {children}
    </motion.button>
  );
}

